export type AppProfile = "desktop" | "web";

export interface FeatureFlags {
  advancedBlocksOnInitialMount: boolean;
  aiOnInitialMount: boolean;
  documentToolsOnInitialMount: boolean;
  historyOnInitialMount: boolean;
  knowledgeOnInitialMount: boolean;
  profile: AppProfile;
  structuredModesVisibleOnInitialMount: boolean;
  structuredIoOnInitialMount: boolean;
}

const resolveProfile = (): AppProfile => {
  const configured = import.meta.env.VITE_APP_PROFILE?.trim().toLowerCase();
  return configured === "web" ? "web" : "desktop";
};

export const appProfile = resolveProfile();

export const featureFlags: FeatureFlags = {
  advancedBlocksOnInitialMount: false,
  aiOnInitialMount: false,
  documentToolsOnInitialMount: false,
  historyOnInitialMount: false,
  knowledgeOnInitialMount: false,
  profile: appProfile,
  structuredModesVisibleOnInitialMount: appProfile !== "web",
  structuredIoOnInitialMount: appProfile !== "web",
};

export const isWebProfile = appProfile === "web";
