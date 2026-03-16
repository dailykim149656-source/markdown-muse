import type { Editor } from "@tiptap/react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR } from "@/lib/editor/displayColorOverride";
import { useRichTextDarkModeDisplayOverride } from "@/components/editor/useRichTextDarkModeDisplayOverride";

const advanceAnimationFrame = async () => {
  await act(async () => {
    await vi.advanceTimersToNextTimerAsync();
  });
};

const createDeferredEditor = () => {
  let root: HTMLElement | null = null;
  let shouldThrow = true;
  const view = {};

  Object.defineProperty(view, "dom", {
    configurable: true,
    get() {
      if (shouldThrow) {
        throw new Error("[tiptap error]: The editor view is not available.");
      }

      return root;
    },
  });

  return {
    editor: {
      get isDestroyed() {
        return shouldThrow;
      },
      view,
    } as unknown as Editor,
    revealRoot(nextRoot: HTMLElement | null) {
      root = nextRoot;
      shouldThrow = false;
    },
  };
};

describe("useRichTextDarkModeDisplayOverride", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: undefined,
      writable: true,
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: undefined,
      writable: true,
    });
    document.documentElement.classList.add("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
    document.body.innerHTML = "";
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("waits for a mounted editor root after pre-mount view access throws and updates on theme changes", async () => {
    const deferredEditor = createDeferredEditor();
    const root = document.createElement("div");
    const inlineText = document.createElement("span");
    inlineText.style.color = "black";
    inlineText.textContent = "Visible";
    root.append(inlineText);

    const { unmount } = renderHook(() => useRichTextDarkModeDisplayOverride(deferredEditor.editor));

    await advanceAnimationFrame();
    expect(inlineText).not.toHaveAttribute(DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR);

    deferredEditor.revealRoot(root);
    await advanceAnimationFrame();
    expect(inlineText).not.toHaveAttribute(DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR);

    document.body.append(root);
    await advanceAnimationFrame();
    await advanceAnimationFrame();
    expect(inlineText).toHaveAttribute(DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR, "true");

    await act(async () => {
      document.documentElement.classList.remove("dark");
      await Promise.resolve();
      await vi.advanceTimersToNextTimerAsync();
    });

    expect(inlineText).not.toHaveAttribute(DOCSY_DARK_MODE_COLOR_OVERRIDE_ATTR);

    await act(async () => {
      unmount();
      await Promise.resolve();
    });
  });
});
