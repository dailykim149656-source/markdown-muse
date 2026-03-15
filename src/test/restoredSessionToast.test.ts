import { describe, expect, it, vi } from "vitest";

const info = vi.fn();
const dismiss = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    dismiss: (...args: unknown[]) => dismiss(...args),
    info: (...args: unknown[]) => info(...args),
  },
}));

import { RESTORED_SESSION_TOAST_ID, showRestoredSessionToast } from "@/lib/documents/restoredSessionToast";

describe("showRestoredSessionToast", () => {
  it("registers a start-fresh toast action for restored sessions", () => {
    const onStartFresh = vi.fn();

    showRestoredSessionToast({
      onStartFresh,
      t: (key) => key,
    });

    expect(info).toHaveBeenCalledWith("toasts.restoredSession", expect.objectContaining({
      action: expect.objectContaining({
        label: "resetDocuments.action",
      }),
      duration: 4000,
      id: RESTORED_SESSION_TOAST_ID,
    }));

    const [, options] = info.mock.calls[0] as [string, { action: { onClick: (event: unknown) => void } }];
    options.action.onClick({});

    expect(dismiss).toHaveBeenCalledWith(RESTORED_SESSION_TOAST_ID);
    expect(onStartFresh).toHaveBeenCalledTimes(1);
  });
});
