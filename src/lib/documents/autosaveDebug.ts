import type { AutoSaveData } from "@/types/document";
import type { DocsyRuntimeInfo, RuntimeNavigationType } from "@/lib/runtime/buildInfo";

const AUTOSAVE_DEBUG_QUERY_PARAM = "debugAutosave";
const AUTOSAVE_DEBUG_STORAGE_KEY = "docsy-autosave-debug-events";
const AUTOSAVE_LAST_SAVE_MARKER_KEY = "docsy-autosave-last-save-marker";
const AUTOSAVE_RESTORE_SELECTION_KEY = "docsy-autosave-restore-selection";
const AUTOSAVE_UNLOAD_SNAPSHOT_KEY = "docsy-autosave-unload-snapshot";
const RUNTIME_BOOT_STATE_KEY = "docsy-runtime-boot";
const MAX_DEBUG_EVENTS = 80;

export type AutosaveSnapshotSource = "local" | "none" | "unload" | "v3";

export type AutosaveDebugEventName =
  | "app_boot"
  | "editor_boot"
  | "autosave_tick"
  | "autosave_saved"
  | "autosave_error"
  | "pagehide_flush"
  | "beforeunload_flush"
  | "pageshow"
  | "visibility_hidden"
  | "visibility_visible"
  | "hydrate_start"
  | "hydrate_result"
  | "restore_source_selected"
  | "seed_apply"
  | "unexpected_boot";

interface AutosaveDebugEvent {
  details?: Record<string, unknown>;
  event: AutosaveDebugEventName;
  recordedAt: number;
}

export interface AutosaveLastSaveMarker {
  activeDocId: string | null;
  contentHash: string;
  docCount: number;
  isMeaningful: boolean;
  lastSaved: number | null;
  reason: string;
}

export interface AutosaveRestoreSelection {
  contentHash: string;
  docCount: number;
  isMeaningful: boolean;
  lastSaved: number | null;
  source: AutosaveSnapshotSource;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isAutoSaveData = (candidate: unknown): candidate is AutoSaveData =>
  isRecord(candidate)
  && candidate.version === 2
  && typeof candidate.activeDocId === "string"
  && typeof candidate.lastSaved === "number"
  && Array.isArray(candidate.documents);

const coerceEvent = (candidate: unknown): AutosaveDebugEvent | null => {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }

  const event = "event" in candidate ? candidate.event : null;
  const recordedAt = "recordedAt" in candidate ? candidate.recordedAt : null;
  const details = "details" in candidate ? candidate.details : undefined;

  if (typeof event !== "string" || typeof recordedAt !== "number") {
    return null;
  }

  return {
    details: details && typeof details === "object" && !Array.isArray(details)
      ? details as Record<string, unknown>
      : undefined,
    event: event as AutosaveDebugEventName,
    recordedAt,
  };
};

const coerceRuntimeBootInfo = (candidate: unknown): DocsyRuntimeInfo | null => {
  if (!isRecord(candidate)) {
    return null;
  }

  if (
    typeof candidate.bootId !== "string"
    || typeof candidate.bootedAt !== "number"
    || typeof candidate.frontendBuildId !== "string"
    || typeof candidate.href !== "string"
    || typeof candidate.navigationType !== "string"
    || typeof candidate.referrer !== "string"
  ) {
    return null;
  }

  return {
    bootId: candidate.bootId as string,
    bootedAt: candidate.bootedAt as number,
    frontendBuildId: candidate.frontendBuildId as string,
    hasPreviousBootInTab: typeof candidate.hasPreviousBootInTab === "boolean" ? candidate.hasPreviousBootInTab : undefined,
    href: candidate.href as string,
    initialVisibilityState: typeof candidate.initialVisibilityState === "string"
      ? candidate.initialVisibilityState as DocsyRuntimeInfo["initialVisibilityState"]
      : undefined,
    navigationType: candidate.navigationType as RuntimeNavigationType,
    pageshowPersisted: typeof candidate.pageshowPersisted === "boolean" || candidate.pageshowPersisted === null
      ? candidate.pageshowPersisted as boolean | null
      : undefined,
    previousFrontendBuildId: typeof candidate.previousFrontendBuildId === "string" || candidate.previousFrontendBuildId === null
      ? candidate.previousFrontendBuildId as string | null
      : undefined,
    referrer: candidate.referrer as string,
  };
};

const coerceLastSaveMarker = (candidate: unknown): AutosaveLastSaveMarker | null => {
  if (!isRecord(candidate)) {
    return null;
  }

  if (
    typeof candidate.contentHash !== "string"
    || typeof candidate.docCount !== "number"
    || typeof candidate.isMeaningful !== "boolean"
    || (typeof candidate.lastSaved !== "number" && candidate.lastSaved !== null)
    || typeof candidate.reason !== "string"
  ) {
    return null;
  }

  return {
    activeDocId: typeof candidate.activeDocId === "string" ? candidate.activeDocId : null,
    contentHash: candidate.contentHash as string,
    docCount: candidate.docCount as number,
    isMeaningful: candidate.isMeaningful as boolean,
    lastSaved: candidate.lastSaved as number | null,
    reason: candidate.reason as string,
  };
};

const coerceRestoreSelection = (candidate: unknown): AutosaveRestoreSelection | null => {
  if (!isRecord(candidate)) {
    return null;
  }

  if (
    typeof candidate.contentHash !== "string"
    || typeof candidate.docCount !== "number"
    || typeof candidate.isMeaningful !== "boolean"
    || (typeof candidate.lastSaved !== "number" && candidate.lastSaved !== null)
    || typeof candidate.source !== "string"
  ) {
    return null;
  }

  return {
    contentHash: candidate.contentHash as string,
    docCount: candidate.docCount as number,
    isMeaningful: candidate.isMeaningful as boolean,
    lastSaved: candidate.lastSaved as number | null,
    source: candidate.source as AutosaveSnapshotSource,
  };
};

const sanitizeDetails = (details?: Record<string, unknown>) => {
  if (!details) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(details)) as Record<string, unknown>;
  } catch {
    return {
      note: "details could not be serialized",
    };
  }
};

const readSessionValue = <T>(key: string, coerce: (candidate: unknown) => T | null) => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(key);

    if (!raw) {
      return null;
    }

    return coerce(JSON.parse(raw));
  } catch {
    return null;
  }
};

const writeSessionValue = (key: string, value: unknown) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best effort session persistence
  }
};

const clearSessionValue = (key: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // best effort session cleanup
  }
};

const readEvents = () => {
  if (typeof window === "undefined") {
    return [] as AutosaveDebugEvent[];
  }

  try {
    const raw = window.sessionStorage.getItem(AUTOSAVE_DEBUG_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    return (JSON.parse(raw) as unknown[])
      .map(coerceEvent)
      .filter((entry): entry is AutosaveDebugEvent => Boolean(entry));
  } catch {
    return [];
  }
};

const hashString = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
};

const isMeaningfulSnapshot = (data: AutoSaveData) =>
  !(data.documents.length === 1
    && data.documents[0]?.name === "Untitled"
    && data.documents[0]?.content.trim().length === 0);

export const getAutosaveSnapshotHash = (data: AutoSaveData) =>
  hashString(JSON.stringify({
    activeDocId: data.activeDocId,
    documents: data.documents.map((document) => ({
      content: document.content,
      id: document.id,
      mode: document.mode,
      name: document.name,
      sourceSnapshots: document.sourceSnapshots || {},
    })),
    lastSaved: data.lastSaved,
  }));

const getNavigationType = (): RuntimeNavigationType => {
  if (typeof window === "undefined" || typeof window.performance === "undefined") {
    return "unknown";
  }

  try {
    const navigationEntry = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

    if (navigationEntry?.type === "navigate" || navigationEntry?.type === "reload" || navigationEntry?.type === "back_forward" || navigationEntry?.type === "prerender") {
      return navigationEntry.type;
    }
  } catch {
    // fall through to unknown
  }

  return "unknown";
};

const createBootId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `boot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
};

export const isAutosaveDebugEnabled = () => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return new URLSearchParams(window.location.search).get(AUTOSAVE_DEBUG_QUERY_PARAM) === "1";
  } catch {
    return false;
  }
};

export const recordAutosaveDebugEvent = (
  event: AutosaveDebugEventName,
  details?: Record<string, unknown>,
) => {
  if (!isAutosaveDebugEnabled() || typeof window === "undefined") {
    return;
  }

  const entry: AutosaveDebugEvent = {
    details: sanitizeDetails(details),
    event,
    recordedAt: Date.now(),
  };

  try {
    const nextEvents = [...readEvents(), entry].slice(-MAX_DEBUG_EVENTS);
    window.sessionStorage.setItem(AUTOSAVE_DEBUG_STORAGE_KEY, JSON.stringify(nextEvents));
  } catch {
    // best effort debug logging
  }

  try {
    console.info(`[DocsyAutosaveDebug] ${event}`, entry.details || {});
  } catch {
    // best effort debug logging
  }
};

export const readRuntimeBootInfo = () =>
  readSessionValue(RUNTIME_BOOT_STATE_KEY, coerceRuntimeBootInfo);

export const initializeAutosaveRuntime = (frontendBuildId: string): DocsyRuntimeInfo => {
  const previousBoot = readRuntimeBootInfo();
  const bootInfo: DocsyRuntimeInfo = {
    bootId: createBootId(),
    bootedAt: Date.now(),
    frontendBuildId,
    hasPreviousBootInTab: Boolean(previousBoot),
    href: typeof window !== "undefined" ? window.location.href : "",
    initialVisibilityState: typeof document !== "undefined" ? document.visibilityState : "unknown",
    navigationType: getNavigationType(),
    pageshowPersisted: null,
    previousFrontendBuildId: previousBoot?.frontendBuildId ?? null,
    referrer: typeof document !== "undefined" ? document.referrer : "",
  };

  clearSessionValue(AUTOSAVE_RESTORE_SELECTION_KEY);
  writeSessionValue(RUNTIME_BOOT_STATE_KEY, bootInfo);

  recordAutosaveDebugEvent("app_boot", {
    bootId: bootInfo.bootId,
    buildChanged: previousBoot?.frontendBuildId !== undefined && previousBoot.frontendBuildId !== frontendBuildId,
    frontendBuildId,
    hasPreviousBootInTab: bootInfo.hasPreviousBootInTab,
    href: bootInfo.href,
    navigationType: bootInfo.navigationType,
    previousFrontendBuildId: previousBoot?.frontendBuildId ?? null,
    referrer: bootInfo.referrer,
    visibilityState: bootInfo.initialVisibilityState,
  });

  if (previousBoot) {
    recordAutosaveDebugEvent("unexpected_boot", {
      currentBootId: bootInfo.bootId,
      currentFrontendBuildId: frontendBuildId,
      currentNavigationType: bootInfo.navigationType,
      previousBootId: previousBoot.bootId,
      previousFrontendBuildId: previousBoot.frontendBuildId,
    });
  }

  if (typeof window !== "undefined") {
    window.addEventListener("pageshow", (event) => {
      const nextBootInfo = {
        ...(window.__docsyRuntime || bootInfo),
        pageshowPersisted: event.persisted,
      } satisfies DocsyRuntimeInfo;
      window.__docsyRuntime = nextBootInfo;
      writeSessionValue(RUNTIME_BOOT_STATE_KEY, nextBootInfo);
      recordAutosaveDebugEvent("pageshow", {
        bootId: nextBootInfo.bootId,
        persisted: event.persisted,
      });
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      recordAutosaveDebugEvent(document.visibilityState === "hidden" ? "visibility_hidden" : "visibility_visible", {
        bootId: (window.__docsyRuntime || bootInfo).bootId,
        visibilityState: document.visibilityState,
      });
    });
  }

  return bootInfo;
};

export const readLastSuccessfulAutosaveMarker = () =>
  readSessionValue(AUTOSAVE_LAST_SAVE_MARKER_KEY, coerceLastSaveMarker);

export const writeLastSuccessfulAutosaveMarker = (
  data: AutoSaveData,
  options?: {
    reason?: string;
  },
) => {
  const marker: AutosaveLastSaveMarker = {
    activeDocId: data.activeDocId || null,
    contentHash: getAutosaveSnapshotHash(data),
    docCount: data.documents.length,
    isMeaningful: isMeaningfulSnapshot(data),
    lastSaved: data.lastSaved ?? null,
    reason: options?.reason || "manual",
  };

  writeSessionValue(AUTOSAVE_LAST_SAVE_MARKER_KEY, marker);
  return marker;
};

export const readUnloadRecoverySnapshot = () =>
  readSessionValue(AUTOSAVE_UNLOAD_SNAPSHOT_KEY, (candidate) =>
    isAutoSaveData(candidate) ? candidate : null);

export const writeUnloadRecoverySnapshot = (data: AutoSaveData) => {
  writeSessionValue(AUTOSAVE_UNLOAD_SNAPSHOT_KEY, data);
};

export const readRestoreSelection = () =>
  readSessionValue(AUTOSAVE_RESTORE_SELECTION_KEY, coerceRestoreSelection);

export const writeRestoreSelection = (selection: AutosaveRestoreSelection) => {
  writeSessionValue(AUTOSAVE_RESTORE_SELECTION_KEY, selection);
};
