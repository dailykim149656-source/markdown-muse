import type { Locale } from "../../../src/i18n/types";
import type { NavigatorGoalSuggestionRequest, NavigatorHistoryEntry } from "../../../src/types/visualNavigator";

const localePromptSuffix = (locale: Locale) => (locale === "ko" ? "Respond in Korean." : "Respond in English.");

const condenseHistory = (history: NavigatorHistoryEntry[]) =>
  history.map((entry) => ({
    action: entry.action.type,
    outcome: entry.outcome,
    target: entry.targetDescription,
  }));

export const buildGoalSuggestionPrompt = (
  request: NavigatorGoalSuggestionRequest,
  locale: Locale,
) => `
You are choosing likely next goals for the Docsy Visual Navigator.
Return strict JSON matching the provided schema.
${localePromptSuffix(locale)}

Your job:
- Look at the current visible Docsy UI.
- Suggest 3 to 5 short, user-selectable goals that would make sense from this screen.
- These are high-level goals such as "Open Google Workspace" or "Open Patch Review", not low-level clicks.

Critical rules:
- The screenshot is the primary source of truth. UI hints are secondary and may be stale or incomplete.
- Work only inside the visible Docsy browser UI.
- Do not suggest arbitrary websites, desktop apps, or destructive actions.
- Prefer goals that can usually be completed in 1 to 4 bounded browser actions.
- Do not suggest a surface that is already visibly open.
- Keep labels short and scan-friendly.
- Keep intents concrete and executable.
- Avoid duplicate suggestions.

Good examples:
- Open Google Workspace
- Open Patch Review
- Switch to HTML
- Switch to LaTeX
- Review the latest patch

Bad examples:
- Click the third button
- Improve the document
- Rewrite the entire workflow
- Open another application

Current route:
${request.ui.route}

Focused element:
${request.ui.focusedElement || "none"}

Open modal state:
${JSON.stringify(request.ui.modals, null, 2)}

Visible stable targets:
${JSON.stringify(request.ui.visibleTargets, null, 2)}

Recent execution history:
${JSON.stringify(condenseHistory(request.recentHistory))}
`.trim();
