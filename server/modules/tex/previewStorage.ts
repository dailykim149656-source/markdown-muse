import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { Storage } from "@google-cloud/storage";
import { HttpError } from "../http/http";

const DEFAULT_PREVIEW_TTL_SECONDS = 15 * 60;
const DEFAULT_LOCAL_PREVIEW_CAP = 24;
const DEFAULT_OBJECT_PREFIX = "tex-preview";
const GCS_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const GCS_CLEANUP_SCAN_LIMIT = 50;

interface StoredLocalPreview {
  buffer: Buffer;
  createdAt: number;
  expiresAt: number;
}

export interface StoredTexPreview {
  previewExpiresAt: number;
  previewStorageBackend: "gcs" | "local" | "unavailable";
  previewUrl?: string;
}

const localPreviewStore = new Map<string, StoredLocalPreview>();
let cachedStorageClient: Storage | null = null;
let lastGcsCleanupStartedAt = 0;

const getPreviewBucketName = () => process.env.TEX_PREVIEW_BUCKET?.trim() || "";
const getPreviewPublicBaseUrl = () => process.env.TEX_PREVIEW_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") || "";
const getPreviewObjectPrefix = () => process.env.TEX_PREVIEW_OBJECT_PREFIX?.trim().replace(/^\/+|\/+$/g, "") || DEFAULT_OBJECT_PREFIX;
const getPreviewTtlSeconds = () => {
  const configured = Number(process.env.TEX_PREVIEW_URL_TTL_SECONDS || DEFAULT_PREVIEW_TTL_SECONDS);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : DEFAULT_PREVIEW_TTL_SECONDS;
};

const getPreviewTtlMs = () => getPreviewTtlSeconds() * 1000;

const isLoopbackHost = (host: string) => {
  const normalized = host.trim().toLowerCase();
  return normalized === "localhost"
    || normalized === "127.0.0.1"
    || normalized === "[::1]"
    || normalized.startsWith("localhost:")
    || normalized.startsWith("127.0.0.1:")
    || normalized.startsWith("[::1]:");
};

const pruneExpiredLocalPreviews = () => {
  const now = Date.now();

  for (const [previewId, preview] of localPreviewStore.entries()) {
    if (preview.expiresAt <= now) {
      localPreviewStore.delete(previewId);
    }
  }

  if (localPreviewStore.size <= DEFAULT_LOCAL_PREVIEW_CAP) {
    return;
  }

  const oldestEntries = [...localPreviewStore.entries()]
    .sort((left, right) => left[1].createdAt - right[1].createdAt)
    .slice(0, Math.max(0, localPreviewStore.size - DEFAULT_LOCAL_PREVIEW_CAP));

  for (const [previewId] of oldestEntries) {
    localPreviewStore.delete(previewId);
  }
};

const getStorageClient = () => {
  if (!cachedStorageClient) {
    cachedStorageClient = new Storage();
  }

  return cachedStorageClient;
};

const buildGcsObjectName = () => {
  const timestamp = Date.now();
  return `${getPreviewObjectPrefix()}/${timestamp}-${randomUUID()}.pdf`;
};

const parsePreviewTimestamp = (objectName: string) => {
  const fileName = objectName.split("/").pop() || "";
  const prefix = fileName.split("-", 1)[0] || "";
  const parsed = Number.parseInt(prefix, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const maybeCleanupExpiredGcsPreviews = async () => {
  const bucketName = getPreviewBucketName();

  if (!bucketName) {
    return;
  }

  const now = Date.now();
  if (lastGcsCleanupStartedAt > now - GCS_CLEANUP_INTERVAL_MS) {
    return;
  }

  lastGcsCleanupStartedAt = now;
  const cutoff = now - getPreviewTtlMs();

  try {
    const [files] = await getStorageClient().bucket(bucketName).getFiles({
      autoPaginate: false,
      maxResults: GCS_CLEANUP_SCAN_LIMIT,
      prefix: `${getPreviewObjectPrefix()}/`,
    });

    await Promise.allSettled(
      files
        .filter((file) => {
          const createdAt = parsePreviewTimestamp(file.name);
          return createdAt !== null && createdAt < cutoff;
        })
        .map((file) => file.delete({ ignoreNotFound: true })),
    );
  } catch (error) {
    console.warn("[TeX Preview] Failed to cleanup expired preview objects.", error);
  }
};

const buildLocalPreviewBaseUrl = (request: IncomingMessage) => {
  const configured = getPreviewPublicBaseUrl();
  if (configured) {
    return configured;
  }

  const host = request.headers.host?.trim() || "";
  const forwardedProto = typeof request.headers["x-forwarded-proto"] === "string"
    ? request.headers["x-forwarded-proto"].split(",")[0]?.trim()
    : "";
  const protocol = forwardedProto || (isLoopbackHost(host) ? "http" : "https");

  if (!host || !isLoopbackHost(host)) {
    return null;
  }

  return `${protocol}://${host}`;
};

const storeLocalPreview = (pdfBuffer: Buffer, request: IncomingMessage): StoredTexPreview => {
  const baseUrl = buildLocalPreviewBaseUrl(request);

  if (!baseUrl) {
    return {
      previewExpiresAt: Date.now() + getPreviewTtlMs(),
      previewStorageBackend: "unavailable",
    };
  }

  pruneExpiredLocalPreviews();

  const previewId = randomUUID();
  const previewExpiresAt = Date.now() + getPreviewTtlMs();
  localPreviewStore.set(previewId, {
    buffer: Buffer.from(pdfBuffer),
    createdAt: Date.now(),
    expiresAt: previewExpiresAt,
  });

  return {
    previewExpiresAt,
    previewStorageBackend: "local",
    previewUrl: `${baseUrl}/preview-assets/${previewId}`,
  };
};

const uploadPreviewToGcs = async (pdfBuffer: Buffer): Promise<StoredTexPreview> => {
  const bucketName = getPreviewBucketName();
  const previewExpiresAt = Date.now() + getPreviewTtlMs();

  if (!bucketName) {
    return {
      previewExpiresAt,
      previewStorageBackend: "unavailable",
    };
  }

  await maybeCleanupExpiredGcsPreviews();

  const bucket = getStorageClient().bucket(bucketName);
  const objectName = buildGcsObjectName();
  const file = bucket.file(objectName);

  await file.save(pdfBuffer, {
    contentType: "application/pdf",
    metadata: {
      cacheControl: `private, max-age=${getPreviewTtlSeconds()}`,
      contentDisposition: "inline; filename=\"preview.pdf\"",
    },
    resumable: false,
    validation: false,
  }).catch((error) => {
    throw new HttpError(503, error instanceof Error ? error.message : "Unable to upload TeX preview PDF.");
  });

  const [previewUrl] = await file.getSignedUrl({
    action: "read",
    expires: previewExpiresAt,
    responseDisposition: "inline; filename=\"preview.pdf\"",
    responseType: "application/pdf",
    version: "v4",
  }).catch((error) => {
    throw new HttpError(503, error instanceof Error ? error.message : "Unable to sign TeX preview PDF URL.");
  });

  return {
    previewExpiresAt,
    previewStorageBackend: "gcs",
    previewUrl,
  };
};

export const storeTexPreviewPdf = async ({
  pdfBuffer,
  request,
}: {
  pdfBuffer: Buffer;
  request: IncomingMessage;
}): Promise<StoredTexPreview> => {
  if (getPreviewBucketName()) {
    return uploadPreviewToGcs(pdfBuffer);
  }

  return storeLocalPreview(pdfBuffer, request);
};

export const consumeLocalTexPreview = (previewId: string) => {
  pruneExpiredLocalPreviews();
  const preview = localPreviewStore.get(previewId);

  if (!preview) {
    throw new HttpError(404, "Compiled preview not found or expired.");
  }

  if (preview.expiresAt <= Date.now()) {
    localPreviewStore.delete(previewId);
    throw new HttpError(404, "Compiled preview not found or expired.");
  }

  return preview;
};
