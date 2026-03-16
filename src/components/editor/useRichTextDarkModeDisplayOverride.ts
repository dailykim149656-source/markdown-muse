import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import {
  applyDarkModeDisplayColorOverrides,
  clearDarkModeDisplayColorOverrides,
} from "@/lib/editor/displayColorOverride";

const isDocumentDarkMode = () =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark");

const MAX_MOUNT_RETRY_ATTEMPTS = 120;

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

const getMountedEditorRoot = (editor: Editor | null) => {
  if (!editor || typeof HTMLElement === "undefined") {
    return null;
  }

  try {
    const root = editor.view.dom;

    if (!(root instanceof HTMLElement) || !root.isConnected) {
      return null;
    }

    return root;
  } catch {
    return null;
  }
};

export const useRichTextDarkModeDisplayOverride = (editor: Editor | null) => {
  const [isDarkMode, setIsDarkMode] = useState(isDocumentDarkMode);
  const refreshAnimationFrameRef = useRef<number | null>(null);
  const mountRetryAnimationFrameRef = useRef<number | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const observedRootRef = useRef<HTMLElement | null>(null);

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
    let isDisposed = false;

    const scheduleOverrideRefresh = () => {
      const root = observedRootRef.current;

      if (!root) {
        return;
      }

      if (refreshAnimationFrameRef.current !== null) {
        cancelScheduledAnimationFrame(refreshAnimationFrameRef.current);
      }

      refreshAnimationFrameRef.current = scheduleAnimationFrame(() => {
        refreshAnimationFrameRef.current = null;

        if (isDisposed || observedRootRef.current !== root) {
          return;
        }

        if (isDarkMode) {
          applyDarkModeDisplayColorOverrides(root);
          return;
        }

        clearDarkModeDisplayColorOverrides(root);
      });
    };

    const cleanupObservedRoot = () => {
      observerRef.current?.disconnect();
      observerRef.current = null;

      if (refreshAnimationFrameRef.current !== null) {
        cancelScheduledAnimationFrame(refreshAnimationFrameRef.current);
        refreshAnimationFrameRef.current = null;
      }

      const root = observedRootRef.current;

      if (root) {
        clearDarkModeDisplayColorOverrides(root);
      }

      observedRootRef.current = null;
    };

    const attachToMountedRoot = (root: HTMLElement) => {
      if (observedRootRef.current === root) {
        scheduleOverrideRefresh();
        return;
      }

      cleanupObservedRoot();
      observedRootRef.current = root;
      scheduleOverrideRefresh();

      if (typeof MutationObserver === "undefined") {
        return;
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

      observerRef.current = observer;
    };

    const scheduleMountRetry = (attempt = 0) => {
      if (mountRetryAnimationFrameRef.current !== null || attempt >= MAX_MOUNT_RETRY_ATTEMPTS) {
        return;
      }

      mountRetryAnimationFrameRef.current = scheduleAnimationFrame(() => {
        mountRetryAnimationFrameRef.current = null;

        if (isDisposed) {
          return;
        }

        const root = getMountedEditorRoot(editor);

        if (!root) {
          if (editor) {
            scheduleMountRetry(attempt + 1);
          }
          return;
        }

        attachToMountedRoot(root);
      });
    };

    const initialRoot = getMountedEditorRoot(editor);

    if (initialRoot) {
      attachToMountedRoot(initialRoot);
    } else if (editor) {
      scheduleMountRetry();
    }

    return () => {
      isDisposed = true;

      if (mountRetryAnimationFrameRef.current !== null) {
        cancelScheduledAnimationFrame(mountRetryAnimationFrameRef.current);
        mountRetryAnimationFrameRef.current = null;
      }

      cleanupObservedRoot();
    };
  }, [editor, isDarkMode]);
};
