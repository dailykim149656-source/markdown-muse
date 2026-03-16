import type { JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import type { MutableRefObject } from "react";
import { recordAutosaveDebugEvent } from "@/lib/documents/autosaveDebug";

type SeedContent = JSONContent | string | null | undefined;

const normalizeHtml = (value: string) =>
  value
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();

export const hasSeedContent = (value: SeedContent) =>
  typeof value === "string"
    ? value.trim().length > 0
    : Boolean(value);

export const getSeedSignature = (value: SeedContent) => {
  if (!hasSeedContent(value)) {
    return null;
  }

  return typeof value === "string"
    ? `html:${normalizeHtml(value)}`
    : `json:${JSON.stringify(value)}`;
};

export const getEditorSignature = (editor: Editor, seedContent: SeedContent) =>
  typeof seedContent === "string"
    ? `html:${normalizeHtml(editor.getHTML())}`
    : `json:${JSON.stringify(editor.getJSON())}`;

export const applyEditorSeed = ({
  editor,
  nextContent,
  onHtmlChange,
  onTiptapChange,
  seedSignatureRef,
}: {
  editor: Editor;
  nextContent: SeedContent;
  onHtmlChange?: (html: string) => void;
  onTiptapChange?: (document: JSONContent | null) => void;
  seedSignatureRef: MutableRefObject<string | null>;
}) => {
  const nextSignature = getSeedSignature(nextContent);

  if (!nextSignature) {
    seedSignatureRef.current = null;
    return false;
  }

  if (seedSignatureRef.current === nextSignature) {
    return false;
  }

  if (getEditorSignature(editor, nextContent) === nextSignature) {
    seedSignatureRef.current = nextSignature;
    return false;
  }

  editor.commands.setContent(nextContent, { emitUpdate: false });
  onHtmlChange?.(editor.getHTML());
  onTiptapChange?.(editor.getJSON());
  seedSignatureRef.current = nextSignature;
  recordAutosaveDebugEvent("seed_apply", {
    contentKind: typeof nextContent === "string" ? "html" : "json",
    signature: nextSignature,
  });
  return true;
};
