export const FRONTEND_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID?.trim() || "local-dev";

declare global {
  interface Window {
    __docsyRuntime?: {
      frontendBuildId: string;
    };
  }
}
