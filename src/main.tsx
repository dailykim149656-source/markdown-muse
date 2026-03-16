import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { FRONTEND_BUILD_ID } from "./lib/runtime/buildInfo";
import { initializeAutosaveRuntime } from "./lib/documents/autosaveDebug";
import "./index.css";

window.__docsyRuntime = initializeAutosaveRuntime(FRONTEND_BUILD_ID);
console.info(`[Docsy] Frontend build=${FRONTEND_BUILD_ID} boot=${window.__docsyRuntime.bootId} navigation=${window.__docsyRuntime.navigationType}`);

createRoot(document.getElementById("root")!).render(<App />);
