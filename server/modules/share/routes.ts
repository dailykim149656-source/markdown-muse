import { randomBytes } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import type { IncomingMessage } from "node:http";
import { parseDocsyFile, serializeDocsyFile } from "../../../src/lib/docsy/fileFormat";
import {
  DOC_SHARE_DEFAULT_TTL_MS,
  DOC_SHARE_MAX_STORED_PAYLOAD_LENGTH,
} from "../../../src/lib/share/shareConstants";
import type {
  DocumentShareCreateRequest,
  DocumentShareCreateResponse,
  DocumentShareResolveResponse,
} from "../../../src/types/share";
import { assertTrustedPostOrigin, resolveFrontendOrigin } from "../auth/routes";
import { HttpError, getRequestUrl, json, parseOptionalRequestBody, type HttpResponse } from "../http/http";
import { getWorkspaceRepository } from "../workspace/repository";

const SHARE_ID_BYTE_LENGTH = 9;

const encodeBase64Url = (input: Uint8Array) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const decodeBase64Url = (input: string) => {
  const normalized = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");

  return Buffer.from(normalized, "base64");
};

const createShareId = () => encodeBase64Url(randomBytes(SHARE_ID_BYTE_LENGTH));

const compressPayload = (payload: string) => {
  const compressed = deflateRawSync(Buffer.from(payload, "utf8"));
  const encoded = encodeBase64Url(compressed);

  if (encoded.length > DOC_SHARE_MAX_STORED_PAYLOAD_LENGTH) {
    throw new HttpError(413, "Shared document exceeds the storage limit. Download the .docsy file instead.");
  }

  return encoded;
};

const decompressPayload = (compressedPayload: string) =>
  inflateRawSync(decodeBase64Url(compressedPayload)).toString("utf8");

const buildShareLink = (shareId: string, requestOrigin?: string) =>
  new URL(`/s/${shareId}`, resolveFrontendOrigin(requestOrigin)).toString();

const normalizeSerializedDocsyPayload = (payload: string) => {
  const parsed = parseDocsyFile(payload);
  return serializeDocsyFile(parsed);
};

const readShareIdFromPath = (pathname: string) => {
  const match = /^\/api\/share\/([^/]+)$/.exec(pathname);
  return match?.[1] || null;
};

export const handleShareRoute = async (request: IncomingMessage): Promise<HttpResponse | null> => {
  const repository = getWorkspaceRepository();
  const requestOrigin = request.headers.origin;
  const requestUrl = getRequestUrl(request);

  if (request.method === "POST" && requestUrl.pathname === "/api/share") {
    assertTrustedPostOrigin(request);
    await repository.pruneExpired();

    const body = await parseOptionalRequestBody<DocumentShareCreateRequest>(request);
    const payload = body?.payload?.trim();

    if (!payload) {
      throw new HttpError(400, "payload is required.");
    }

    const normalizedPayload = normalizeSerializedDocsyPayload(payload);
    const now = Date.now();
    const shareId = createShareId();
    const response: DocumentShareCreateResponse = {
      expiresAt: now + DOC_SHARE_DEFAULT_TTL_MS,
      link: buildShareLink(shareId, requestOrigin),
      shareId,
    };

    await repository.upsertSharedDocument({
      compressedPayload: compressPayload(normalizedPayload),
      compression: "deflate-raw-base64url",
      createdAt: now,
      expiresAt: response.expiresAt,
      shareId,
      updatedAt: now,
    });

    return json(response, 200, requestOrigin);
  }

  if (request.method === "GET") {
    const shareId = readShareIdFromPath(requestUrl.pathname);

    if (!shareId) {
      return null;
    }

    const sharedDocument = await repository.getSharedDocument(shareId);

    if (!sharedDocument) {
      throw new HttpError(404, "Shared document was not found.");
    }

    if (sharedDocument.expiresAt <= Date.now()) {
      await repository.pruneExpired();
      throw new HttpError(410, "Shared document has expired.");
    }

    const response: DocumentShareResolveResponse = {
      expiresAt: sharedDocument.expiresAt,
      payload: decompressPayload(sharedDocument.compressedPayload),
      shareId: sharedDocument.shareId,
    };

    return json(response, 200, requestOrigin);
  }

  return null;
};
