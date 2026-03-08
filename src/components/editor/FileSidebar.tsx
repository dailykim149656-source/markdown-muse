import { useState } from "react";
import { FileText, FilePlus, Trash2, Pencil, Check, X, FileCode, FileType, FolderOpen, Clock, FileJson, Braces, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import type { DocumentData } from "./useAutoSave";

interface FileSidebarProps {
  documents: DocumentData[];
  activeDocId: string;
  onSelectDoc: (id: string) => void;
  onNewDoc: (mode?: "markdown" | "latex" | "html" | "json" | "yaml") => void;
  onDeleteDoc: (id: string) => void;
  onRenameDoc: (id: string, name: string) => void;
  onOpenTemplates?: () => void;
}

const modeIcon = (mode: string) => {
  switch (mode) {
    case "latex": return FileCode;
    case "html": return FileType;
    case "json": return FileJson;
    case "yaml": return Braces;
    default: return FileText;
  }
};

const modeExt = (mode: string) => {
  switch (mode) {
    case "latex": return ".tex";
    case "html": return ".html";
    case "json": return ".json";
    case "yaml": return ".yaml";
    default: return ".md";
  }
};

const formatDate = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  if (diff < 60000) return "방금 전";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  if (d.toDateString() === now.toDateString()) return "오늘";
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const FileSidebar = ({ documents, activeDocId, onSelectDoc, onNewDoc, onDeleteDoc, onRenameDoc, onOpenTemplates }: FileSidebarProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const startRename = (doc: DocumentData) => {
    setEditingId(doc.id);
    setEditName(doc.name);
  };

  const confirmRename = () => {
    if (editingId && editName.trim()) {
      onRenameDoc(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const sorted = [...documents].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground group-data-[collapsible=icon]:hidden">파일 탐색기</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] group-data-[collapsible=icon]:hidden">
            문서 ({documents.length})
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <SidebarMenu>
                {sorted.map((doc) => {
                  const Icon = modeIcon(doc.mode);
                  const isActive = doc.id === activeDocId;
                  const isEditing = editingId === doc.id;

                  return (
                    <SidebarMenuItem key={doc.id}>
                      <SidebarMenuButton
                        className={`group/item w-full ${isActive ? "bg-accent text-accent-foreground" : ""}`}
                        onClick={() => !isEditing && onSelectDoc(doc.id)}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                          {isEditing ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-5 text-xs px-1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") confirmRename();
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                              />
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={confirmRename}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setEditingId(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="text-xs truncate font-medium">
                                  {doc.name || "Untitled"}
                                  <span className="text-muted-foreground/60 ml-0.5">{modeExt(doc.mode)}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  {formatDate(doc.updatedAt)}
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <button
                                  className="p-0.5 rounded hover:bg-secondary"
                                  onClick={(e) => { e.stopPropagation(); startRename(doc); }}
                                  title="이름 변경"
                                >
                                  <Pencil className="h-3 w-3 text-muted-foreground" />
                                </button>
                                {documents.length > 1 && (
                                  <button
                                    className="p-0.5 rounded hover:bg-destructive/10"
                                    onClick={(e) => { e.stopPropagation(); onDeleteDoc(doc.id); }}
                                    title="삭제"
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 group-data-[collapsible=icon]:p-1">
        <Separator className="mb-2 group-data-[collapsible=icon]:hidden" />
        <div className="flex flex-col gap-1 group-data-[collapsible=icon]:items-center">
          {onOpenTemplates && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 justify-start text-xs gap-1.5 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center mb-1"
              onClick={onOpenTemplates}
              title="템플릿으로 새 문서"
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              <span className="group-data-[collapsible=icon]:hidden">템플릿</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 justify-start text-xs gap-1.5 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center" onClick={() => onNewDoc("markdown")} title="새 마크다운">
            <FilePlus className="h-3.5 w-3.5" />
            <span className="group-data-[collapsible=icon]:hidden">새 마크다운</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 justify-start text-xs gap-1.5 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center" onClick={() => onNewDoc("latex")} title="새 LaTeX">
            <FileCode className="h-3.5 w-3.5" />
            <span className="group-data-[collapsible=icon]:hidden">새 LaTeX</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 justify-start text-xs gap-1.5 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center" onClick={() => onNewDoc("html")} title="새 HTML">
            <FileType className="h-3.5 w-3.5" />
            <span className="group-data-[collapsible=icon]:hidden">새 HTML</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 justify-start text-xs gap-1.5 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center" onClick={() => onNewDoc("json")} title="새 JSON">
            <FileJson className="h-3.5 w-3.5" />
            <span className="group-data-[collapsible=icon]:hidden">새 JSON</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 justify-start text-xs gap-1.5 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center" onClick={() => onNewDoc("yaml")} title="새 YAML">
            <Braces className="h-3.5 w-3.5" />
            <span className="group-data-[collapsible=icon]:hidden">새 YAML</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default FileSidebar;
