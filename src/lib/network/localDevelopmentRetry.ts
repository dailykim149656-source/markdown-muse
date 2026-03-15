const LOCAL_DEVELOPMENT_RETRY_DELAYS_MS = [750, 1_500, 3_000, 5_000, 8_000];

const isLocalHostname = (hostname: string) => hostname === "localhost" || hostname === "127.0.0.1";

const isLoopbackTarget = (baseUrl: string) => {
  try {
    return isLocalHostname(new URL(baseUrl).hostname);
  } catch {
    return false;
  }
};

const createAbortError = () => {
  try {
    return new DOMException("The operation was aborted.", "AbortError");
  } catch {
    const error = new Error("The operation was aborted.");
    error.name = "AbortError";
    return error;
  }
};

const waitForRetryDelay = (delayMs: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) {
    reject(createAbortError());
    return;
  }

  const timeoutId = globalThis.setTimeout(() => {
    signal?.removeEventListener("abort", handleAbort);
    resolve();
  }, delayMs);

  const handleAbort = () => {
    globalThis.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", handleAbort);
    reject(createAbortError());
  };

  signal?.addEventListener("abort", handleAbort, { once: true });
});

export const shouldRetryLocalDevelopmentRequest = (baseUrl: string) => {
  if (typeof window === "undefined") {
    return isLoopbackTarget(baseUrl);
  }

  if (!isLocalHostname(window.location.hostname)) {
    return false;
  }

  return baseUrl.startsWith("/") || isLoopbackTarget(baseUrl);
};

export const retryLocalDevelopmentRequest = async <T>(
  baseUrl: string,
  request: () => Promise<T>,
  signal?: AbortSignal,
) => {
  let attempt = 0;

  while (true) {
    try {
      return await request();
    } catch (error) {
      if (signal?.aborted || !shouldRetryLocalDevelopmentRequest(baseUrl) || attempt >= LOCAL_DEVELOPMENT_RETRY_DELAYS_MS.length) {
        throw error;
      }

      await waitForRetryDelay(LOCAL_DEVELOPMENT_RETRY_DELAYS_MS[attempt], signal);
      attempt += 1;
    }
  }
};
