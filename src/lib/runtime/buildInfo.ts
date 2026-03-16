export const FRONTEND_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID?.trim() || "local-dev";

export type RuntimeNavigationType = "navigate" | "reload" | "back_forward" | "prerender" | "unknown";

export interface DocsyRuntimeInfo {
  bootId: string;
  bootedAt: number;
  frontendBuildId: string;
  href: string;
  hasPreviousBootInTab?: boolean;
  initialVisibilityState?: DocumentVisibilityState | "unknown";
  navigationType: RuntimeNavigationType;
  pageshowPersisted?: boolean | null;
  previousFrontendBuildId?: string | null;
  referrer: string;
}

declare global {
  interface Window {
    __docsyRuntime?: DocsyRuntimeInfo;
  }
}
