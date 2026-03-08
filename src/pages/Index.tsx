import { useState, useCallback, useRef, useEffect } from "react";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import LatexEditor from "@/components/editor/LatexEditor";
import EditorHeader, { type EditorMode } from "@/components/editor/EditorHeader";

const Index = () => {
  const [isDark, setIsDark] = useState(false);
  const [fileName, setFileName] = useState("Untitled");
  const [markdown, setMarkdown] = useState("");
  const [latexSource, setLatexSource] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadedContent, setLoadedContent] = useState<string | undefined>(undefined);
  const [editorKey, setEditorKey] = useState(0);
  const [mode, setMode] = useState<EditorMode>("markdown");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const handleContentChange = useCallback((md: string) => {
    setMarkdown(md);
    const text = md.replace(/[#*_~`>\-\[\]()!|]/g, "").trim();
    setWordCount(text.length);
  }, []);

  const handleLatexChange = useCallback((tex: string) => {
    setLatexSource(tex);
    const text = tex.replace(/\\[a-zA-Z]+\{?[^}]*\}?/g, "").replace(/[{}\\$%&]/g, "").trim();
    setWordCount(text.length);
  }, []);

  const handleSaveMd = useCallback(() => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName || "Untitled"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [markdown, fileName]);

  const handleSaveTex = useCallback(() => {
    const content = mode === "latex" ? latexSource : markdown;
    const blob = new Blob([content], { type: "application/x-tex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName || "Untitled"}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  }, [latexSource, markdown, fileName, mode]);

  const getEditorHtmlForPrint = useCallback(() => {
    if (mode === "latex") {
      const previewEl = document.querySelector(".prose");
      return previewEl?.innerHTML || "";
    }
    const editorEl = document.querySelector(".tiptap-editor .ProseMirror");
    return editorEl?.innerHTML || "";
  }, [mode]);

  const buildPrintHtml = useCallback((content: string) => {
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join("\n");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${fileName || "Untitled"}</title>
  ${styles}
  <style>
    @media print {
      body { margin: 0; padding: 40px; background: white !important; color: black !important; font-family: 'Inter', 'Noto Sans KR', sans-serif; }
      * { color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
    body { max-width: 800px; margin: 0 auto; padding: 40px; font-family: 'Inter', 'Noto Sans KR', sans-serif; font-size: 14px; line-height: 1.7; color: #1a1a1a; background: white; }
    h1 { font-size: 2em; font-weight: 700; margin: 1.5em 0 0.5em; }
    h2 { font-size: 1.5em; font-weight: 600; margin: 1.2em 0 0.4em; }
    h3 { font-size: 1.25em; font-weight: 600; margin: 1em 0 0.3em; }
    p { margin: 0.5em 0; }
    ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
    blockquote { border-left: 3px solid #ddd; padding-left: 1em; color: #666; margin: 1em 0; }
    code { background: #f5f5f5; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f5f5f5; padding: 1em; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f9f9f9; font-weight: 600; }
    img { max-width: 100%; height: auto; margin: 1em 0; }
    hr { border: none; border-top: 1px solid #ddd; margin: 1.5em 0; }
    mark { background: #fff3bf; padding: 0.1em 0.2em; border-radius: 2px; }
    a { color: #1971c2; }
  </style>
</head>
<body>${content}</body>
</html>`;
  }, [fileName]);

  const handleSavePdf = useCallback(() => {
    const content = getEditorHtmlForPrint();
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(buildPrintHtml(content));
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  }, [getEditorHtmlForPrint, buildPrintHtml]);

  const handlePrint = useCallback(() => {
    const content = getEditorHtmlForPrint();
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(buildPrintHtml(content));
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  }, [getEditorHtmlForPrint, buildPrintHtml]);

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const name = file.name.replace(/\.(md|tex|txt)$/, "");
      setFileName(name);

      if (file.name.endsWith(".tex")) {
        setMode("latex");
        setLatexSource(content);
      } else {
        setMode("markdown");
        setLoadedContent(content);
        setEditorKey((k) => k + 1);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      <EditorHeader
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onSaveMd={handleSaveMd}
        onSaveTex={handleSaveTex}
        onSavePdf={handleSavePdf}
        onPrint={handlePrint}
        onLoad={handleLoad}
        fileName={fileName}
        onFileNameChange={setFileName}
        wordCount={wordCount}
        mode={mode}
        onModeChange={setMode}
      />
      <div className="flex-1 overflow-hidden">
        {mode === "markdown" ? (
          <MarkdownEditor
            key={editorKey}
            onContentChange={handleContentChange}
            initialContent={loadedContent}
          />
        ) : (
          <LatexEditor
            initialContent={latexSource}
            onContentChange={handleLatexChange}
          />
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,.tex"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default Index;
