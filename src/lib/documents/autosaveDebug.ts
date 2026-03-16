const AUTOSAVE_DEBUG_QUERY_PARAM = "debugAutosave";
const AUTOSAVE_DEBUG_STORAGE_KEY = "docsy-autosave-debug-events";
const MAX_DEBUG_EVENTS = 80;

export type AutosaveDebugEventName =
  | "editor_boot"
  | "autosave_tick"
  | "autosave_saved"
  | "autosave_error"
  | "pagehide_flush"
  | "beforeunload_flush"
  | "hydrate_start"
  | "hydrate_result"
  | "seed_apply";

interface AutosaveDebugEvent {
  details?: Record<string, unknown>;
  event: AutosaveDebugEventName;
  recordedAt: number;
}

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

