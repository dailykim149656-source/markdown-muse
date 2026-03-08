import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import LatexEditor from "@/components/editor/LatexEditor";
import HtmlEditor from "@/components/editor/HtmlEditor";
import EditorHeader, { type EditorMode } from "@/components/editor/EditorHeader";
import FindReplaceBar from "@/components/editor/FindReplaceBar";
import KeyboardShortcutsModal from "@/components/editor/KeyboardShortcutsModal";
import DocumentTabs from "@/components/editor/DocumentTabs";
import { loadSavedData, saveData, useAutoSave, createNewDocument, type AutoSaveData, type DocumentData } from "@/components/editor/useAutoSave";
import { toast } from "sonner";

const Index = () => {
  const [isDark, setIsDark] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  // Multi-document state
  const [documents, setDocuments] = useState<DocumentData[]>(() => {
    const saved = loadSavedData();
    if (saved?.documents?.length) return saved.documents;
    return [createNewDocument()];
  });
  const [activeDocId, setActiveDocId] = useState<string>(() => {
    const saved = loadSavedData();
    if (saved?.activeDocId && saved.documents?.some(d => d.id === saved.activeDocId)) return saved.activeDocId;
    return documents[0].id;
  });

  const activeDoc = useMemo(() => documents.find(d => d.id === activeDocId) || documents[0], [documents, activeDocId]);

  // Auto-save
  const autoSaveData = useMemo<AutoSaveData>(() => ({
    documents,
    activeDocId,
    lastSaved: Date.now(),
  }), [documents, activeDocId]);

  useAutoSave(autoSaveData);

  // Save on every document change too (immediate)
  const saveImmediate = useCallback(() => {
    saveData({ documents, activeDocId, lastSaved: Date.now() });
  }, [documents, activeDocId]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Update active document helper
  const updateActiveDoc = useCallback((patch: Partial<DocumentData>) => {
    setDocuments(prev => prev.map(d => d.id === activeDocId ? { ...d, ...patch, updatedAt: Date.now() } : d));
  }, [activeDocId]);

  const handleContentChange = useCallback((content: string) => {
    updateActiveDoc({ content });
  }, [updateActiveDoc]);

  const handleModeChange = useCallback((mode: EditorMode) => {
    updateActiveDoc({ mode });
    setEditorKey(k => k + 1);
  }, [updateActiveDoc]);

  const handleFileNameChange = useCallback((name: string) => {
    updateActiveDoc({ name });
  }, [updateActiveDoc]);

  // Word count
  const wordCount = useMemo(() => {
    const content = activeDoc.content;
    if (activeDoc.mode === "latex") {
      const text = content.replace(/\\[a-zA-Z]+\{?[^}]*\}?/g, "").replace(/[{}\\$%&]/g, "").trim();
      return text.length;
    }
    if (activeDoc.mode === "html") {
      const tmp = document.createElement("div");
      tmp.innerHTML = content;
      return (tmp.textContent || "").trim().length;
    }
    return content.replace(/[#*_~`>\-\[\]()!|]/g, "").trim().length;
  }, [activeDoc.content, activeDoc.mode]);

  // Tab operations
  const handleNewDoc = useCallback(() => {
    const newDoc = createNewDocument();
    setDocuments(prev => [...prev, newDoc]);
    setActiveDocId(newDoc.id);
    setEditorKey(k => k + 1);
  }, []);

  const handleSelectDoc = useCallback((id: string) => {
    saveImmediate();
    setActiveDocId(id);
    setEditorKey(k => k + 1);
  }, [saveImmediate]);

  const handleCloseDoc = useCallback((id: string) => {
    setDocuments(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(d => d.id !== id);
      if (id === activeDocId) {
        const idx = prev.findIndex(d => d.id === id);
        const newActive = next[Math.min(idx, next.length - 1)];
        setActiveDocId(newActive.id);
        setEditorKey(k => k + 1);
      }
      return next;
    });
  }, [activeDocId]);

  // Save handlers
  const handleSaveMd = useCallback(() => {
    const blob = new Blob([activeDoc.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDoc.name || "Untitled"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeDoc]);

  const handleSaveTex = useCallback(() => {
    const blob = new Blob([activeDoc.content], { type: "application/x-tex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDoc.name || "Untitled"}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeDoc]);

  const handleSaveHtml = useCallback(() => {
    const blob = new Blob([activeDoc.content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDoc.name || "Untitled"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeDoc]);

  const getEditorHtmlForPrint = useCallback(() => {
    if (activeDoc.mode === "latex") {
      return document.querySelector(".prose")?.innerHTML || "";
    }
    return document.querySelector(".tiptap-editor .ProseMirror")?.innerHTML || "";
  }, [activeDoc.mode]);

  const buildPrintHtml = useCallback((content: string) => {
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML).join("\n");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeDoc.name || "Untitled"}</title>${styles}<style>@media print{body{margin:0;padding:40px;background:white!important;color:black!important;font-family:'Inter','Noto Sans KR',sans-serif}*{color-adjust:exact;-webkit-print-color-adjust:exact}}body{max-width:800px;margin:0 auto;padding:40px;font-family:'Inter','Noto Sans KR',sans-serif;font-size:14px;line-height:1.7;color:#1a1a1a;background:white}h1{font-size:2em;font-weight:700;margin:1.5em 0 .5em}h2{font-size:1.5em;font-weight:600;margin:1.2em 0 .4em}h3{font-size:1.25em;font-weight:600;margin:1em 0 .3em}p{margin:.5em 0}ul,ol{padding-left:1.5em;margin:.5em 0}blockquote{border-left:3px solid #ddd;padding-left:1em;color:#666;margin:1em 0}code{background:#f5f5f5;padding:.15em .4em;border-radius:3px;font-size:.9em}pre{background:#f5f5f5;padding:1em;border-radius:6px;overflow-x:auto}pre code{background:none;padding:0}table{border-collapse:collapse;width:100%;margin:1em 0}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f9f9f9;font-weight:600}img{max-width:100%;height:auto;margin:1em 0}hr{border:none;border-top:1px solid #ddd;margin:1.5em 0}mark{background:#fff3bf;padding:.1em .2em;border-radius:2px}a{color:#1971c2}</style></head><body>${content}</body></html>`;
  }, [activeDoc.name]);

  const handleSavePdf = useCallback(() => {
    const content = getEditorHtmlForPrint();
    if (!content) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(buildPrintHtml(content));
    w.document.close();
    setTimeout(() => w.print(), 500);
  }, [getEditorHtmlForPrint, buildPrintHtml]);

  const handlePrint = handleSavePdf;

  const handleLoad = useCallback(() => { fileInputRef.current?.click(); }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const name = file.name.replace(/\.(md|tex|txt|html|htm)$/, "");
      let mode: EditorMode = "markdown";
      if (file.name.endsWith(".tex")) mode = "latex";
      else if (file.name.endsWith(".html") || file.name.endsWith(".htm")) mode = "html";

      const newDoc = createNewDocument(name, mode);
      newDoc.content = content;
      setDocuments(prev => [...prev, newDoc]);
      setActiveDocId(newDoc.id);
      setEditorKey(k => k + 1);
      toast.success(`"${name}" 파일을 불러왔습니다`);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "f") { e.preventDefault(); setFindReplaceOpen(true); }
      if (mod && e.key === "h") { e.preventDefault(); setFindReplaceOpen(true); }
      if (mod && e.key === "/") { e.preventDefault(); setShortcutsOpen(true); }
      if (e.key === "F11") { e.preventDefault(); toggleFullscreen(); }
      if (e.key === "Escape" && findReplaceOpen) setFindReplaceOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [findReplaceOpen]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Auto-save indicator
  useEffect(() => {
    const saved = loadSavedData();
    if (saved?.documents?.length) {
      toast.info("이전 작업이 복원되었습니다", { duration: 2000 });
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      <EditorHeader
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onSaveMd={handleSaveMd}
        onSaveTex={handleSaveTex}
        onSaveHtml={handleSaveHtml}
        onSavePdf={handleSavePdf}
        onPrint={handlePrint}
        onLoad={handleLoad}
        fileName={activeDoc.name}
        onFileNameChange={handleFileNameChange}
        wordCount={wordCount}
        mode={activeDoc.mode}
        onModeChange={handleModeChange}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
      <DocumentTabs
        documents={documents}
        activeDocId={activeDocId}
        onSelectDoc={handleSelectDoc}
        onCloseDoc={handleCloseDoc}
        onNewDoc={handleNewDoc}
      />
      <FindReplaceBar
        open={findReplaceOpen}
        onClose={() => setFindReplaceOpen(false)}
        containerRef={editorContainerRef}
      />
      <div className="flex-1 overflow-hidden" ref={editorContainerRef}>
        {activeDoc.mode === "markdown" ? (
          <MarkdownEditor
            key={editorKey}
            onContentChange={handleContentChange}
            initialContent={activeDoc.content || undefined}
          />
        ) : activeDoc.mode === "latex" ? (
          <LatexEditor
            key={editorKey}
            initialContent={activeDoc.content}
            onContentChange={handleContentChange}
          />
        ) : (
          <HtmlEditor
            key={editorKey}
            initialContent={activeDoc.content}
            onContentChange={handleContentChange}
          />
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,.tex,.html,.htm"
        className="hidden"
        onChange={handleFileChange}
      />
      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
};

export default Index;
