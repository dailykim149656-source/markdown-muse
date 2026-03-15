type CancelDeferredTask = () => void;

const scheduleDeferredTask = (callback: () => void, delayMs = 0): CancelDeferredTask => {
  if (typeof window === "undefined") {
    const timeoutId = globalThis.setTimeout(callback, delayMs);
    return () => globalThis.clearTimeout(timeoutId);
  }

  if ("requestIdleCallback" in window && "cancelIdleCallback" in window) {
    const idleWindow = window as Window & typeof globalThis;
    const timeoutId = globalThis.setTimeout(() => {
      const idleId = idleWindow.requestIdleCallback(callback, { timeout: delayMs + 800 });
      return () => idleWindow.cancelIdleCallback(idleId);
    }, delayMs);

    return () => globalThis.clearTimeout(timeoutId);
  }

  const timeoutId = globalThis.setTimeout(callback, delayMs);
  return () => globalThis.clearTimeout(timeoutId);
};

export const createLatestDeferredTaskRunner = () => {
  let cancelCurrent: CancelDeferredTask | null = null;
  let requestId = 0;

  return {
    cancel() {
      requestId += 1;
      cancelCurrent?.();
      cancelCurrent = null;
    },
    schedule(callback: () => void, delayMs = 0) {
      requestId += 1;
      const nextRequestId = requestId;

      cancelCurrent?.();
      cancelCurrent = scheduleDeferredTask(() => {
        if (nextRequestId !== requestId) {
          return;
        }

        cancelCurrent = null;
        callback();
      }, delayMs);
    },
  };
};
