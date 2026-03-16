import type { NavigatorGoalSuggestion } from "@/types/visualNavigator";

const RECENT_GOALS_STORAGE_KEY = "docsy:visual-navigator:recent-goals";
const MAX_RECENT_GOALS = 5;

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const normalizeRecentGoal = (goal: NavigatorGoalSuggestion): NavigatorGoalSuggestion | null => {
  const intent = goal.intent.trim();
  const label = goal.label.trim();

  if (!intent || !label) {
    return null;
  }

  return {
    confidence: goal.confidence,
    intent,
    label,
    rationale: goal.rationale.trim() || "Recent visual navigation goal.",
  };
};

export const readRecentNavigatorGoals = (): NavigatorGoalSuggestion[] => {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(RECENT_GOALS_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((goal) => normalizeRecentGoal(goal as NavigatorGoalSuggestion))
      .filter((goal): goal is NavigatorGoalSuggestion => Boolean(goal))
      .slice(0, MAX_RECENT_GOALS);
  } catch {
    return [];
  }
};

const writeRecentNavigatorGoals = (goals: NavigatorGoalSuggestion[]) => {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(RECENT_GOALS_STORAGE_KEY, JSON.stringify(goals.slice(0, MAX_RECENT_GOALS)));
  } catch {
    // noop
  }
};

export const recordRecentNavigatorGoal = (
  goal: NavigatorGoalSuggestion,
): NavigatorGoalSuggestion[] => {
  const normalizedGoal = normalizeRecentGoal(goal);

  if (!normalizedGoal) {
    return readRecentNavigatorGoals();
  }

  const current = readRecentNavigatorGoals();
  const next = [
    normalizedGoal,
    ...current.filter((existingGoal) => existingGoal.intent.toLowerCase() !== normalizedGoal.intent.toLowerCase()),
  ].slice(0, MAX_RECENT_GOALS);

  writeRecentNavigatorGoals(next);
  return next;
};

export {
  MAX_RECENT_GOALS,
  RECENT_GOALS_STORAGE_KEY,
};
