import { afterEach, describe, expect, it, vi } from "vitest";
import { handleListenError } from "../../server/modules/http/handleListenError";

const originalFetch = global.fetch;

describe("handleListenError", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("treats a healthy existing AI server as a successful no-op startup", async () => {
    global.fetch = vi.fn(async () => ({
      json: async () => ({ configured: true, ok: true }),
      ok: true,
    }) as Response);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const exitCode = await handleListenError({
      error: { code: "EADDRINUSE" } as NodeJS.ErrnoException,
      port: 8787,
      serviceName: "AI Server",
    });

    expect(exitCode).toBe(0);
    expect(global.fetch).toHaveBeenCalledWith("http://127.0.0.1:8787/health");
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("fails when another process owns the port but does not expose the AI health endpoint", async () => {
    global.fetch = vi.fn(async () => ({
      json: async () => ({ ok: false }),
      ok: false,
    }) as Response);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const exitCode = await handleListenError({
      error: { code: "EADDRINUSE" } as NodeJS.ErrnoException,
      port: 8787,
      serviceName: "AI Server",
    });

    expect(exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy.mock.calls[0]?.[0]).toContain("Port 8787 is already in use by another process.");
  });

  it("fails for non-port-conflict listener errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failure = Object.assign(new Error("permission denied"), { code: "EACCES" }) as NodeJS.ErrnoException;

    const exitCode = await handleListenError({
      error: failure,
      port: 8787,
      serviceName: "AI Server",
    });

    expect(exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith("[AI Server] Failed to start listener on port 8787.", failure);
  });
});
