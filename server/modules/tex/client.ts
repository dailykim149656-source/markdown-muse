import { HttpError } from "../http/http";
import type {
  TexExportPdfRequest,
  TexHealthResponse,
  TexPreviewRequest,
  TexPreviewResponse,
  TexValidateRequest,
  TexValidateResponse,
} from "@/types/tex";

const getTexServiceBaseUrl = () => process.env.TEX_SERVICE_BASE_URL?.trim().replace(/\/$/, "") || "";
const getTexServiceAuthToken = () => process.env.TEX_SERVICE_AUTH_TOKEN?.trim() || "";
const METADATA_IDENTITY_TOKEN_URL = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity";

let cachedIdentityToken: { audience: string; expiresAt: number; token: string } | null = null;

const isLocalTexService = (baseUrl: string) => {
  try {
    const url = new URL(baseUrl);
    return url.hostname === "127.0.0.1" || url.hostname === "localhost";
  } catch {
    return false;
  }
};

const getTexServiceIdentityToken = async (audience: string) => {
  if (isLocalTexService(audience)) {
    return "";
  }

  if (cachedIdentityToken && cachedIdentityToken.audience === audience && cachedIdentityToken.expiresAt > Date.now() + 60_000) {
    return cachedIdentityToken.token;
  }

  const identityUrl = `${METADATA_IDENTITY_TOKEN_URL}?audience=${encodeURIComponent(audience)}&format=full`;
  const response = await fetch(identityUrl, {
    headers: {
      "Metadata-Flavor": "Google",
    },
  }).catch((error) => {
    throw new HttpError(503, error instanceof Error ? error.message : "Unable to mint TeX service identity token.");
  });

  if (!response.ok) {
    throw new HttpError(response.status, "Unable to mint TeX service identity token.");
  }

  const token = (await response.text()).trim();
  cachedIdentityToken = {
    audience,
    expiresAt: Date.now() + (45 * 60 * 1000),
    token,
  };

  return token;
};

const buildTexServiceHeaders = async (baseUrl: string) => {
  const authToken = getTexServiceAuthToken();
  const identityToken = await getTexServiceIdentityToken(baseUrl);

  return {
    ...(identityToken ? { Authorization: `Bearer ${identityToken}` } : {}),
    ...(authToken ? { "X-Docsy-Tex-Token": authToken } : {}),
  };
};

const ensureTexServiceConfigured = () => {
  const baseUrl = getTexServiceBaseUrl();

  if (!baseUrl) {
    throw new HttpError(503, "TeX service is not configured.");
  }

  return baseUrl;
};

const readErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json();
    if (payload && typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
  } catch {
    // noop
  }

  return `TeX service request failed with status ${response.status}.`;
};

const requestJson = async <TResponse, TRequest = undefined>(
  method: "GET" | "POST",
  path: string,
  body?: TRequest,
): Promise<TResponse> => {
  const baseUrl = ensureTexServiceConfigured();
  const response = await fetch(`${baseUrl}${path}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(await buildTexServiceHeaders(baseUrl)),
    },
    method,
  }).catch((error) => {
    throw new HttpError(503, error instanceof Error ? error.message : "Unable to reach TeX service.");
  });

  if (!response.ok) {
    throw new HttpError(response.status, await readErrorMessage(response));
  }

  return response.json() as Promise<TResponse>;
};

export const getTexHealth = async (): Promise<TexHealthResponse> => {
  const baseUrl = getTexServiceBaseUrl();

  if (!baseUrl) {
    return {
      configured: false,
      engine: "xelatex",
      ok: false,
    };
  }

  return requestJson<TexHealthResponse>("GET", "/health");
};

export const validateTex = (payload: TexValidateRequest) =>
  requestJson<TexValidateResponse, TexValidateRequest>("POST", "/validate", payload);

export const previewTex = (payload: TexPreviewRequest) =>
  requestJson<TexPreviewResponse, TexPreviewRequest>("POST", "/preview", payload);

export const exportTexPdf = async (payload: TexExportPdfRequest) => {
  const baseUrl = ensureTexServiceConfigured();
  const response = await fetch(`${baseUrl}/export-pdf`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      ...(await buildTexServiceHeaders(baseUrl)),
    },
    method: "POST",
  }).catch((error) => {
    throw new HttpError(503, error instanceof Error ? error.message : "Unable to reach TeX service.");
  });

  if (!response.ok) {
    throw new HttpError(response.status, await readErrorMessage(response));
  }

  const arrayBuffer = await response.arrayBuffer();

  return {
    body: Buffer.from(arrayBuffer),
    contentDisposition: response.headers.get("content-disposition") || undefined,
    contentType: response.headers.get("content-type") || "application/pdf",
  };
};
