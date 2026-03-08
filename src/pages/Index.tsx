import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import LatexEditor from "@/components/editor/LatexEditor";
import HtmlEditor from "@/components/editor/HtmlEditor";
import JsonYamlEditor from "@/components/editor/JsonYamlEditor";
import TemplateDialog, { type DocumentTemplate } from "@/components/editor/TemplateDialog";
import EditorHeader, { type EditorMode } from "@/components/editor/EditorHeader";
import FindReplaceBar from "@/components/editor/FindReplaceBar";
import KeyboardShortcutsModal from "@/components/editor/KeyboardShortcutsModal";
import DocumentTabs from "@/components/editor/DocumentTabs";
import FileSidebar from "@/components/editor/FileSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
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

  const saveImmediate = useCallback(() => {
    saveData({ documents, activeDocId, lastSaved: Date.now() });
  }, [documents, activeDocId]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

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

  const wordCount = useMemo(() => {
    const content = activeDoc.content;
    if (activeDoc.mode === "latex") {
      return content.replace(/\\[a-zA-Z]+\{?[^}]*\}?/g, "").replace(/[{}\\$%&]/g, "").trim().length;
    }
    if (activeDoc.mode === "html") {
      const tmp = document.createElement("div");
      tmp.innerHTML = content;
      return (tmp.textContent || "").trim().length;
    }
    return content.replace(/[#*_~`>\-\[\]()!|]/g, "").trim().length;
  }, [activeDoc.content, activeDoc.mode]);

  // Document operations
  const handleNewDoc = useCallback((mode: EditorMode = "markdown") => {
    const newDoc = createNewDocument("Untitled", mode);
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

  const handleDeleteDoc = useCallback((id: string) => {
    handleCloseDoc(id);
  }, [handleCloseDoc]);

  const handleRenameDoc = useCallback((id: string, name: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, name, updatedAt: Date.now() } : d));
  }, []);

  // Save handlers
  const downloadFile = useCallback((content: string, ext: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDoc.name || "Untitled"}${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeDoc.name]);

  const handleSaveMd = useCallback(() => downloadFile(activeDoc.content, ".md", "text/markdown"), [activeDoc, downloadFile]);
  const handleSaveTex = useCallback(() => downloadFile(activeDoc.content, ".tex", "application/x-tex"), [activeDoc, downloadFile]);
  const handleSaveJson = useCallback(() => downloadFile(activeDoc.content, ".json", "application/json"), [activeDoc, downloadFile]);
  const handleSaveYaml = useCallback(() => downloadFile(activeDoc.content, ".yaml", "text/yaml"), [activeDoc, downloadFile]);

  // Enhanced HTML export
  const handleSaveHtml = useCallback(() => {
    const editorHtml = document.querySelector(".tiptap-editor .ProseMirror")?.innerHTML || activeDoc.content;
    const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Docsy Editor">
  <title>${activeDoc.name || "Untitled"}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 16px; line-height: 1.8; color: #1a1a2e; background: #fafafa;
      max-width: 800px; margin: 0 auto; padding: 3rem 2rem;
    }
    h1 { font-size: 2.25em; font-weight: 700; margin: 2rem 0 1rem; color: #0a0a0a; letter-spacing: -0.02em; }
    h2 { font-size: 1.625em; font-weight: 600; margin: 1.75rem 0 0.75rem; color: #1a1a1a; }
    h3 { font-size: 1.25em; font-weight: 600; margin: 1.5rem 0 0.5rem; color: #2a2a2a; }
    p { margin: 0.75em 0; }
    a { color: #2563eb; text-decoration: underline; text-underline-offset: 2px; }
    a:hover { color: #1d4ed8; }
    strong { font-weight: 600; }
    em { font-style: italic; }
    ul, ol { padding-left: 1.75em; margin: 0.75em 0; }
    li { margin: 0.25em 0; }
    blockquote {
      border-left: 4px solid #e5e7eb; padding: 0.5em 1em; margin: 1.25em 0;
      color: #6b7280; background: #f9fafb; border-radius: 0 8px 8px 0;
    }
    code {
      background: #f1f5f9; padding: 0.2em 0.45em; border-radius: 4px;
      font-size: 0.875em; font-family: 'Fira Code', 'JetBrains Mono', monospace;
      color: #e11d48;
    }
    pre {
      background: #1e293b; color: #e2e8f0; padding: 1.25rem; border-radius: 8px;
      overflow-x: auto; margin: 1.25em 0; font-size: 0.875em; line-height: 1.6;
    }
    pre code { background: none; color: inherit; padding: 0; font-size: inherit; }
    table { border-collapse: collapse; width: 100%; margin: 1.25em 0; }
    th, td { border: 1px solid #e5e7eb; padding: 10px 14px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; color: #374151; }
    tr:nth-child(even) { background: #fafafa; }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 1.25em 0; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2em 0; }
    mark { background: #fef3c7; padding: 0.1em 0.25em; border-radius: 3px; }
    sub { font-size: 0.75em; }
    sup { font-size: 0.75em; }
    /* Admonition callouts */
    div[data-type="admonition"] {
      border-left: 4px solid #3b82f6; background: rgba(59,130,246,0.06);
      border-radius: 0 8px 8px 0; padding: 0.75em 1em; margin: 1.25em 0;
    }
    div[data-admonition-color="blue"] { border-left-color: #3b82f6; background: rgba(59,130,246,0.06); }
    div[data-admonition-color="green"] { border-left-color: #22c55e; background: rgba(34,197,94,0.06); }
    div[data-admonition-color="yellow"] { border-left-color: #eab308; background: rgba(234,179,8,0.06); }
    div[data-admonition-color="red"] { border-left-color: #ef4444; background: rgba(239,68,68,0.06); }
    div[data-admonition-color="purple"] { border-left-color: #a855f7; background: rgba(168,85,247,0.06); }
    div[data-admonition-color="orange"] { border-left-color: #f97316; background: rgba(249,115,22,0.06); }
    div[data-admonition-color="teal"] { border-left-color: #14b8a6; background: rgba(20,184,166,0.06); }
    div[data-admonition-color="gray"] { border-left-color: #6b7280; background: rgba(107,114,128,0.06); }
    /* Footnotes */
    span[data-type="footnote-ref"] { vertical-align: super; font-size: 0.75em; font-weight: 600; color: #2563eb; cursor: pointer; }
    div[data-type="footnote-item"] { border-top: 1px solid #e5e7eb; padding: 0.5em 0; font-size: 0.9em; color: #6b7280; }
    div[data-type="footnote-item"]:first-of-type { margin-top: 2em; }
    @media (max-width: 640px) {
      body { padding: 1.5rem 1rem; font-size: 15px; }
      h1 { font-size: 1.75em; }
    }
    @media print {
      body { background: white; padding: 0; }
      pre { background: #f5f5f5; color: #1a1a1a; }
    }
  </style>
</head>
<body>
${editorHtml}
</body>
</html>`;
    downloadFile(fullHtml, ".html", "text/html");
    toast.success("완전한 HTML 페이지로 내보냈습니다");
  }, [activeDoc, downloadFile]);

  const getEditorHtmlForPrint = useCallback(() => {
    if (activeDoc.mode === "latex") {
      return document.querySelector(".prose")?.innerHTML || "";
    }
    return document.querySelector(".tiptap-editor .ProseMirror")?.innerHTML || "";
  }, [activeDoc.mode]);

  const buildPrintHtml = useCallback((content: string) => {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeDoc.name || "Untitled"}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<style>@media print{body{margin:0;padding:40px;background:white!important;color:black!important}*{color-adjust:exact;-webkit-print-color-adjust:exact}}body{max-width:800px;margin:0 auto;padding:40px;font-family:'Inter','Noto Sans KR',sans-serif;font-size:14px;line-height:1.7;color:#1a1a1a;background:white}h1{font-size:2em;font-weight:700;margin:1.5em 0 .5em}h2{font-size:1.5em;font-weight:600;margin:1.2em 0 .4em}h3{font-size:1.25em;font-weight:600;margin:1em 0 .3em}p{margin:.5em 0}ul,ol{padding-left:1.5em;margin:.5em 0}blockquote{border-left:3px solid #ddd;padding-left:1em;color:#666;margin:1em 0}code{background:#f5f5f5;padding:.15em .4em;border-radius:3px;font-size:.9em}pre{background:#f5f5f5;padding:1em;border-radius:6px;overflow-x:auto}pre code{background:none;padding:0}table{border-collapse:collapse;width:100%;margin:1em 0}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f9f9f9;font-weight:600}img{max-width:100%;height:auto;margin:1em 0}hr{border:none;border-top:1px solid #ddd;margin:1.5em 0}mark{background:#fff3bf;padding:.1em .2em;border-radius:2px}a{color:#1971c2}</style></head><body>${content}</body></html>`;
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
      const name = file.name.replace(/\.(md|tex|txt|html|htm|json|yaml|yml)$/, "");
      let mode: EditorMode = "markdown";
      if (file.name.endsWith(".tex")) mode = "latex";
      else if (file.name.endsWith(".html") || file.name.endsWith(".htm")) mode = "html";
      else if (file.name.endsWith(".json")) mode = "json";
      else if (file.name.endsWith(".yaml") || file.name.endsWith(".yml")) mode = "yaml";
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

  useEffect(() => {
    const saved = loadSavedData();
    if (saved?.documents?.length) {
      toast.info("이전 작업이 복원되었습니다", { duration: 2000 });
    }
  }, []);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="h-screen flex w-full">
        <FileSidebar
          documents={documents}
          activeDocId={activeDocId}
          onSelectDoc={handleSelectDoc}
          onNewDoc={handleNewDoc}
          onDeleteDoc={handleDeleteDoc}
          onRenameDoc={handleRenameDoc}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <EditorHeader
            isDark={isDark}
            onToggleTheme={() => setIsDark((d) => !d)}
            onSaveMd={handleSaveMd}
            onSaveTex={handleSaveTex}
            onSaveHtml={handleSaveHtml}
            onSaveJson={handleSaveJson}
            onSaveYaml={handleSaveYaml}
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
            onNewDoc={() => handleNewDoc()}
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
            ) : activeDoc.mode === "json" || activeDoc.mode === "yaml" ? (
              <JsonYamlEditor
                key={editorKey}
                initialContent={activeDoc.content}
                onContentChange={handleContentChange}
                mode={activeDoc.mode}
                onModeChange={(m) => handleModeChange(m)}
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
            accept=".md,.markdown,.txt,.tex,.html,.htm,.json,.yaml,.yml"
            className="hidden"
            onChange={handleFileChange}
          />
          <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
