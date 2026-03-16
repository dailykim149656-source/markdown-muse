import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { exportTexPdf, getTexHealth, getTexJob, previewTex, validateTex } from "@/lib/ai/texClient";
import { useI18n } from "@/i18n/useI18n";
import type { EditorMode } from "@/types/document";
import type {
  TexDiagnostic,
  TexHealthResponse,
  TexJobStatusResponse,
  TexSourceType,
  TexValidateResponse,
} from "@/types/tex";

type TexValidationStatus = "disabled" | "idle" | "running" | "success" | "error";

interface UseTexValidationOptions {
  documentName: string;
  latexSource: string;
  mode: EditorMode;
  onPdfExported?: () => void;
}

interface TexValidationState {
  compileMs: number | null;
  diagnostics: TexDiagnostic[];
  health: TexHealthResponse | null;
  lastValidatedAt: number | null;
  logSummary: string;
  previewExpiresAt: number | null;
  previewUrl: string | null;
  status: TexValidationStatus;
}

const DEBOUNCE_MS = 1500;
const PREVIEW_IDLE_MS = 5000;
const JOB_POLL_INTERVAL_MS = 2000;

const createInitialState = (): TexValidationState => ({
  compileMs: null,
  diagnostics: [],
  health: null,
  lastValidatedAt: null,
  logSummary: "",
  previewExpiresAt: null,
  previewUrl: null,
  status: "idle",
});

const hashLatexSource = async (latexSource: string) => {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(latexSource));
    return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  let hash = 0;
  for (let index = 0; index < latexSource.length; index += 1) {
    hash = ((hash << 5) - hash) + latexSource.charCodeAt(index);
    hash |= 0;
  }

  return `fallback-${hash}`;
};

const waitFor = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, ms);

    const handleAbort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException("Aborted", "AbortError"));
    };

    if (signal.aborted) {
      handleAbort();
      return;
    }

    signal.addEventListener("abort", handleAbort, { once: true });
  });

export const useTexValidation = ({
  documentName,
  latexSource,
  mode,
  onPdfExported,
}: UseTexValidationOptions) => {
  const { t } = useI18n();
  const [state, setState] = useState<TexValidationState>(createInitialState);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const validationAbortControllerRef = useRef<AbortController | null>(null);
  const previewAbortControllerRef = useRef<AbortController | null>(null);
  const exportAbortControllerRef = useRef<AbortController | null>(null);
  const lastValidatedHashRef = useRef<string | null>(null);
  const lastPreviewedHashRef = useRef<string | null>(null);
  const lastPreviewExpiresAtRef = useRef<number | null>(null);
  const healthLoadedRef = useRef(false);
  const healthRef = useRef<TexHealthResponse | null>(null);
  const validationEnabled = mode === "markdown" || mode === "latex" || mode === "html";
  const sourceType = useMemo<TexSourceType>(
    () => (mode === "latex" ? "raw-latex" : "generated-latex"),
    [mode],
  );

  const applyValidationResult = useCallback((result: TexValidateResponse) => {
    setState((current) => ({
      ...current,
      compileMs: result.compileMs,
      diagnostics: result.diagnostics,
      lastValidatedAt: Date.now(),
      logSummary: result.logSummary,
      status: result.ok ? "success" : "error",
    }));
  }, []);

  const applyTexJobResult = useCallback((result: TexJobStatusResponse) => {
    if (result.status === "succeeded" && result.expiresAt) {
      lastPreviewExpiresAtRef.current = result.expiresAt;
    }

    setState((current) => {
      const clearedExpiredPreview = result.status === "succeeded"
        && !result.previewUrl
        && (current.previewExpiresAt || 0) <= Date.now();

      return {
        ...current,
        ...(clearedExpiredPreview ? {
          previewExpiresAt: null,
          previewUrl: null,
        } : {}),
        compileMs: typeof result.compileMs === "number" ? result.compileMs : current.compileMs,
        diagnostics: result.diagnostics || current.diagnostics,
        lastValidatedAt: Date.now(),
        logSummary: result.error || result.logSummary || current.logSummary,
        previewExpiresAt: result.status === "succeeded" ? result.expiresAt || current.previewExpiresAt : current.previewExpiresAt,
        previewUrl: result.status === "succeeded" && result.previewUrl ? result.previewUrl : current.previewUrl,
        status: result.status === "failed"
          ? "error"
          : result.status === "succeeded"
            ? "success"
            : current.status,
      };
    });
  }, []);

  const pollTexJob = useCallback(async (jobId: string, signal: AbortSignal) => {
    while (true) {
      if (signal.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const job = await getTexJob(jobId, { signal });

      if (job.status === "queued" || job.status === "running") {
        await waitFor(JOB_POLL_INTERVAL_MS, signal);
        continue;
      }

      return job;
    }
  }, []);

  const ensureTexHealth = useCallback(async () => {
    if (healthLoadedRef.current) {
      return healthRef.current;
    }

    try {
      const health = await getTexHealth();
      healthLoadedRef.current = true;
      healthRef.current = health;
      setState((current) => ({
        ...current,
        health,
        status: !validationEnabled
          ? "disabled"
          : current.status,
      }));
      return health;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reach the XeLaTeX validation service.";
      healthRef.current = {
        configured: false,
        engine: "xelatex",
        ok: false,
      };
      setState((current) => ({
        ...current,
        compileMs: null,
        diagnostics: [],
        health: healthRef.current,
        logSummary: message,
        status: "error",
      }));
      return healthRef.current;
    }
  }, [validationEnabled]);

  const runValidation = useCallback(async (reason: "auto" | "manual") => {
    if (!validationEnabled || !latexSource.trim()) {
      setState((current) => ({
        ...current,
        compileMs: null,
        diagnostics: [],
        lastValidatedAt: null,
        logSummary: "",
        status: validationEnabled ? "idle" : "disabled",
      }));
      return;
    }

    const health = await ensureTexHealth();

    if (!health?.ok) {
      if (reason === "manual") {
        toast.error(t("texValidation.unavailable"));
      }
      return;
    }

    const contentHash = await hashLatexSource(latexSource);
    if (reason === "auto" && lastValidatedHashRef.current === contentHash) {
      return;
    }

    validationAbortControllerRef.current?.abort();
    const nextAbortController = new AbortController();
    validationAbortControllerRef.current = nextAbortController;

    setState((current) => ({
      ...current,
      status: "running",
    }));

    try {
      const result = await validateTex({
        contentHash,
        documentName,
        latex: latexSource,
        sourceType,
      }, {
        signal: nextAbortController.signal,
      });

      if (nextAbortController.signal.aborted) {
        return;
      }

      lastValidatedHashRef.current = contentHash;
      applyValidationResult(result);
    } catch (error) {
      if (nextAbortController.signal.aborted) {
        return;
      }

      const message = error instanceof Error ? error.message : t("texValidation.validateFailed");
      setState((current) => ({
        ...current,
        compileMs: null,
        diagnostics: [],
        lastValidatedAt: Date.now(),
        logSummary: message,
        status: "error",
      }));

      if (reason === "manual") {
        toast.error(message);
      }
    }
  }, [applyValidationResult, documentName, ensureTexHealth, latexSource, sourceType, t, validationEnabled]);

  const runPreview = useCallback(async () => {
    if (!validationEnabled || !latexSource.trim()) {
      return;
    }

    const health = await ensureTexHealth();

    if (!health?.ok) {
      return;
    }

    const contentHash = await hashLatexSource(latexSource);
    const previewStillFresh = lastPreviewExpiresAtRef.current !== null
      && lastPreviewExpiresAtRef.current > Date.now() + 60_000;

    if (lastPreviewedHashRef.current === contentHash && previewStillFresh) {
      return;
    }

    previewAbortControllerRef.current?.abort();
    const nextAbortController = new AbortController();
    previewAbortControllerRef.current = nextAbortController;

    try {
      const queuedJob = await previewTex({
        contentHash,
        documentName,
        latex: latexSource,
        sourceType,
      }, {
        signal: nextAbortController.signal,
      });

      if (nextAbortController.signal.aborted) {
        return;
      }

      lastPreviewedHashRef.current = contentHash;
      const jobResult = await pollTexJob(queuedJob.jobId, nextAbortController.signal);

      if (nextAbortController.signal.aborted) {
        return;
      }

      applyTexJobResult(jobResult);
    } catch {
      if (nextAbortController.signal.aborted) {
        return;
      }
    }
  }, [applyTexJobResult, documentName, ensureTexHealth, latexSource, pollTexJob, sourceType, validationEnabled]);

  useEffect(() => {
    if (!validationEnabled) {
      setState((current) => ({
        ...createInitialState(),
        health: current.health,
        status: "disabled",
      }));
      return;
    }

    const timeout = window.setTimeout(() => {
      void runValidation("auto");
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      validationAbortControllerRef.current?.abort();
    };
  }, [latexSource, runValidation, validationEnabled]);

  useEffect(() => {
    if (!validationEnabled || !latexSource.trim()) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void runPreview();
    }, PREVIEW_IDLE_MS);

    return () => {
      window.clearTimeout(timeout);
      previewAbortControllerRef.current?.abort();
    };
  }, [latexSource, runPreview, validationEnabled]);

  useEffect(() => {
    healthLoadedRef.current = false;
    healthRef.current = null;
    lastValidatedHashRef.current = null;
    lastPreviewedHashRef.current = null;
    lastPreviewExpiresAtRef.current = null;
    exportAbortControllerRef.current?.abort();
    setState((current) => ({
      ...createInitialState(),
      health: current.health,
      status: validationEnabled ? "idle" : "disabled",
    }));
  }, [documentName, sourceType, validationEnabled]);

  useEffect(() => () => {
    validationAbortControllerRef.current?.abort();
    previewAbortControllerRef.current?.abort();
    exportAbortControllerRef.current?.abort();
  }, []);

  const downloadCompiledPdf = useCallback(async () => {
    if (!validationEnabled || !latexSource.trim()) {
      return;
    }

    const health = await ensureTexHealth();
    if (!health?.ok) {
      toast.error(t("texValidation.unavailable"));
      return;
    }

    setIsExportingPdf(true);
    exportAbortControllerRef.current?.abort();
    const nextAbortController = new AbortController();
    exportAbortControllerRef.current = nextAbortController;

    try {
      const queuedJob = await exportTexPdf({
        documentName,
        latex: latexSource,
        sourceType,
      }, {
        signal: nextAbortController.signal,
      });
      const jobResult = await pollTexJob(queuedJob.jobId, nextAbortController.signal);

      if (nextAbortController.signal.aborted) {
        return;
      }

      applyTexJobResult(jobResult);

      if (jobResult.status !== "succeeded" || !jobResult.downloadUrl) {
        throw new Error(jobResult.error || t("texValidation.exportFailed"));
      }

      const anchor = document.createElement("a");
      anchor.href = jobResult.downloadUrl;
      anchor.download = `${documentName || "Untitled"}.pdf`;
      anchor.click();
      onPdfExported?.();
      toast.success(t("texValidation.pdfReady"));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      const message = error instanceof Error ? error.message : t("texValidation.exportFailed");
      toast.error(message);
    } finally {
      setIsExportingPdf(false);
    }
  }, [applyTexJobResult, documentName, ensureTexHealth, latexSource, onPdfExported, pollTexJob, sourceType, t, validationEnabled]);

  return {
    ...state,
    isExportingPdf,
    runValidation: () => runValidation("manual"),
    sourceType,
    validationEnabled,
    downloadCompiledPdf,
  };
};
