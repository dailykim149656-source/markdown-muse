import { beforeEach, describe, expect, it, vi } from "vitest";

const info = vi.fn();
const dismiss = vi.fn();
const error = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    dismiss: (...args: unknown[]) => dismiss(...args),
    error: (...args: unknown[]) => error(...args),
    info: (...args: unknown[]) => info(...args),
  },
}));

import {
  RESTORED_SESSION_TOAST_ID,
  UNEXPECTED_RELOAD_LOST_TOAST_ID,
  UNEXPECTED_RELOAD_RECOVERED_TOAST_ID,
  showRestoredSessionToast,
  showUnexpectedReloadLostToast,
  showUnexpectedReloadRecoveredToast,
} from "@/lib/documents/restoredSessionToast";

describe("showRestoredSessionToast", () => {
  beforeEach(() => {
    info.mockClear();
    dismiss.mockClear();
    error.mockClear();
  });

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

  it("shows a recovered unexpected reload toast with the start-fresh action", () => {
    const onStartFresh = vi.fn();

    showUnexpectedReloadRecoveredToast({
      onStartFresh,
      t: (key) => key,
    });

    expect(info).toHaveBeenCalledWith("toasts.unexpectedReloadRecovered", expect.objectContaining({
      action: expect.objectContaining({
        label: "resetDocuments.action",
      }),
      duration: 7000,
      id: UNEXPECTED_RELOAD_RECOVERED_TOAST_ID,
    }));

    const [, options] = info.mock.calls.at(-1) as [string, { action: { onClick: () => void } }];
    options.action.onClick();

    expect(dismiss).toHaveBeenCalledWith(UNEXPECTED_RELOAD_RECOVERED_TOAST_ID);
    expect(onStartFresh).toHaveBeenCalledTimes(1);
  });

  it("shows an error toast when a repeated boot loses previous documents", () => {
    showUnexpectedReloadLostToast({
      t: (key) => key,
    });

    expect(error).toHaveBeenCalledWith("toasts.unexpectedReloadLost", expect.objectContaining({
      duration: 9000,
      id: UNEXPECTED_RELOAD_LOST_TOAST_ID,
    }));
  });
});
