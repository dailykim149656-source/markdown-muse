export { summarizeDocument, generateSection, generateToc, proposeEditorAction } from "@/lib/ai/assistantClient";
export { summarizeAutosaveDiff } from "@/lib/ai/autosaveSummaryClient";
export { liveAgentTurn } from "@/lib/ai/liveAgentClient";
export { navigateVisualUi, suggestVisualNavigatorGoals } from "@/lib/ai/visualNavigatorClient";
export { fixTexCompileError } from "@/lib/ai/texAutoFixClient";
export { getTexHealth, validateTex, previewTex, exportTexPdf } from "@/lib/ai/texClient";
