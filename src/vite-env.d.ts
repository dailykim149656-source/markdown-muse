/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_API_BASE_URL?: string;
  readonly VITE_APP_BUILD_ID?: string;
  readonly VITE_APP_PROFILE?: "desktop" | "web";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
