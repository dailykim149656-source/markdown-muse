import {
  buildDocumentDataFromDocsyFile,
  buildDocsyFileFromDocumentData,
  parseDocsyFile,
  serializeDocsyFile,
} from "@/lib/docsy/fileFormat";
import { DOC_SHARE_HASH_PREFIX, DOC_SHARE_MAX_PAYLOAD_LENGTH } from "@/lib/share/shareConstants";
import type { CreateDocumentOptions, DocumentData } from "@/types/document";

export { DOC_SHARE_HASH_PREFIX, DOC_SHARE_MAX_PAYLOAD_LENGTH } from "@/lib/share/shareConstants";

const encodeBase64Url = (input: string) => {
  const bytes = new TextEncoder().encode(input);

  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const decodeBase64Url = (payload: string) => {
  const normalized = payload
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");

  if (typeof Buffer !== "undefined") {
    return new TextDecoder().decode(Buffer.from(normalized, "base64"));
  }

  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new TextDecoder().decode(bytes);
};

export const buildDocSharePayload = (document: DocumentData) => {
  const file = buildDocsyFileFromDocumentData(document);
  const sourceSnapshots = {
    ...(file.sourceSnapshots || {}),
    [document.mode]: document.content,
  };

  return encodeBase64Url(serializeDocsyFile({
    ...file,
    sourceSnapshots,
  }));
};

export const buildDocShareHash = (document: DocumentData) => {
  const payload = buildDocSharePayload(document);

  if (payload.length > DOC_SHARE_MAX_PAYLOAD_LENGTH) {
    return null;
  }

  return `${DOC_SHARE_HASH_PREFIX}${payload}`;
};

export const buildDocShareLink = (document: DocumentData, locationHref: string) => {
  const hash = buildDocShareHash(document);

  if (!hash) {
    return null;
  }

  const url = new URL(locationHref);
  url.hash = hash;
  return url.toString();
};

export const parseSharedDocumentFromHash = (hash: string): CreateDocumentOptions | null => {
  if (!hash.startsWith(DOC_SHARE_HASH_PREFIX)) {
    return null;
  }

  const payload = hash.slice(DOC_SHARE_HASH_PREFIX.length);
  const decoded = decodeBase64Url(payload);
  const parsed = parseDocsyFile(decoded);
  const document = buildDocumentDataFromDocsyFile(parsed);
  const primaryContent = parsed.sourceSnapshots?.[document.mode] || document.content;
  const name = document.name?.trim() ? `${document.name} (Shared)` : "Shared document";

  return {
    ...document,
    content: primaryContent,
    id: crypto.randomUUID(),
    metadata: {
      ...(document.metadata || {}),
      tags: Array.from(new Set([...(document.metadata?.tags || []), "shared"])),
    },
    name,
  };
};
