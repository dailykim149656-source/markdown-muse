import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { exportTexPdf, getTexHealth, previewTex } from "@/lib/ai/texClient";
import { useI18n } from "@/i18n/useI18n";
import type { EditorMode } from "@/types/document";
import type {
  TexDiagnostic,
  TexHealthResponse,
  TexPreviewResponse,
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
  previewUrl: string | null;
  status: TexValidationStatus;
}

const DEBOUNCE_MS = 1500;

const createInitialState = (): TexValidationState => ({
  compileMs: null,
  diagnostics: [],
  health: null,
  lastValidatedAt: null,
  logSummary: "",
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

export const useTexValidation = ({
  documentName,
  latexSource,
  mode,
  onPdfExported,
}: UseTexValidationOptions) => {
  const { t } = useI18n();
  const [state, setState] = useState<TexValidationState>(createInitialState);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastValidatedHashRef = useRef<string | null>(null);
  const healthLoadedRef = useRef(false);
  const previewObjectUrlRef = useRef<string | null>(null);
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

  const applyPreviewResult = useCallback((result: TexPreviewResponse) => {
    if (result.ok && result.pdfBase64) {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }

      const binary = Uint8Array.from(atob(result.pdfBase64), (char) => char.charCodeAt(0));
      previewObjectUrlRef.current = URL.createObjectURL(new Blob([binary], { type: "application/pdf" }));
    }

    setState((current) => ({
      ...current,
      compileMs: result.compileMs,
      diagnostics: result.diagnostics,
      lastValidatedAt: Date.now(),
      logSummary: result.logSummary,
      previewUrl: result.ok && previewObjectUrlRef.current ? previewObjectUrlRef.current : current.previewUrl,
      status: result.ok ? "success" : "error",
    }));
  }, []);

  const ensureTexHealth = useCallback(async () => {
    if (healthLoadedRef.current) {
      return state.health;
    }

    try {
      const health = await getTexHealth();
      healthLoadedRef.current = true;
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
      setState((current) => ({
        ...current,
        compileMs: null,
        diagnostics: [],
        health: {
          configured: false,
          engine: "xelatex",
          ok: false,
        },
        logSummary: message,
        status: "error",
      }));
      return {
        configured: false,
        engine: "xelatex" as const,
        ok: false,
      };
    }
  }, [state.health, validationEnabled]);

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

    abortControllerRef.current?.abort();
    const nextAbortController = new AbortController();
    abortControllerRef.current = nextAbortController;

    setState((current) => ({
      ...current,
      status: "running",
    }));

    try {
      const result = await previewTex({
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
      applyPreviewResult(result);
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
  }, [applyPreviewResult, documentName, ensureTexHealth, latexSource, sourceType, t, validationEnabled]);

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
      abortControllerRef.current?.abort();
    };
  }, [latexSource, runValidation, validationEnabled]);

  useEffect(() => {
    healthLoadedRef.current = false;
    lastValidatedHashRef.current = null;
    setState((current) => ({
      ...createInitialState(),
      health: current.health,
      status: validationEnabled ? "idle" : "disabled",
    }));
  }, [documentName, sourceType, validationEnabled]);

  useEffect(() => () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
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

    try {
      const pdfBlob = await exportTexPdf({
        documentName,
        latex: latexSource,
        sourceType,
      });

      const url = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${documentName || "Untitled"}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      onPdfExported?.();
      toast.success(t("texValidation.pdfReady"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("texValidation.exportFailed");
      toast.error(message);
    } finally {
      setIsExportingPdf(false);
    }
  }, [documentName, ensureTexHealth, latexSource, onPdfExported, sourceType, t, validationEnabled]);

  return {
    ...state,
    isExportingPdf,
    runValidation: () => runValidation("manual"),
    sourceType,
    validationEnabled,
    downloadCompiledPdf,
  };
};
