import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { FRONTEND_BUILD_ID } from "./lib/runtime/buildInfo";
import "./index.css";

window.__docsyRuntime = {
  frontendBuildId: FRONTEND_BUILD_ID,
};
console.info(`[Docsy] Frontend build=${FRONTEND_BUILD_ID}`);

createRoot(document.getElementById("root")!).render(<App />);
