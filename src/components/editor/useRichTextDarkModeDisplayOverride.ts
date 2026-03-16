import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import {
  applyDarkModeDisplayColorOverrides,
  clearDarkModeDisplayColorOverrides,
} from "@/lib/editor/displayColorOverride";

const isDocumentDarkMode = () =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark");

const scheduleAnimationFrame = (callback: () => void) => {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(callback);
  }

  return window.setTimeout(callback, 0);
};

const cancelScheduledAnimationFrame = (frameId: number) => {
  if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(frameId);
    return;
  }

  window.clearTimeout(frameId);
};

export const useRichTextDarkModeDisplayOverride = (editor: Editor | null) => {
  const [isDarkMode, setIsDarkMode] = useState(isDocumentDarkMode);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
      return;
    }

    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDarkMode(root.classList.contains("dark"));
    });

    observer.observe(root, {
      attributeFilter: ["class"],
      attributes: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const root = editor?.view.dom as HTMLElement | undefined;

    if (!root) {
      return;
    }

    const scheduleOverrideRefresh = () => {
      if (animationFrameRef.current !== null) {
        cancelScheduledAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = scheduleAnimationFrame(() => {
        animationFrameRef.current = null;

        if (isDarkMode) {
          applyDarkModeDisplayColorOverrides(root);
          return;
        }

        clearDarkModeDisplayColorOverrides(root);
      });
    };

    scheduleOverrideRefresh();

    if (typeof MutationObserver === "undefined") {
      return () => {
        if (animationFrameRef.current !== null) {
          cancelScheduledAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        clearDarkModeDisplayColorOverrides(root);
      };
    }

    const observer = new MutationObserver(() => {
      scheduleOverrideRefresh();
    });

    observer.observe(root, {
      attributeFilter: ["style"],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();

      if (animationFrameRef.current !== null) {
        cancelScheduledAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      clearDarkModeDisplayColorOverrides(root);
    };
  }, [editor, isDarkMode]);
};
