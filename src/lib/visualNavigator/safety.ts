import type { NavigatorAction } from "@/types/visualNavigator";

const HIGH_IMPACT_PATTERN = /\b(delete|remove|reset|publish|overwrite|discard|disconnect|export)\b/i;

const getActionText = (action: NavigatorAction) => {
  switch (action.type) {
    case "click":
      return [
        action.target.dataTarget,
        action.target.name,
        action.target.text,
      ].filter(Boolean).join(" ");
    case "type":
      return [action.target.name, action.target.text, action.text].filter(Boolean).join(" ");
    case "press_key":
      return action.key;
    case "ask_followup":
      return action.question;
    case "done":
      return action.summary;
    default:
      return "";
  }
};

export const getNavigatorConfirmationReason = ({
  action,
  resolvedTargetDescription,
}: {
  action: NavigatorAction;
  resolvedTargetDescription?: string;
}) => {
  if (action.type !== "click" && action.type !== "type" && action.type !== "press_key") {
    return null;
  }

  const combined = `${getActionText(action)} ${resolvedTargetDescription || ""}`.trim();

  if (!combined) {
    return null;
  }

  return HIGH_IMPACT_PATTERN.test(combined)
    ? "This action looks high-impact and needs confirmation before Docsy executes it."
    : null;
};
