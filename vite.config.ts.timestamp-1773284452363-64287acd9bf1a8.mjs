// vite.config.ts
import { defineConfig } from "file:///F:/Docsy-document_editor/markdown-muse/node_modules/vite/dist/node/index.js";
import react from "file:///F:/Docsy-document_editor/markdown-muse/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { gzipSync } from "node:zlib";
import { componentTagger } from "file:///F:/Docsy-document_editor/markdown-muse/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "F:\\Docsy-document_editor\\markdown-muse";
var matchesPackage = (id, packageNames) => packageNames.some((packageName) => {
  const posixName = packageName.replaceAll("/", path.posix.sep);
  const windowsName = packageName.replaceAll("/", path.win32.sep);
  return id.includes(`${path.posix.sep}node_modules${path.posix.sep}${posixName}${path.posix.sep}`) || id.includes(`${path.win32.sep}node_modules${path.win32.sep}${windowsName}${path.win32.sep}`);
});
var matchesSource = (id, sourceFragments) => sourceFragments.some((fragment) => {
  const posixFragment = fragment.replaceAll("/", path.posix.sep);
  const windowsFragment = fragment.replaceAll("/", path.win32.sep);
  return id.includes(posixFragment) || id.includes(windowsFragment);
});
var shouldIgnoreChunkRelocationWarning = (message) => message.includes("dynamic import will not move module into another chunk") && [
  "src/components/editor/GraphExplorerDialog.tsx",
  "src/lib/ast/documentIndex.ts",
  "src/lib/ai/compareDocuments.ts",
  "src/lib/ast/renderAstToHtml.ts",
  "src/lib/ast/tiptapAst.ts",
  "src/lib/ast/renderAstToLatex.ts",
  "src/lib/ast/renderAstToMarkdown.ts"
].some((fragment) => message.includes(fragment));
var bundleReportPlugin = () => ({
  generateBundle(_options, bundle) {
    const assets = Object.values(bundle).filter((entry) => entry.type === "asset" || entry.type === "chunk").map((entry) => {
      const content = entry.type === "chunk" ? Buffer.from(entry.code || "") : typeof entry.source === "string" ? Buffer.from(entry.source) : entry.source ? Buffer.from(entry.source) : Buffer.alloc(0);
      const size = content.byteLength;
      const gzipSize = gzipSync(content).byteLength;
      return {
        fileName: entry.fileName,
        gzipSize,
        size,
        type: entry.type
      };
    }).sort((left, right) => right.size - left.size);
    this.emitFile({
      fileName: "bundle-report.json",
      source: JSON.stringify({ assets }, null, 2),
      type: "asset"
    });
  }
});
var vite_config_default = defineConfig(({ mode }) => {
  const profile = mode === "web" ? "web" : "desktop";
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false
      }
    },
    plugins: [react(), bundleReportPlugin(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    },
    build: {
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          if (shouldIgnoreChunkRelocationWarning(warning.message || "")) {
            return;
          }
          defaultHandler(warning);
        },
        output: {
          manualChunks(id) {
            if (matchesSource(id, [
              "src/components/editor/FileSidebarKnowledgePanels.tsx",
              "src/components/editor/WorkspaceGraphPanel.tsx",
              "src/components/editor/GraphExplorerDialog.tsx",
              "src/hooks/useKnowledgeBase.ts",
              "src/lib/knowledge/"
            ])) {
              return "knowledge";
            }
            if (matchesSource(id, [
              "src/components/editor/FileSidebarHistoryPanels.tsx",
              "src/lib/history/",
              "src/lib/analysis/formatConsistency.ts"
            ])) {
              return "history";
            }
            if (matchesSource(id, [
              "src/hooks/useAiAssistant.ts",
              "src/lib/ai/"
            ])) {
              return "ai";
            }
            if (matchesSource(id, [
              "src/components/editor/ShareLinkDialog.tsx"
            ])) {
              return "share";
            }
            if (profile === "web" && matchesSource(id, [
              "src/components/editor/TemplateDialog.tsx",
              "src/components/editor/PatchReviewDialog.tsx"
            ])) {
              return "editor-aux";
            }
            if (!id.includes("node_modules")) {
              return;
            }
            if (matchesPackage(id, ["katex"])) {
              return "math-vendor";
            }
            if (matchesPackage(id, ["js-yaml"])) {
              return "structured-io";
            }
            if (matchesPackage(id, ["qrcode"])) {
              return "share";
            }
            if (matchesPackage(id, ["@tiptap"])) {
              return "tiptap-vendor";
            }
            if (matchesPackage(id, ["prosemirror"])) {
              return "prosemirror-vendor";
            }
            if (matchesPackage(id, ["lowlight", "highlight.js"])) {
              return "syntax-vendor";
            }
            if (matchesPackage(id, ["recharts"])) {
              return "graph-vendor";
            }
            if (matchesPackage(id, ["@radix-ui", "vaul", "cmdk", "lucide-react"])) {
              return "ui-vendor";
            }
            if (matchesPackage(id, ["framer-motion"])) {
              return "motion-vendor";
            }
            if (matchesPackage(id, ["react", "react-dom", "react-router", "react-router-dom", "@tanstack"])) {
              return "react-vendor";
            }
          }
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJGOlxcXFxEb2NzeS1kb2N1bWVudF9lZGl0b3JcXFxcbWFya2Rvd24tbXVzZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRjpcXFxcRG9jc3ktZG9jdW1lbnRfZWRpdG9yXFxcXG1hcmtkb3duLW11c2VcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Y6L0RvY3N5LWRvY3VtZW50X2VkaXRvci9tYXJrZG93bi1tdXNlL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgZ3ppcFN5bmMgfSBmcm9tIFwibm9kZTp6bGliXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuY29uc3QgbWF0Y2hlc1BhY2thZ2UgPSAoaWQ6IHN0cmluZywgcGFja2FnZU5hbWVzOiBzdHJpbmdbXSkgPT5cbiAgcGFja2FnZU5hbWVzLnNvbWUoKHBhY2thZ2VOYW1lKSA9PiB7XG4gICAgY29uc3QgcG9zaXhOYW1lID0gcGFja2FnZU5hbWUucmVwbGFjZUFsbChcIi9cIiwgcGF0aC5wb3NpeC5zZXApO1xuICAgIGNvbnN0IHdpbmRvd3NOYW1lID0gcGFja2FnZU5hbWUucmVwbGFjZUFsbChcIi9cIiwgcGF0aC53aW4zMi5zZXApO1xuXG4gICAgcmV0dXJuIChcbiAgICAgIGlkLmluY2x1ZGVzKGAke3BhdGgucG9zaXguc2VwfW5vZGVfbW9kdWxlcyR7cGF0aC5wb3NpeC5zZXB9JHtwb3NpeE5hbWV9JHtwYXRoLnBvc2l4LnNlcH1gKSB8fFxuICAgICAgaWQuaW5jbHVkZXMoYCR7cGF0aC53aW4zMi5zZXB9bm9kZV9tb2R1bGVzJHtwYXRoLndpbjMyLnNlcH0ke3dpbmRvd3NOYW1lfSR7cGF0aC53aW4zMi5zZXB9YClcbiAgICApO1xuICB9KTtcblxuY29uc3QgbWF0Y2hlc1NvdXJjZSA9IChpZDogc3RyaW5nLCBzb3VyY2VGcmFnbWVudHM6IHN0cmluZ1tdKSA9PlxuICBzb3VyY2VGcmFnbWVudHMuc29tZSgoZnJhZ21lbnQpID0+IHtcbiAgICBjb25zdCBwb3NpeEZyYWdtZW50ID0gZnJhZ21lbnQucmVwbGFjZUFsbChcIi9cIiwgcGF0aC5wb3NpeC5zZXApO1xuICAgIGNvbnN0IHdpbmRvd3NGcmFnbWVudCA9IGZyYWdtZW50LnJlcGxhY2VBbGwoXCIvXCIsIHBhdGgud2luMzIuc2VwKTtcblxuICAgIHJldHVybiBpZC5pbmNsdWRlcyhwb3NpeEZyYWdtZW50KSB8fCBpZC5pbmNsdWRlcyh3aW5kb3dzRnJhZ21lbnQpO1xuICB9KTtcblxuY29uc3Qgc2hvdWxkSWdub3JlQ2h1bmtSZWxvY2F0aW9uV2FybmluZyA9IChtZXNzYWdlOiBzdHJpbmcpID0+XG4gIG1lc3NhZ2UuaW5jbHVkZXMoXCJkeW5hbWljIGltcG9ydCB3aWxsIG5vdCBtb3ZlIG1vZHVsZSBpbnRvIGFub3RoZXIgY2h1bmtcIilcbiAgJiYgW1xuICAgIFwic3JjL2NvbXBvbmVudHMvZWRpdG9yL0dyYXBoRXhwbG9yZXJEaWFsb2cudHN4XCIsXG4gICAgXCJzcmMvbGliL2FzdC9kb2N1bWVudEluZGV4LnRzXCIsXG4gICAgXCJzcmMvbGliL2FpL2NvbXBhcmVEb2N1bWVudHMudHNcIixcbiAgICBcInNyYy9saWIvYXN0L3JlbmRlckFzdFRvSHRtbC50c1wiLFxuICAgIFwic3JjL2xpYi9hc3QvdGlwdGFwQXN0LnRzXCIsXG4gICAgXCJzcmMvbGliL2FzdC9yZW5kZXJBc3RUb0xhdGV4LnRzXCIsXG4gICAgXCJzcmMvbGliL2FzdC9yZW5kZXJBc3RUb01hcmtkb3duLnRzXCIsXG4gIF0uc29tZSgoZnJhZ21lbnQpID0+IG1lc3NhZ2UuaW5jbHVkZXMoZnJhZ21lbnQpKTtcblxuY29uc3QgYnVuZGxlUmVwb3J0UGx1Z2luID0gKCkgPT4gKHtcbiAgZ2VuZXJhdGVCdW5kbGUoX29wdGlvbnM6IHVua25vd24sIGJ1bmRsZTogUmVjb3JkPHN0cmluZywgeyBmaWxlTmFtZTogc3RyaW5nOyB0eXBlOiBzdHJpbmc7IGNvZGU/OiBzdHJpbmc7IHNvdXJjZT86IHN0cmluZyB8IFVpbnQ4QXJyYXkgfT4pIHtcbiAgICBjb25zdCBhc3NldHMgPSBPYmplY3QudmFsdWVzKGJ1bmRsZSlcbiAgICAgIC5maWx0ZXIoKGVudHJ5KSA9PiBlbnRyeS50eXBlID09PSBcImFzc2V0XCIgfHwgZW50cnkudHlwZSA9PT0gXCJjaHVua1wiKVxuICAgICAgLm1hcCgoZW50cnkpID0+IHtcbiAgICAgICAgY29uc3QgY29udGVudCA9IGVudHJ5LnR5cGUgPT09IFwiY2h1bmtcIlxuICAgICAgICAgID8gQnVmZmVyLmZyb20oZW50cnkuY29kZSB8fCBcIlwiKVxuICAgICAgICAgIDogdHlwZW9mIGVudHJ5LnNvdXJjZSA9PT0gXCJzdHJpbmdcIlxuICAgICAgICAgICAgPyBCdWZmZXIuZnJvbShlbnRyeS5zb3VyY2UpXG4gICAgICAgICAgICA6IGVudHJ5LnNvdXJjZVxuICAgICAgICAgICAgICA/IEJ1ZmZlci5mcm9tKGVudHJ5LnNvdXJjZSlcbiAgICAgICAgICAgICAgOiBCdWZmZXIuYWxsb2MoMCk7XG4gICAgICAgIGNvbnN0IHNpemUgPSBjb250ZW50LmJ5dGVMZW5ndGg7XG4gICAgICAgIGNvbnN0IGd6aXBTaXplID0gZ3ppcFN5bmMoY29udGVudCkuYnl0ZUxlbmd0aDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGZpbGVOYW1lOiBlbnRyeS5maWxlTmFtZSxcbiAgICAgICAgICBnemlwU2l6ZSxcbiAgICAgICAgICBzaXplLFxuICAgICAgICAgIHR5cGU6IGVudHJ5LnR5cGUsXG4gICAgICAgIH07XG4gICAgICB9KVxuICAgICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5zaXplIC0gbGVmdC5zaXplKTtcblxuICAgIHRoaXMuZW1pdEZpbGUoe1xuICAgICAgZmlsZU5hbWU6IFwiYnVuZGxlLXJlcG9ydC5qc29uXCIsXG4gICAgICBzb3VyY2U6IEpTT04uc3RyaW5naWZ5KHsgYXNzZXRzIH0sIG51bGwsIDIpLFxuICAgICAgdHlwZTogXCJhc3NldFwiLFxuICAgIH0pO1xuICB9LFxufSk7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IHByb2ZpbGUgPSBtb2RlID09PSBcIndlYlwiID8gXCJ3ZWJcIiA6IFwiZGVza3RvcFwiO1xuXG4gIHJldHVybiAoe1xuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjo6XCIsXG4gICAgcG9ydDogODA4MCxcbiAgICBobXI6IHtcclxuICAgICAgb3ZlcmxheTogZmFsc2UsXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgcGx1Z2luczogW3JlYWN0KCksIGJ1bmRsZVJlcG9ydFBsdWdpbigpLCBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCldLmZpbHRlcihCb29sZWFuKSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICB9LFxuICB9LFxuICBidWlsZDoge1xuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG9ud2Fybih3YXJuaW5nLCBkZWZhdWx0SGFuZGxlcikge1xuICAgICAgICBpZiAoc2hvdWxkSWdub3JlQ2h1bmtSZWxvY2F0aW9uV2FybmluZyh3YXJuaW5nLm1lc3NhZ2UgfHwgXCJcIikpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBkZWZhdWx0SGFuZGxlcih3YXJuaW5nKTtcbiAgICAgIH0sXG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XG4gICAgICAgICAgaWYgKG1hdGNoZXNTb3VyY2UoaWQsIFtcbiAgICAgICAgICAgIFwic3JjL2NvbXBvbmVudHMvZWRpdG9yL0ZpbGVTaWRlYmFyS25vd2xlZGdlUGFuZWxzLnRzeFwiLFxuICAgICAgICAgICAgXCJzcmMvY29tcG9uZW50cy9lZGl0b3IvV29ya3NwYWNlR3JhcGhQYW5lbC50c3hcIixcbiAgICAgICAgICAgIFwic3JjL2NvbXBvbmVudHMvZWRpdG9yL0dyYXBoRXhwbG9yZXJEaWFsb2cudHN4XCIsXG4gICAgICAgICAgICBcInNyYy9ob29rcy91c2VLbm93bGVkZ2VCYXNlLnRzXCIsXG4gICAgICAgICAgICBcInNyYy9saWIva25vd2xlZGdlL1wiLFxuICAgICAgICAgIF0pKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJrbm93bGVkZ2VcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobWF0Y2hlc1NvdXJjZShpZCwgW1xuICAgICAgICAgICAgXCJzcmMvY29tcG9uZW50cy9lZGl0b3IvRmlsZVNpZGViYXJIaXN0b3J5UGFuZWxzLnRzeFwiLFxuICAgICAgICAgICAgXCJzcmMvbGliL2hpc3RvcnkvXCIsXG4gICAgICAgICAgICBcInNyYy9saWIvYW5hbHlzaXMvZm9ybWF0Q29uc2lzdGVuY3kudHNcIixcbiAgICAgICAgICBdKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiaGlzdG9yeVwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtYXRjaGVzU291cmNlKGlkLCBbXG4gICAgICAgICAgICBcInNyYy9ob29rcy91c2VBaUFzc2lzdGFudC50c1wiLFxuICAgICAgICAgICAgXCJzcmMvbGliL2FpL1wiLFxuICAgICAgICAgIF0pKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJhaVwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtYXRjaGVzU291cmNlKGlkLCBbXG4gICAgICAgICAgICBcInNyYy9jb21wb25lbnRzL2VkaXRvci9TaGFyZUxpbmtEaWFsb2cudHN4XCIsXG4gICAgICAgICAgXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcInNoYXJlXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHByb2ZpbGUgPT09IFwid2ViXCIgJiYgbWF0Y2hlc1NvdXJjZShpZCwgW1xuICAgICAgICAgICAgXCJzcmMvY29tcG9uZW50cy9lZGl0b3IvVGVtcGxhdGVEaWFsb2cudHN4XCIsXG4gICAgICAgICAgICBcInNyYy9jb21wb25lbnRzL2VkaXRvci9QYXRjaFJldmlld0RpYWxvZy50c3hcIixcbiAgICAgICAgICBdKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiZWRpdG9yLWF1eFwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXNcIikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobWF0Y2hlc1BhY2thZ2UoaWQsIFtcImthdGV4XCJdKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwibWF0aC12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobWF0Y2hlc1BhY2thZ2UoaWQsIFtcImpzLXlhbWxcIl0pKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJzdHJ1Y3R1cmVkLWlvXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1hdGNoZXNQYWNrYWdlKGlkLCBbXCJxcmNvZGVcIl0pKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJzaGFyZVwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtYXRjaGVzUGFja2FnZShpZCwgW1wiQHRpcHRhcFwiXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcInRpcHRhcC12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobWF0Y2hlc1BhY2thZ2UoaWQsIFtcInByb3NlbWlycm9yXCJdKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwicHJvc2VtaXJyb3ItdmVuZG9yXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1hdGNoZXNQYWNrYWdlKGlkLCBbXCJsb3dsaWdodFwiLCBcImhpZ2hsaWdodC5qc1wiXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcInN5bnRheC12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobWF0Y2hlc1BhY2thZ2UoaWQsIFtcInJlY2hhcnRzXCJdKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiZ3JhcGgtdmVuZG9yXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1hdGNoZXNQYWNrYWdlKGlkLCBbXCJAcmFkaXgtdWlcIiwgXCJ2YXVsXCIsIFwiY21ka1wiLCBcImx1Y2lkZS1yZWFjdFwiXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcInVpLXZlbmRvclwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtYXRjaGVzUGFja2FnZShpZCwgW1wiZnJhbWVyLW1vdGlvblwiXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcIm1vdGlvbi12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobWF0Y2hlc1BhY2thZ2UoaWQsIFtcInJlYWN0XCIsIFwicmVhY3QtZG9tXCIsIFwicmVhY3Qtcm91dGVyXCIsIFwicmVhY3Qtcm91dGVyLWRvbVwiLCBcIkB0YW5zdGFja1wiXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcInJlYWN0LXZlbmRvclwiO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgfSk7XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMFMsU0FBUyxvQkFBb0I7QUFDdlUsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLGdCQUFnQjtBQUN6QixTQUFTLHVCQUF1QjtBQUpoQyxJQUFNLG1DQUFtQztBQU16QyxJQUFNLGlCQUFpQixDQUFDLElBQVksaUJBQ2xDLGFBQWEsS0FBSyxDQUFDLGdCQUFnQjtBQUNqQyxRQUFNLFlBQVksWUFBWSxXQUFXLEtBQUssS0FBSyxNQUFNLEdBQUc7QUFDNUQsUUFBTSxjQUFjLFlBQVksV0FBVyxLQUFLLEtBQUssTUFBTSxHQUFHO0FBRTlELFNBQ0UsR0FBRyxTQUFTLEdBQUcsS0FBSyxNQUFNLEdBQUcsZUFBZSxLQUFLLE1BQU0sR0FBRyxHQUFHLFNBQVMsR0FBRyxLQUFLLE1BQU0sR0FBRyxFQUFFLEtBQ3pGLEdBQUcsU0FBUyxHQUFHLEtBQUssTUFBTSxHQUFHLGVBQWUsS0FBSyxNQUFNLEdBQUcsR0FBRyxXQUFXLEdBQUcsS0FBSyxNQUFNLEdBQUcsRUFBRTtBQUUvRixDQUFDO0FBRUgsSUFBTSxnQkFBZ0IsQ0FBQyxJQUFZLG9CQUNqQyxnQkFBZ0IsS0FBSyxDQUFDLGFBQWE7QUFDakMsUUFBTSxnQkFBZ0IsU0FBUyxXQUFXLEtBQUssS0FBSyxNQUFNLEdBQUc7QUFDN0QsUUFBTSxrQkFBa0IsU0FBUyxXQUFXLEtBQUssS0FBSyxNQUFNLEdBQUc7QUFFL0QsU0FBTyxHQUFHLFNBQVMsYUFBYSxLQUFLLEdBQUcsU0FBUyxlQUFlO0FBQ2xFLENBQUM7QUFFSCxJQUFNLHFDQUFxQyxDQUFDLFlBQzFDLFFBQVEsU0FBUyx3REFBd0QsS0FDdEU7QUFBQSxFQUNEO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0YsRUFBRSxLQUFLLENBQUMsYUFBYSxRQUFRLFNBQVMsUUFBUSxDQUFDO0FBRWpELElBQU0scUJBQXFCLE9BQU87QUFBQSxFQUNoQyxlQUFlLFVBQW1CLFFBQXlHO0FBQ3pJLFVBQU0sU0FBUyxPQUFPLE9BQU8sTUFBTSxFQUNoQyxPQUFPLENBQUMsVUFBVSxNQUFNLFNBQVMsV0FBVyxNQUFNLFNBQVMsT0FBTyxFQUNsRSxJQUFJLENBQUMsVUFBVTtBQUNkLFlBQU0sVUFBVSxNQUFNLFNBQVMsVUFDM0IsT0FBTyxLQUFLLE1BQU0sUUFBUSxFQUFFLElBQzVCLE9BQU8sTUFBTSxXQUFXLFdBQ3RCLE9BQU8sS0FBSyxNQUFNLE1BQU0sSUFDeEIsTUFBTSxTQUNKLE9BQU8sS0FBSyxNQUFNLE1BQU0sSUFDeEIsT0FBTyxNQUFNLENBQUM7QUFDdEIsWUFBTSxPQUFPLFFBQVE7QUFDckIsWUFBTSxXQUFXLFNBQVMsT0FBTyxFQUFFO0FBRW5DLGFBQU87QUFBQSxRQUNMLFVBQVUsTUFBTTtBQUFBLFFBQ2hCO0FBQUEsUUFDQTtBQUFBLFFBQ0EsTUFBTSxNQUFNO0FBQUEsTUFDZDtBQUFBLElBQ0YsQ0FBQyxFQUNBLEtBQUssQ0FBQyxNQUFNLFVBQVUsTUFBTSxPQUFPLEtBQUssSUFBSTtBQUUvQyxTQUFLLFNBQVM7QUFBQSxNQUNaLFVBQVU7QUFBQSxNQUNWLFFBQVEsS0FBSyxVQUFVLEVBQUUsT0FBTyxHQUFHLE1BQU0sQ0FBQztBQUFBLE1BQzFDLE1BQU07QUFBQSxJQUNSLENBQUM7QUFBQSxFQUNIO0FBQ0Y7QUFHQSxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxRQUFNLFVBQVUsU0FBUyxRQUFRLFFBQVE7QUFFekMsU0FBUTtBQUFBLElBQ1IsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sS0FBSztBQUFBLFFBQ0gsU0FBUztBQUFBLE1BQ1g7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTLENBQUMsTUFBTSxHQUFHLG1CQUFtQixHQUFHLFNBQVMsaUJBQWlCLGdCQUFnQixDQUFDLEVBQUUsT0FBTyxPQUFPO0FBQUEsSUFDcEcsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLE1BQ3RDO0FBQUEsSUFDRjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsZUFBZTtBQUFBLFFBQ2IsT0FBTyxTQUFTLGdCQUFnQjtBQUM5QixjQUFJLG1DQUFtQyxRQUFRLFdBQVcsRUFBRSxHQUFHO0FBQzdEO0FBQUEsVUFDRjtBQUVBLHlCQUFlLE9BQU87QUFBQSxRQUN4QjtBQUFBLFFBQ0EsUUFBUTtBQUFBLFVBQ04sYUFBYSxJQUFJO0FBQ2YsZ0JBQUksY0FBYyxJQUFJO0FBQUEsY0FDcEI7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsWUFDRixDQUFDLEdBQUc7QUFDRixxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxjQUFjLElBQUk7QUFBQSxjQUNwQjtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsWUFDRixDQUFDLEdBQUc7QUFDRixxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxjQUFjLElBQUk7QUFBQSxjQUNwQjtBQUFBLGNBQ0E7QUFBQSxZQUNGLENBQUMsR0FBRztBQUNGLHFCQUFPO0FBQUEsWUFDVDtBQUVBLGdCQUFJLGNBQWMsSUFBSTtBQUFBLGNBQ3BCO0FBQUEsWUFDRixDQUFDLEdBQUc7QUFDRixxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxZQUFZLFNBQVMsY0FBYyxJQUFJO0FBQUEsY0FDekM7QUFBQSxjQUNBO0FBQUEsWUFDRixDQUFDLEdBQUc7QUFDRixxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxDQUFDLEdBQUcsU0FBUyxjQUFjLEdBQUc7QUFDaEM7QUFBQSxZQUNGO0FBRUEsZ0JBQUksZUFBZSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUc7QUFDakMscUJBQU87QUFBQSxZQUNUO0FBRUEsZ0JBQUksZUFBZSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUc7QUFDbkMscUJBQU87QUFBQSxZQUNUO0FBRUEsZ0JBQUksZUFBZSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUc7QUFDbEMscUJBQU87QUFBQSxZQUNUO0FBRUEsZ0JBQUksZUFBZSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUc7QUFDbkMscUJBQU87QUFBQSxZQUNUO0FBRUEsZ0JBQUksZUFBZSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUc7QUFDdkMscUJBQU87QUFBQSxZQUNUO0FBRUEsZ0JBQUksZUFBZSxJQUFJLENBQUMsWUFBWSxjQUFjLENBQUMsR0FBRztBQUNwRCxxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxlQUFlLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRztBQUNwQyxxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxlQUFlLElBQUksQ0FBQyxhQUFhLFFBQVEsUUFBUSxjQUFjLENBQUMsR0FBRztBQUNyRSxxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxlQUFlLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRztBQUN6QyxxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxlQUFlLElBQUksQ0FBQyxTQUFTLGFBQWEsZ0JBQWdCLG9CQUFvQixXQUFXLENBQUMsR0FBRztBQUMvRixxQkFBTztBQUFBLFlBQ1Q7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDQTtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
