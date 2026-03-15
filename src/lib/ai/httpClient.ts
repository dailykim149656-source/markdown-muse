interface RequestOptions {
  signal?: AbortSignal;
}

const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";

const getAiApiBaseUrl = () => {
  const configured = import.meta.env.VITE_AI_API_BASE_URL?.trim();

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

    if (isLocalhost) {
      if (!configured) {
        return "/api";
      }

      try {
        const configuredUrl = new URL(configured);
        const isLoopbackTarget = configuredUrl.hostname === "localhost" || configuredUrl.hostname === "127.0.0.1";

        if (isLoopbackTarget) {
          return "/api";
        }
      } catch {
        // Keep the configured base URL when it is not a valid absolute URL.
      }
    }
  }

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

    if (!isLocalhost) {
      return window.location.origin.replace(/\/$/, "");
    }
  }

  return "http://localhost:8787";
};

const readErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json();

    if (payload && typeof payload.error === "string" && payload.error.length > 0) {
      return payload.error;
    }
  } catch {
    // noop
  }

  return `AI request failed with status ${response.status}.`;
};

const readNetworkErrorMessage = (baseUrl: string, error: unknown) => {
  const detail = error instanceof Error && error.message ? ` (${error.message})` : "";
  return `Unable to reach the AI server at ${baseUrl}. Start \`npm run ai:server\` for local development, or set \`VITE_AI_API_BASE_URL\` to your deployed frontend or API URL.${detail}`;
};

const normalizeAiPath = (baseUrl: string, path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (baseUrl.startsWith("/")) {
    const relativePath = normalizedPath.startsWith("/api")
      ? normalizedPath.slice(4) || "/"
      : normalizedPath;

    return `${baseUrl.replace(/\/$/, "")}${relativePath}`;
  }

  return `${baseUrl}${normalizedPath}`;
};

export const postJson = async <TResponse, TRequest>(
  path: string,
  body: TRequest,
  options?: RequestOptions,
): Promise<TResponse> => {
  const baseUrl = getAiApiBaseUrl();
  const requestUrl = normalizeAiPath(baseUrl, path);
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: options?.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(readNetworkErrorMessage(baseUrl, error));
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<TResponse>;
};

export const getJson = async <TResponse>(path: string, options?: RequestOptions): Promise<TResponse> => {
  const baseUrl = getAiApiBaseUrl();
  const requestUrl = normalizeAiPath(baseUrl, path);
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: "GET",
      signal: options?.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(readNetworkErrorMessage(baseUrl, error));
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<TResponse>;
};

export const postBinary = async <TRequest>(
  path: string,
  body: TRequest,
  options?: RequestOptions,
): Promise<Blob> => {
  const baseUrl = getAiApiBaseUrl();
  const requestUrl = normalizeAiPath(baseUrl, path);
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: options?.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(readNetworkErrorMessage(baseUrl, error));
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.blob();
};

export type { RequestOptions };
