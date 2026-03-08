import { useCallback, useEffect, useState } from "react";

export const useEditorUiState = () => {
  const [isDark, setIsDark] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [countWithSpaces, setCountWithSpaces] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark((value) => !value);
  }, []);

  const toggleCountMode = useCallback(() => {
    setCountWithSpaces((value) => !value);
  }, []);

  const closeFindReplace = useCallback(() => {
    setFindReplaceOpen(false);
  }, []);

  const openShortcuts = useCallback(() => {
    setShortcutsOpen(true);
  }, []);

  const openTemplateDialog = useCallback(() => {
    setTemplateOpen(true);
  }, []);

  const togglePreview = useCallback(() => {
    setPreviewOpen((value) => !value);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      return;
    }

    document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey;

      if (hasModifier && (event.key === "f" || event.key === "h")) {
        event.preventDefault();
        setFindReplaceOpen(true);
      }

      if (hasModifier && event.key === "/") {
        event.preventDefault();
        setShortcutsOpen(true);
      }

      if (event.key === "F11") {
        event.preventDefault();
        toggleFullscreen();
      }

      if (event.key === "Escape" && findReplaceOpen) {
        setFindReplaceOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [findReplaceOpen, toggleFullscreen]);

  return {
    closeFindReplace,
    closePreview,
    countWithSpaces,
    findReplaceOpen,
    isDark,
    isFullscreen,
    openShortcuts,
    openTemplateDialog,
    previewOpen,
    setShortcutsOpen,
    setTemplateOpen,
    shortcutsOpen,
    templateOpen,
    toggleCountMode,
    toggleFullscreen,
    togglePreview,
    toggleTheme,
  };
};
