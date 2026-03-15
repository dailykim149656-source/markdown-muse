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
      },
      proxy: {
        "/api": {
          changeOrigin: true,
          secure: false,
          target: "http://localhost:8787"
        }
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJGOlxcXFxEb2NzeS1kb2N1bWVudF9lZGl0b3JcXFxcbWFya2Rvd24tbXVzZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRjpcXFxcRG9jc3ktZG9jdW1lbnRfZWRpdG9yXFxcXG1hcmtkb3duLW11c2VcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Y6L0RvY3N5LWRvY3VtZW50X2VkaXRvci9tYXJrZG93bi1tdXNlL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgZ3ppcFN5bmMgfSBmcm9tIFwibm9kZTp6bGliXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuY29uc3QgbWF0Y2hlc1BhY2thZ2UgPSAoaWQ6IHN0cmluZywgcGFja2FnZU5hbWVzOiBzdHJpbmdbXSkgPT5cbiAgcGFja2FnZU5hbWVzLnNvbWUoKHBhY2thZ2VOYW1lKSA9PiB7XG4gICAgY29uc3QgcG9zaXhOYW1lID0gcGFja2FnZU5hbWUucmVwbGFjZUFsbChcIi9cIiwgcGF0aC5wb3NpeC5zZXApO1xuICAgIGNvbnN0IHdpbmRvd3NOYW1lID0gcGFja2FnZU5hbWUucmVwbGFjZUFsbChcIi9cIiwgcGF0aC53aW4zMi5zZXApO1xuXG4gICAgcmV0dXJuIChcbiAgICAgIGlkLmluY2x1ZGVzKGAke3BhdGgucG9zaXguc2VwfW5vZGVfbW9kdWxlcyR7cGF0aC5wb3NpeC5zZXB9JHtwb3NpeE5hbWV9JHtwYXRoLnBvc2l4LnNlcH1gKSB8fFxuICAgICAgaWQuaW5jbHVkZXMoYCR7cGF0aC53aW4zMi5zZXB9bm9kZV9tb2R1bGVzJHtwYXRoLndpbjMyLnNlcH0ke3dpbmRvd3NOYW1lfSR7cGF0aC53aW4zMi5zZXB9YClcbiAgICApO1xuICB9KTtcblxuY29uc3QgbWF0Y2hlc1NvdXJjZSA9IChpZDogc3RyaW5nLCBzb3VyY2VGcmFnbWVudHM6IHN0cmluZ1tdKSA9PlxuICBzb3VyY2VGcmFnbWVudHMuc29tZSgoZnJhZ21lbnQpID0+IHtcbiAgICBjb25zdCBwb3NpeEZyYWdtZW50ID0gZnJhZ21lbnQucmVwbGFjZUFsbChcIi9cIiwgcGF0aC5wb3NpeC5zZXApO1xuICAgIGNvbnN0IHdpbmRvd3NGcmFnbWVudCA9IGZyYWdtZW50LnJlcGxhY2VBbGwoXCIvXCIsIHBhdGgud2luMzIuc2VwKTtcblxuICAgIHJldHVybiBpZC5pbmNsdWRlcyhwb3NpeEZyYWdtZW50KSB8fCBpZC5pbmNsdWRlcyh3aW5kb3dzRnJhZ21lbnQpO1xuICB9KTtcblxuY29uc3Qgc2hvdWxkSWdub3JlQ2h1bmtSZWxvY2F0aW9uV2FybmluZyA9IChtZXNzYWdlOiBzdHJpbmcpID0+XG4gIG1lc3NhZ2UuaW5jbHVkZXMoXCJkeW5hbWljIGltcG9ydCB3aWxsIG5vdCBtb3ZlIG1vZHVsZSBpbnRvIGFub3RoZXIgY2h1bmtcIilcbiAgJiYgW1xuICAgIFwic3JjL2NvbXBvbmVudHMvZWRpdG9yL0dyYXBoRXhwbG9yZXJEaWFsb2cudHN4XCIsXG4gICAgXCJzcmMvbGliL2FzdC9kb2N1bWVudEluZGV4LnRzXCIsXG4gICAgXCJzcmMvbGliL2FpL2NvbXBhcmVEb2N1bWVudHMudHNcIixcbiAgICBcInNyYy9saWIvYXN0L3JlbmRlckFzdFRvSHRtbC50c1wiLFxuICAgIFwic3JjL2xpYi9hc3QvdGlwdGFwQXN0LnRzXCIsXG4gICAgXCJzcmMvbGliL2FzdC9yZW5kZXJBc3RUb0xhdGV4LnRzXCIsXG4gICAgXCJzcmMvbGliL2FzdC9yZW5kZXJBc3RUb01hcmtkb3duLnRzXCIsXG4gIF0uc29tZSgoZnJhZ21lbnQpID0+IG1lc3NhZ2UuaW5jbHVkZXMoZnJhZ21lbnQpKTtcblxuY29uc3QgYnVuZGxlUmVwb3J0UGx1Z2luID0gKCkgPT4gKHtcbiAgZ2VuZXJhdGVCdW5kbGUoX29wdGlvbnM6IHVua25vd24sIGJ1bmRsZTogUmVjb3JkPHN0cmluZywgeyBmaWxlTmFtZTogc3RyaW5nOyB0eXBlOiBzdHJpbmc7IGNvZGU/OiBzdHJpbmc7IHNvdXJjZT86IHN0cmluZyB8IFVpbnQ4QXJyYXkgfT4pIHtcbiAgICBjb25zdCBhc3NldHMgPSBPYmplY3QudmFsdWVzKGJ1bmRsZSlcbiAgICAgIC5maWx0ZXIoKGVudHJ5KSA9PiBlbnRyeS50eXBlID09PSBcImFzc2V0XCIgfHwgZW50cnkudHlwZSA9PT0gXCJjaHVua1wiKVxuICAgICAgLm1hcCgoZW50cnkpID0+IHtcbiAgICAgICAgY29uc3QgY29udGVudCA9IGVudHJ5LnR5cGUgPT09IFwiY2h1bmtcIlxuICAgICAgICAgID8gQnVmZmVyLmZyb20oZW50cnkuY29kZSB8fCBcIlwiKVxuICAgICAgICAgIDogdHlwZW9mIGVudHJ5LnNvdXJjZSA9PT0gXCJzdHJpbmdcIlxuICAgICAgICAgICAgPyBCdWZmZXIuZnJvbShlbnRyeS5zb3VyY2UpXG4gICAgICAgICAgICA6IGVudHJ5LnNvdXJjZVxuICAgICAgICAgICAgICA/IEJ1ZmZlci5mcm9tKGVudHJ5LnNvdXJjZSlcbiAgICAgICAgICAgICAgOiBCdWZmZXIuYWxsb2MoMCk7XG4gICAgICAgIGNvbnN0IHNpemUgPSBjb250ZW50LmJ5dGVMZW5ndGg7XG4gICAgICAgIGNvbnN0IGd6aXBTaXplID0gZ3ppcFN5bmMoY29udGVudCkuYnl0ZUxlbmd0aDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGZpbGVOYW1lOiBlbnRyeS5maWxlTmFtZSxcbiAgICAgICAgICBnemlwU2l6ZSxcbiAgICAgICAgICBzaXplLFxuICAgICAgICAgIHR5cGU6IGVudHJ5LnR5cGUsXG4gICAgICAgIH07XG4gICAgICB9KVxuICAgICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5zaXplIC0gbGVmdC5zaXplKTtcblxuICAgIHRoaXMuZW1pdEZpbGUoe1xuICAgICAgZmlsZU5hbWU6IFwiYnVuZGxlLXJlcG9ydC5qc29uXCIsXG4gICAgICBzb3VyY2U6IEpTT04uc3RyaW5naWZ5KHsgYXNzZXRzIH0sIG51bGwsIDIpLFxuICAgICAgdHlwZTogXCJhc3NldFwiLFxuICAgIH0pO1xuICB9LFxufSk7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IHByb2ZpbGUgPSBtb2RlID09PSBcIndlYlwiID8gXCJ3ZWJcIiA6IFwiZGVza3RvcFwiO1xuXG4gIHJldHVybiAoe1xuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjo6XCIsXG4gICAgcG9ydDogODA4MCxcbiAgICBobXI6IHtcbiAgICAgIG92ZXJsYXk6IGZhbHNlLFxuICAgIH0sXG4gICAgcHJveHk6IHtcbiAgICAgIFwiL2FwaVwiOiB7XG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly9sb2NhbGhvc3Q6ODc4N1wiLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICBwbHVnaW5zOiBbcmVhY3QoKSwgYnVuZGxlUmVwb3J0UGx1Z2luKCksIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKV0uZmlsdGVyKEJvb2xlYW4pLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb253YXJuKHdhcm5pbmcsIGRlZmF1bHRIYW5kbGVyKSB7XG4gICAgICAgIGlmIChzaG91bGRJZ25vcmVDaHVua1JlbG9jYXRpb25XYXJuaW5nKHdhcm5pbmcubWVzc2FnZSB8fCBcIlwiKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGRlZmF1bHRIYW5kbGVyKHdhcm5pbmcpO1xuICAgICAgfSxcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcbiAgICAgICAgICBpZiAobWF0Y2hlc1NvdXJjZShpZCwgW1xuICAgICAgICAgICAgXCJzcmMvY29tcG9uZW50cy9lZGl0b3IvRmlsZVNpZGViYXJLbm93bGVkZ2VQYW5lbHMudHN4XCIsXG4gICAgICAgICAgICBcInNyYy9jb21wb25lbnRzL2VkaXRvci9Xb3Jrc3BhY2VHcmFwaFBhbmVsLnRzeFwiLFxuICAgICAgICAgICAgXCJzcmMvY29tcG9uZW50cy9lZGl0b3IvR3JhcGhFeHBsb3JlckRpYWxvZy50c3hcIixcbiAgICAgICAgICAgIFwic3JjL2hvb2tzL3VzZUtub3dsZWRnZUJhc2UudHNcIixcbiAgICAgICAgICAgIFwic3JjL2xpYi9rbm93bGVkZ2UvXCIsXG4gICAgICAgICAgXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcImtub3dsZWRnZVwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtYXRjaGVzU291cmNlKGlkLCBbXG4gICAgICAgICAgICBcInNyYy9jb21wb25lbnRzL2VkaXRvci9GaWxlU2lkZWJhckhpc3RvcnlQYW5lbHMudHN4XCIsXG4gICAgICAgICAgICBcInNyYy9saWIvaGlzdG9yeS9cIixcbiAgICAgICAgICAgIFwic3JjL2xpYi9hbmFseXNpcy9mb3JtYXRDb25zaXN0ZW5jeS50c1wiLFxuICAgICAgICAgIF0pKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJoaXN0b3J5XCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1hdGNoZXNTb3VyY2UoaWQsIFtcbiAgICAgICAgICAgIFwic3JjL2hvb2tzL3VzZUFpQXNzaXN0YW50LnRzXCIsXG4gICAgICAgICAgICBcInNyYy9saWIvYWkvXCIsXG4gICAgICAgICAgXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcImFpXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1hdGNoZXNTb3VyY2UoaWQsIFtcbiAgICAgICAgICAgIFwic3JjL2NvbXBvbmVudHMvZWRpdG9yL1NoYXJlTGlua0RpYWxvZy50c3hcIixcbiAgICAgICAgICBdKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwic2hhcmVcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAocHJvZmlsZSA9PT0gXCJ3ZWJcIiAmJiBtYXRjaGVzU291cmNlKGlkLCBbXG4gICAgICAgICAgICBcInNyYy9jb21wb25lbnRzL2VkaXRvci9UZW1wbGF0ZURpYWxvZy50c3hcIixcbiAgICAgICAgICAgIFwic3JjL2NvbXBvbmVudHMvZWRpdG9yL1BhdGNoUmV2aWV3RGlhbG9nLnRzeFwiLFxuICAgICAgICAgIF0pKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJlZGl0b3ItYXV4XCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlc1wiKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtYXRjaGVzUGFja2FnZShpZCwgW1wia2F0ZXhcIl0pKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJtYXRoLXZlbmRvclwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtYXRjaGVzUGFja2FnZShpZCwgW1wianMteWFtbFwiXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcInN0cnVjdHVyZWQtaW9cIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobWF0Y2hlc1BhY2thZ2UoaWQsIFtcInFyY29kZVwiXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcInNoYXJlXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1hdGNoZXNQYWNrYWdlKGlkLCBbXCJAdGlwdGFwXCJdKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwidGlwdGFwLXZlbmRvclwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtYXRjaGVzUGFja2FnZShpZCwgW1wicHJvc2VtaXJyb3JcIl0pKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJwcm9zZW1pcnJvci12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobWF0Y2hlc1BhY2thZ2UoaWQsIFtcImxvd2xpZ2h0XCIsIFwiaGlnaGxpZ2h0LmpzXCJdKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwic3ludGF4LXZlbmRvclwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtYXRjaGVzUGFja2FnZShpZCwgW1wicmVjaGFydHNcIl0pKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJncmFwaC12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobWF0Y2hlc1BhY2thZ2UoaWQsIFtcIkByYWRpeC11aVwiLCBcInZhdWxcIiwgXCJjbWRrXCIsIFwibHVjaWRlLXJlYWN0XCJdKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwidWktdmVuZG9yXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1hdGNoZXNQYWNrYWdlKGlkLCBbXCJmcmFtZXItbW90aW9uXCJdKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwibW90aW9uLXZlbmRvclwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtYXRjaGVzUGFja2FnZShpZCwgW1wicmVhY3RcIiwgXCJyZWFjdC1kb21cIiwgXCJyZWFjdC1yb3V0ZXJcIiwgXCJyZWFjdC1yb3V0ZXItZG9tXCIsIFwiQHRhbnN0YWNrXCJdKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwicmVhY3QtdmVuZG9yXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICB9KTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEwUyxTQUFTLG9CQUFvQjtBQUN2VSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsZ0JBQWdCO0FBQ3pCLFNBQVMsdUJBQXVCO0FBSmhDLElBQU0sbUNBQW1DO0FBTXpDLElBQU0saUJBQWlCLENBQUMsSUFBWSxpQkFDbEMsYUFBYSxLQUFLLENBQUMsZ0JBQWdCO0FBQ2pDLFFBQU0sWUFBWSxZQUFZLFdBQVcsS0FBSyxLQUFLLE1BQU0sR0FBRztBQUM1RCxRQUFNLGNBQWMsWUFBWSxXQUFXLEtBQUssS0FBSyxNQUFNLEdBQUc7QUFFOUQsU0FDRSxHQUFHLFNBQVMsR0FBRyxLQUFLLE1BQU0sR0FBRyxlQUFlLEtBQUssTUFBTSxHQUFHLEdBQUcsU0FBUyxHQUFHLEtBQUssTUFBTSxHQUFHLEVBQUUsS0FDekYsR0FBRyxTQUFTLEdBQUcsS0FBSyxNQUFNLEdBQUcsZUFBZSxLQUFLLE1BQU0sR0FBRyxHQUFHLFdBQVcsR0FBRyxLQUFLLE1BQU0sR0FBRyxFQUFFO0FBRS9GLENBQUM7QUFFSCxJQUFNLGdCQUFnQixDQUFDLElBQVksb0JBQ2pDLGdCQUFnQixLQUFLLENBQUMsYUFBYTtBQUNqQyxRQUFNLGdCQUFnQixTQUFTLFdBQVcsS0FBSyxLQUFLLE1BQU0sR0FBRztBQUM3RCxRQUFNLGtCQUFrQixTQUFTLFdBQVcsS0FBSyxLQUFLLE1BQU0sR0FBRztBQUUvRCxTQUFPLEdBQUcsU0FBUyxhQUFhLEtBQUssR0FBRyxTQUFTLGVBQWU7QUFDbEUsQ0FBQztBQUVILElBQU0scUNBQXFDLENBQUMsWUFDMUMsUUFBUSxTQUFTLHdEQUF3RCxLQUN0RTtBQUFBLEVBQ0Q7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFB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
