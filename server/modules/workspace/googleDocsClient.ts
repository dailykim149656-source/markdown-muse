import { HttpError } from "../http/http";

const GOOGLE_DOCS_API_URL = "https://docs.googleapis.com/v1";

const readGoogleError = async (response: Response) => {
  try {
    const payload = await response.json() as { error?: { message?: string } };
    if (payload.error?.message) {
      return payload.error.message;
    }
  } catch {
    // ignore parse failure
  }

  return `Google Docs request failed with status ${response.status}.`;
};

export const getGoogleDocument = async (accessToken: string, fileId: string) => {
  const url = new URL(`${GOOGLE_DOCS_API_URL}/documents/${encodeURIComponent(fileId)}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: "GET",
  });

  if (!response.ok) {
    throw new HttpError(502, await readGoogleError(response));
  }

  return response.json() as Promise<unknown>;
};

export const createGoogleDocument = async (accessToken: string, title: string) => {
  const url = new URL(`${GOOGLE_DOCS_API_URL}/documents`);
  const body = JSON.stringify({
    title,
  });

  const response = await fetch(url, {
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new HttpError(502, await readGoogleError(response));
  }

  return response.json() as Promise<unknown>;
};

export const batchUpdateGoogleDocument = async (
  accessToken: string,
  fileId: string,
  requests: unknown[],
  requiredRevisionId?: string,
) => {
  const url = new URL(`${GOOGLE_DOCS_API_URL}/documents/${encodeURIComponent(fileId)}:batchUpdate`);
  const body = JSON.stringify({
    requests,
    writeControl: requiredRevisionId
      ? {
        requiredRevisionId,
      }
      : undefined,
  });

  const response = await fetch(url, {
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new HttpError(response.status === 400 || response.status === 409 ? 409 : 502, await readGoogleError(response));
  }

  return response.json() as Promise<{
    writeControl?: {
      requiredRevisionId?: string;
    };
  }>;
};
