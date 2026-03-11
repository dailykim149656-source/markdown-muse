import type { EditorMode } from "@/types/document";

export type EditorModeFamily = "richText" | "structured";

export const RICH_TEXT_MODES: EditorMode[] = ["markdown", "latex", "html"];
export const STRUCTURED_MODES: EditorMode[] = ["json", "yaml"];

export const getEditorModeFamily = (mode: EditorMode): EditorModeFamily =>
  mode === "json" || mode === "yaml" ? "structured" : "richText";

export const getSameFamilyModes = (mode: EditorMode): EditorMode[] =>
  getEditorModeFamily(mode) === "richText" ? RICH_TEXT_MODES : STRUCTURED_MODES;

export const getCrossFamilyModes = (mode: EditorMode): EditorMode[] =>
  getEditorModeFamily(mode) === "richText" ? STRUCTURED_MODES : RICH_TEXT_MODES;

export const canSwitchModeWithinDocument = (fromMode: EditorMode, toMode: EditorMode) =>
  getEditorModeFamily(fromMode) === getEditorModeFamily(toMode);
