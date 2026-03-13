import { useEffect } from "react";
import { useDocumentIO } from "@/hooks/useDocumentIO";
import type { CreateDocumentOptions, DocumentData, DocumentVersionSnapshotMetadata } from "@/types/document";
import type { DocumentPatchSet } from "@/types/documentPatch";

export interface DocumentIORuntimeState {
  fileInputRef: ReturnType<typeof useDocumentIO>["fileInputRef"];
  handleCopyHtml: ReturnType<typeof useDocumentIO>["handleCopyHtml"];
  handleCopyJson: ReturnType<typeof useDocumentIO>["handleCopyJson"];
  handleCopyMd: ReturnType<typeof useDocumentIO>["handleCopyMd"];
  handleCopyShareLink: ReturnType<typeof useDocumentIO>["handleCopyShareLink"];
  handleCopyYaml: ReturnType<typeof useDocumentIO>["handleCopyYaml"];
  handleFileChange: ReturnType<typeof useDocumentIO>["handleFileChange"];
  handleLoad: ReturnType<typeof useDocumentIO>["handleLoad"];
  handlePrint: ReturnType<typeof useDocumentIO>["handlePrint"];
  handleSaveAdoc: ReturnType<typeof useDocumentIO>["handleSaveAdoc"];
  handleSaveDocsy: ReturnType<typeof useDocumentIO>["handleSaveDocsy"];
  handleSaveHtml: ReturnType<typeof useDocumentIO>["handleSaveHtml"];
  handleSaveJson: ReturnType<typeof useDocumentIO>["handleSaveJson"];
  handleSaveMd: ReturnType<typeof useDocumentIO>["handleSaveMd"];
  handleSavePdf: ReturnType<typeof useDocumentIO>["handleSavePdf"];
  handleSaveRst: ReturnType<typeof useDocumentIO>["handleSaveRst"];
  handleSaveTex: ReturnType<typeof useDocumentIO>["handleSaveTex"];
  handleSaveTypst: ReturnType<typeof useDocumentIO>["handleSaveTypst"];
  handleSaveYaml: ReturnType<typeof useDocumentIO>["handleSaveYaml"];
  importState: ReturnType<typeof useDocumentIO>["importState"];
  prepareShareLink: ReturnType<typeof useDocumentIO>["prepareShareLink"];
  shareLinkInfo: ReturnType<typeof useDocumentIO>["shareLinkInfo"];
}

interface DocumentIORuntimeProps {
  activeDoc: DocumentData;
  createDocument: (options?: CreateDocumentOptions) => void;
  documents: DocumentData[];
  getRenderableLatexDocument: () => Promise<string>;
  getRenderableMarkdown: () => Promise<string>;
  onPatchSetLoad: (patchSet: DocumentPatchSet) => void;
  onStateChange: (state: DocumentIORuntimeState | null) => void;
  onVersionSnapshot: (metadata?: DocumentVersionSnapshotMetadata) => Promise<unknown> | unknown;
  renderableEditorHtml: string;
  renderableLatexDocument: string;
  renderableMarkdown: string;
}

const DocumentIORuntime = ({
  activeDoc,
  createDocument,
  documents,
  getRenderableLatexDocument,
  getRenderableMarkdown,
  onPatchSetLoad,
  onStateChange,
  onVersionSnapshot,
  renderableEditorHtml,
  renderableLatexDocument,
  renderableMarkdown,
}: DocumentIORuntimeProps) => {
  const io = useDocumentIO({
    activeDoc,
    createDocument,
    documents,
    getRenderableLatexDocument,
    getRenderableMarkdown,
    onPatchSetLoad,
    onVersionSnapshot,
    renderableEditorHtml,
    renderableLatexDocument,
    renderableMarkdown,
  });

  useEffect(() => {
    onStateChange({
      fileInputRef: io.fileInputRef,
      handleCopyHtml: io.handleCopyHtml,
      handleCopyJson: io.handleCopyJson,
      handleCopyMd: io.handleCopyMd,
      handleCopyShareLink: io.handleCopyShareLink,
      handleCopyYaml: io.handleCopyYaml,
      handleFileChange: io.handleFileChange,
      handleLoad: io.handleLoad,
      handlePrint: io.handlePrint,
      handleSaveAdoc: io.handleSaveAdoc,
      handleSaveDocsy: io.handleSaveDocsy,
      handleSaveHtml: io.handleSaveHtml,
      handleSaveJson: io.handleSaveJson,
      handleSaveMd: io.handleSaveMd,
      handleSavePdf: io.handleSavePdf,
      handleSaveRst: io.handleSaveRst,
      handleSaveTex: io.handleSaveTex,
      handleSaveTypst: io.handleSaveTypst,
      handleSaveYaml: io.handleSaveYaml,
      importState: io.importState,
      prepareShareLink: io.prepareShareLink,
      shareLinkInfo: io.shareLinkInfo,
    });
  }, [
    io.fileInputRef,
    io.handleCopyHtml,
    io.handleCopyJson,
    io.handleCopyMd,
    io.handleCopyShareLink,
    io.handleCopyYaml,
    io.handleFileChange,
    io.handleLoad,
    io.handlePrint,
    io.handleSaveAdoc,
    io.handleSaveDocsy,
    io.handleSaveHtml,
    io.handleSaveJson,
    io.handleSaveMd,
    io.handleSavePdf,
    io.handleSaveRst,
    io.handleSaveTex,
    io.handleSaveTypst,
    io.handleSaveYaml,
    io.importState,
    io.prepareShareLink,
    io.shareLinkInfo,
    onStateChange,
  ]);

  useEffect(() => () => onStateChange(null), [onStateChange]);

  return null;
};

export default DocumentIORuntime;
