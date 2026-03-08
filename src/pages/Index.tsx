import { useState, useCallback, useRef, useEffect } from "react";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import EditorHeader from "@/components/editor/EditorHeader";

const Index = () => {
  const [isDark, setIsDark] = useState(false);
  const [fileName, setFileName] = useState("Untitled");
  const [markdown, setMarkdown] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadedContent, setLoadedContent] = useState<string | undefined>(undefined);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const handleContentChange = useCallback((md: string) => {
    setMarkdown(md);
    const text = md.replace(/[#*_~`>\-\[\]()!|]/g, "").trim();
    setWordCount(text.length);
  }, []);

  const handleSave = useCallback(() => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName || "Untitled"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [markdown, fileName]);

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setLoadedContent(content);
      setEditorKey((k) => k + 1);
      setFileName(file.name.replace(/\.md$/, ""));
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      <EditorHeader
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onSave={handleSave}
        onLoad={handleLoad}
        fileName={fileName}
        onFileNameChange={setFileName}
        wordCount={wordCount}
      />
      <div className="flex-1 overflow-hidden">
        <MarkdownEditor
          key={editorKey}
          onContentChange={handleContentChange}
          initialContent={loadedContent}
        />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default Index;
