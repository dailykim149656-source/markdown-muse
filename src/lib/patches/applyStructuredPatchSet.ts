import * as yaml from "js-yaml";
import type { DocumentPatch, DocumentPatchSet } from "@/types/documentPatch";
import type { EditorMode } from "@/types/document";

interface ApplyPatchSetOptions {
  includePending?: boolean;
  stopOnError?: boolean;
}

export interface StructuredPatchApplicationFailure {
  patchId: string;
  message: string;
}

export interface StructuredPatchSetApplicationResult {
  appliedPatchIds: string[];
  failures: StructuredPatchApplicationFailure[];
  value: unknown;
  warnings: string[];
}

class StructuredPatchApplicationError extends Error {
  patchId: string;

  constructor(patchId: string, message: string) {
    super(message);
    this.name = "StructuredPatchApplicationError";
    this.patchId = patchId;
  }
}

type StructuredPathSegment = number | string;

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (!value || typeof value !== "object") {
    return JSON.stringify(value);
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );

  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`).join(",")}}`;
};

const computeStructuredValueHash = (value: unknown) => {
  const source = stableStringify(value);
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }

  return `h${Math.abs(hash)}`;
};

const parseStructuredContent = (content: string, mode: Extract<EditorMode, "json" | "yaml">) => {
  if (!content.trim()) {
    return {};
  }

  return mode === "json" ? JSON.parse(content) : yaml.load(content);
};

export const serializeStructuredContent = (value: unknown, mode: Extract<EditorMode, "json" | "yaml">) => {
  if (mode === "json") {
    return JSON.stringify(value, null, 2);
  }

  return yaml.dump(value, { indent: 2, lineWidth: 120, noRefs: true });
};

const parseStructuredPath = (path: string, patchId: string): StructuredPathSegment[] => {
  if (!path.startsWith("$")) {
    throw new StructuredPatchApplicationError(patchId, `Structured path "${path}" must start with "$".`);
  }

  const segments: StructuredPathSegment[] = [];
  let cursor = path.slice(1);

  while (cursor.length > 0) {
    if (cursor.startsWith(".")) {
      cursor = cursor.slice(1);
      const match = cursor.match(/^[^.[\]]+/);

      if (!match) {
        throw new StructuredPatchApplicationError(patchId, `Structured path "${path}" contains an invalid property segment.`);
      }

      segments.push(match[0]);
      cursor = cursor.slice(match[0].length);
      continue;
    }

    if (cursor.startsWith("[")) {
      const match = cursor.match(/^\[(\d+)\]/);

      if (!match) {
        throw new StructuredPatchApplicationError(patchId, `Structured path "${path}" contains an invalid array index.`);
      }

      segments.push(Number(match[1]));
      cursor = cursor.slice(match[0].length);
      continue;
    }

    throw new StructuredPatchApplicationError(patchId, `Structured path "${path}" could not be parsed.`);
  }

  return segments;
};

const getValueAtSegments = (root: unknown, segments: StructuredPathSegment[], patchId: string) => {
  let cursor = root;

  for (const segment of segments) {
    if (typeof segment === "number") {
      if (!Array.isArray(cursor) || segment < 0 || segment >= cursor.length) {
        throw new StructuredPatchApplicationError(patchId, "Structured array path could not be resolved.");
      }

      cursor = cursor[segment];
      continue;
    }

    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor) || !(segment in (cursor as Record<string, unknown>))) {
      throw new StructuredPatchApplicationError(patchId, "Structured object path could not be resolved.");
    }

    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
};

const resolveParentLocation = (root: unknown, segments: StructuredPathSegment[], patchId: string) => {
  if (segments.length === 0) {
    return {
      key: null,
      parent: null,
    };
  }

  const parent = getValueAtSegments(root, segments.slice(0, -1), patchId);
  return {
    key: segments[segments.length - 1] ?? null,
    parent,
  };
};

const assertPatchPrecondition = (patch: DocumentPatch, value: unknown) => {
  if (!patch.precondition) {
    return;
  }

  if (
    patch.precondition.expectedText !== undefined
    && stableStringify(value) !== patch.precondition.expectedText
  ) {
    throw new StructuredPatchApplicationError(
      patch.patchId,
      `Patch "${patch.patchId}" failed expectedText precondition.`,
    );
  }

  if (
    patch.precondition.expectedNodeHash !== undefined
    && computeStructuredValueHash(value) !== patch.precondition.expectedNodeHash
  ) {
    throw new StructuredPatchApplicationError(
      patch.patchId,
      `Patch "${patch.patchId}" failed expectedNodeHash precondition.`,
    );
  }
};

const getPatchValue = (patch: DocumentPatch) => {
  if (!patch.payload) {
    throw new StructuredPatchApplicationError(patch.patchId, `Patch "${patch.patchId}" is missing a payload.`);
  }

  if (patch.payload.kind === "update_attribute") {
    return structuredClone(patch.payload.value);
  }

  if (patch.payload.kind === "replace_text") {
    return patch.payload.text;
  }

  throw new StructuredPatchApplicationError(
    patch.patchId,
    `Patch "${patch.patchId}" uses unsupported payload kind "${patch.payload.kind}" for structured data.`,
  );
};

const applyStructuredPatch = (root: unknown, patch: DocumentPatch) => {
  if (patch.target.targetType !== "structured_path") {
    throw new StructuredPatchApplicationError(
      patch.patchId,
      `Patch "${patch.patchId}" must target "structured_path" for structured data application.`,
    );
  }

  const nextRoot = structuredClone(root);
  const segments = parseStructuredPath(patch.target.path, patch.patchId);
  const currentValue = segments.length === 0 ? nextRoot : getValueAtSegments(nextRoot, segments, patch.patchId);
  assertPatchPrecondition(patch, currentValue);

  if (patch.operation === "replace_node" || patch.operation === "update_attribute") {
    const nextValue = getPatchValue(patch);

    if (segments.length === 0) {
      return nextValue;
    }

    const { parent, key } = resolveParentLocation(nextRoot, segments, patch.patchId);

    if (Array.isArray(parent) && typeof key === "number") {
      if (key < 0 || key > parent.length) {
        throw new StructuredPatchApplicationError(patch.patchId, "Structured array index is out of range.");
      }

      parent[key] = nextValue;
      return nextRoot;
    }

    if (parent && typeof parent === "object" && !Array.isArray(parent) && typeof key === "string") {
      (parent as Record<string, unknown>)[key] = nextValue;
      return nextRoot;
    }

    throw new StructuredPatchApplicationError(patch.patchId, "Structured target path could not be updated.");
  }

  if (patch.operation === "delete_node") {
    if (segments.length === 0) {
      throw new StructuredPatchApplicationError(patch.patchId, "Deleting the structured root is not supported.");
    }

    const { parent, key } = resolveParentLocation(nextRoot, segments, patch.patchId);

    if (Array.isArray(parent) && typeof key === "number") {
      if (key < 0 || key >= parent.length) {
        throw new StructuredPatchApplicationError(patch.patchId, "Structured array index is out of range.");
      }

      parent.splice(key, 1);
      return nextRoot;
    }

    if (parent && typeof parent === "object" && !Array.isArray(parent) && typeof key === "string") {
      delete (parent as Record<string, unknown>)[key];
      return nextRoot;
    }

    throw new StructuredPatchApplicationError(patch.patchId, "Structured target path could not be deleted.");
  }

  if (patch.operation === "insert_before" || patch.operation === "insert_after") {
    const { parent, key } = resolveParentLocation(nextRoot, segments, patch.patchId);

    if (!Array.isArray(parent) || typeof key !== "number") {
      throw new StructuredPatchApplicationError(
        patch.patchId,
        "Structured insert operations require an array item target.",
      );
    }

    if (key < 0 || key >= parent.length) {
      throw new StructuredPatchApplicationError(patch.patchId, "Structured array index is out of range.");
    }

    const nextValue = getPatchValue(patch);
    const insertIndex = patch.operation === "insert_before" ? key : key + 1;
    parent.splice(insertIndex, 0, nextValue);
    return nextRoot;
  }

  throw new StructuredPatchApplicationError(
    patch.patchId,
    `Patch "${patch.patchId}" uses unsupported structured operation "${patch.operation}".`,
  );
};

export const applyStructuredPatchSet = (
  value: unknown,
  patchSet: DocumentPatchSet,
  options: ApplyPatchSetOptions = {},
): StructuredPatchSetApplicationResult => {
  const includePending = options.includePending ?? false;
  const applicableStatuses = includePending ? new Set(["pending", "accepted", "edited"]) : new Set(["accepted", "edited"]);
  const applicablePatches = patchSet.patches.filter((patch) => applicableStatuses.has(patch.status));
  const failures: StructuredPatchApplicationFailure[] = [];
  const warnings: string[] = [];
  const appliedPatchIds: string[] = [];
  let currentValue = structuredClone(value);

  for (const patch of applicablePatches) {
    try {
      currentValue = applyStructuredPatch(currentValue, patch);
      appliedPatchIds.push(patch.patchId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown structured patch application error.";
      failures.push({ patchId: patch.patchId, message });

      if (options.stopOnError) {
        break;
      }
    }
  }

  return {
    appliedPatchIds,
    failures,
    value: currentValue,
    warnings,
  };
};

export const parseStructuredPatchDocument = (
  content: string,
  mode: Extract<EditorMode, "json" | "yaml">,
) => parseStructuredContent(content, mode);
