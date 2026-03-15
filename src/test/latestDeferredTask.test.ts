import { afterEach, describe, expect, it, vi } from "vitest";
import { createLatestDeferredTaskRunner } from "@/lib/editor/latestDeferredTask";

describe("createLatestDeferredTaskRunner", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs only the latest scheduled callback", () => {
    vi.useFakeTimers();
    const runner = createLatestDeferredTaskRunner();
    const calls: string[] = [];

    runner.schedule(() => calls.push("first"), 40);
    runner.schedule(() => calls.push("second"), 40);

    vi.advanceTimersByTime(39);
    expect(calls).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(calls).toEqual(["second"]);
  });

  it("cancels a pending callback", () => {
    vi.useFakeTimers();
    const runner = createLatestDeferredTaskRunner();
    const callback = vi.fn();

    runner.schedule(callback, 25);
    runner.cancel();
    vi.advanceTimersByTime(30);

    expect(callback).not.toHaveBeenCalled();
  });
});
