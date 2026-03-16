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
              "src/lib/ai/autosaveSummaryClient.ts"
            ])) {
              return "ai-history";
            }
            if (matchesSource(id, [
              "src/lib/ai/httpClient.ts",
              "src/lib/ai/texClient.ts"
            ])) {
              return "ai-shared";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJGOlxcXFxEb2NzeS1kb2N1bWVudF9lZGl0b3JcXFxcbWFya2Rvd24tbXVzZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRjpcXFxcRG9jc3ktZG9jdW1lbnRfZWRpdG9yXFxcXG1hcmtkb3duLW11c2VcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Y6L0RvY3N5LWRvY3VtZW50X2VkaXRvci9tYXJrZG93bi1tdXNlL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgZ3ppcFN5bmMgfSBmcm9tIFwibm9kZTp6bGliXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuY29uc3QgbWF0Y2hlc1BhY2thZ2UgPSAoaWQ6IHN0cmluZywgcGFja2FnZU5hbWVzOiBzdHJpbmdbXSkgPT5cbiAgcGFja2FnZU5hbWVzLnNvbWUoKHBhY2thZ2VOYW1lKSA9PiB7XG4gICAgY29uc3QgcG9zaXhOYW1lID0gcGFja2FnZU5hbWUucmVwbGFjZUFsbChcIi9cIiwgcGF0aC5wb3NpeC5zZXApO1xuICAgIGNvbnN0IHdpbmRvd3NOYW1lID0gcGFja2FnZU5hbWUucmVwbGFjZUFsbChcIi9cIiwgcGF0aC53aW4zMi5zZXApO1xuXG4gICAgcmV0dXJuIChcbiAgICAgIGlkLmluY2x1ZGVzKGAke3BhdGgucG9zaXguc2VwfW5vZGVfbW9kdWxlcyR7cGF0aC5wb3NpeC5zZXB9JHtwb3NpeE5hbWV9JHtwYXRoLnBvc2l4LnNlcH1gKSB8fFxuICAgICAgaWQuaW5jbHVkZXMoYCR7cGF0aC53aW4zMi5zZXB9bm9kZV9tb2R1bGVzJHtwYXRoLndpbjMyLnNlcH0ke3dpbmRvd3NOYW1lfSR7cGF0aC53aW4zMi5zZXB9YClcbiAgICApO1xuICB9KTtcblxuY29uc3QgbWF0Y2hlc1NvdXJjZSA9IChpZDogc3RyaW5nLCBzb3VyY2VGcmFnbWVudHM6IHN0cmluZ1tdKSA9PlxuICBzb3VyY2VGcmFnbWVudHMuc29tZSgoZnJhZ21lbnQpID0+IHtcbiAgICBjb25zdCBwb3NpeEZyYWdtZW50ID0gZnJhZ21lbnQucmVwbGFjZUFsbChcIi9cIiwgcGF0aC5wb3NpeC5zZXApO1xuICAgIGNvbnN0IHdpbmRvd3NGcmFnbWVudCA9IGZyYWdtZW50LnJlcGxhY2VBbGwoXCIvXCIsIHBhdGgud2luMzIuc2VwKTtcblxuICAgIHJldHVybiBpZC5pbmNsdWRlcyhwb3NpeEZyYWdtZW50KSB8fCBpZC5pbmNsdWRlcyh3aW5kb3dzRnJhZ21lbnQpO1xuICB9KTtcblxuY29uc3Qgc2hvdWxkSWdub3JlQ2h1bmtSZWxvY2F0aW9uV2FybmluZyA9IChtZXNzYWdlOiBzdHJpbmcpID0+XG4gIG1lc3NhZ2UuaW5jbHVkZXMoXCJkeW5hbWljIGltcG9ydCB3aWxsIG5vdCBtb3ZlIG1vZHVsZSBpbnRvIGFub3RoZXIgY2h1bmtcIilcbiAgJiYgW1xuICAgIFwic3JjL2NvbXBvbmVudHMvZWRpdG9yL0dyYXBoRXhwbG9yZXJEaWFsb2cudHN4XCIsXG4gICAgXCJzcmMvbGliL2FzdC9kb2N1bWVudEluZGV4LnRzXCIsXG4gICAgXCJzcmMvbGliL2FpL2NvbXBhcmVEb2N1bWVudHMudHNcIixcbiAgICBcInNyYy9saWIvYXN0L3JlbmRlckFzdFRvSHRtbC50c1wiLFxuICAgIFwic3JjL2xpYi9hc3QvdGlwdGFwQXN0LnRzXCIsXG4gICAgXCJzcmMvbGliL2FzdC9yZW5kZXJBc3RUb0xhdGV4LnRzXCIsXG4gICAgXCJzcmMvbGliL2FzdC9yZW5kZXJBc3RUb01hcmtkb3duLnRzXCIsXG4gIF0uc29tZSgoZnJhZ21lbnQpID0+IG1lc3NhZ2UuaW5jbHVkZXMoZnJhZ21lbnQpKTtcblxuY29uc3QgYnVuZGxlUmVwb3J0UGx1Z2luID0gKCkgPT4gKHtcbiAgZ2VuZXJhdGVCdW5kbGUoX29wdGlvbnM6IHVua25vd24sIGJ1bmRsZTogUmVjb3JkPHN0cmluZywgeyBmaWxlTmFtZTogc3RyaW5nOyB0eXBlOiBzdHJpbmc7IGNvZGU/OiBzdHJpbmc7IHNvdXJjZT86IHN0cmluZyB8IFVpbnQ4QXJyYXkgfT4pIHtcbiAgICBjb25zdCBhc3NldHMgPSBPYmplY3QudmFsdWVzKGJ1bmRsZSlcbiAgICAgIC5maWx0ZXIoKGVudHJ5KSA9PiBlbnRyeS50eXBlID09PSBcImFzc2V0XCIgfHwgZW50cnkudHlwZSA9PT0gXCJjaHVua1wiKVxuICAgICAgLm1hcCgoZW50cnkpID0+IHtcbiAgICAgICAgY29uc3QgY29udGVudCA9IGVudHJ5LnR5cGUgPT09IFwiY2h1bmtcIlxuICAgICAgICAgID8gQnVmZmVyLmZyb20oZW50cnkuY29kZSB8fCBcIlwiKVxuICAgICAgICAgIDogdHlwZW9mIGVudHJ5LnNvdXJjZSA9PT0gXCJzdHJpbmdcIlxuICAgICAgICAgICAgPyBCdWZmZXIuZnJvbShlbnRyeS5zb3VyY2UpXG4gICAgICAgICAgICA6IGVudHJ5LnNvdXJjZVxuICAgICAgICAgICAgICA/IEJ1ZmZlci5mcm9tKGVudHJ5LnNvdXJjZSlcbiAgICAgICAgICAgICAgOiBCdWZmZXIuYWxsb2MoMCk7XG4gICAgICAgIGNvbnN0IHNpemUgPSBjb250ZW50LmJ5dGVMZW5ndGg7XG4gICAgICAgIGNvbnN0IGd6aXBTaXplID0gZ3ppcFN5bmMoY29udGVudCkuYnl0ZUxlbmd0aDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGZpbGVOYW1lOiBlbnRyeS5maWxlTmFtZSxcbiAgICAgICAgICBnemlwU2l6ZSxcbiAgICAgICAgICBzaXplLFxuICAgICAgICAgIHR5cGU6IGVudHJ5LnR5cGUsXG4gICAgICAgIH07XG4gICAgICB9KVxuICAgICAgLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiByaWdodC5zaXplIC0gbGVmdC5zaXplKTtcblxuICAgIHRoaXMuZW1pdEZpbGUoe1xuICAgICAgZmlsZU5hbWU6IFwiYnVuZGxlLXJlcG9ydC5qc29uXCIsXG4gICAgICBzb3VyY2U6IEpTT04uc3RyaW5naWZ5KHsgYXNzZXRzIH0sIG51bGwsIDIpLFxuICAgICAgdHlwZTogXCJhc3NldFwiLFxuICAgIH0pO1xuICB9LFxufSk7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIHJldHVybiAoe1xuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjo6XCIsXG4gICAgcG9ydDogODA4MCxcbiAgICBobXI6IHtcbiAgICAgIG92ZXJsYXk6IGZhbHNlLFxuICAgIH0sXG4gICAgcHJveHk6IHtcbiAgICAgIFwiL2FwaVwiOiB7XG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly9sb2NhbGhvc3Q6ODc4N1wiLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICBwbHVnaW5zOiBbcmVhY3QoKSwgYnVuZGxlUmVwb3J0UGx1Z2luKCksIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKV0uZmlsdGVyKEJvb2xlYW4pLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb253YXJuKHdhcm5pbmcsIGRlZmF1bHRIYW5kbGVyKSB7XG4gICAgICAgIGlmIChzaG91bGRJZ25vcmVDaHVua1JlbG9jYXRpb25XYXJuaW5nKHdhcm5pbmcubWVzc2FnZSB8fCBcIlwiKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGRlZmF1bHRIYW5kbGVyKHdhcm5pbmcpO1xuICAgICAgfSxcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcbiAgICAgICAgICBpZiAobWF0Y2hlc1NvdXJjZShpZCwgW1xuICAgICAgICAgICAgXCJzcmMvbGliL2FpL2F1dG9zYXZlU3VtbWFyeUNsaWVudC50c1wiLFxuICAgICAgICAgIF0pKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJhaS1oaXN0b3J5XCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1hdGNoZXNTb3VyY2UoaWQsIFtcbiAgICAgICAgICAgIFwic3JjL2xpYi9haS9odHRwQ2xpZW50LnRzXCIsXG4gICAgICAgICAgICBcInNyYy9saWIvYWkvdGV4Q2xpZW50LnRzXCIsXG4gICAgICAgICAgXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcImFpLXNoYXJlZFwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXNcIikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobWF0Y2hlc1BhY2thZ2UoaWQsIFtcImthdGV4XCJdKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwibWF0aC12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobWF0Y2hlc1BhY2thZ2UoaWQsIFtcImpzLXlhbWxcIl0pKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJzdHJ1Y3R1cmVkLWlvXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1hdGNoZXNQYWNrYWdlKGlkLCBbXCJxcmNvZGVcIl0pKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJzaGFyZVwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtYXRjaGVzUGFja2FnZShpZCwgW1wiQHRpcHRhcFwiXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcInRpcHRhcC12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobWF0Y2hlc1BhY2thZ2UoaWQsIFtcInByb3NlbWlycm9yXCJdKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwicHJvc2VtaXJyb3ItdmVuZG9yXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1hdGNoZXNQYWNrYWdlKGlkLCBbXCJsb3dsaWdodFwiLCBcImhpZ2hsaWdodC5qc1wiXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcInN5bnRheC12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobWF0Y2hlc1BhY2thZ2UoaWQsIFtcInJlY2hhcnRzXCJdKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiZ3JhcGgtdmVuZG9yXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1hdGNoZXNQYWNrYWdlKGlkLCBbXCJAcmFkaXgtdWlcIiwgXCJ2YXVsXCIsIFwiY21ka1wiLCBcImx1Y2lkZS1yZWFjdFwiXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcInVpLXZlbmRvclwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtYXRjaGVzUGFja2FnZShpZCwgW1wiZnJhbWVyLW1vdGlvblwiXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcIm1vdGlvbi12ZW5kb3JcIjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobWF0Y2hlc1BhY2thZ2UoaWQsIFtcInJlYWN0XCIsIFwicmVhY3QtZG9tXCIsIFwicmVhY3Qtcm91dGVyXCIsIFwicmVhY3Qtcm91dGVyLWRvbVwiLCBcIkB0YW5zdGFja1wiXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBcInJlYWN0LXZlbmRvclwiO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgfSk7XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMFMsU0FBUyxvQkFBb0I7QUFDdlUsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLGdCQUFnQjtBQUN6QixTQUFTLHVCQUF1QjtBQUpoQyxJQUFNLG1DQUFtQztBQU16QyxJQUFNLGlCQUFpQixDQUFDLElBQVksaUJBQ2xDLGFBQWEsS0FBSyxDQUFDLGdCQUFnQjtBQUNqQyxRQUFNLFlBQVksWUFBWSxXQUFXLEtBQUssS0FBSyxNQUFNLEdBQUc7QUFDNUQsUUFBTSxjQUFjLFlBQVksV0FBVyxLQUFLLEtBQUssTUFBTSxHQUFHO0FBRTlELFNBQ0UsR0FBRyxTQUFTLEdBQUcsS0FBSyxNQUFNLEdBQUcsZUFBZSxLQUFLLE1BQU0sR0FBRyxHQUFHLFNBQVMsR0FBRyxLQUFLLE1BQU0sR0FBRyxFQUFFLEtBQ3pGLEdBQUcsU0FBUyxHQUFHLEtBQUssTUFBTSxHQUFHLGVBQWUsS0FBSyxNQUFNLEdBQUcsR0FBRyxXQUFXLEdBQUcsS0FBSyxNQUFNLEdBQUcsRUFBRTtBQUUvRixDQUFDO0FBRUgsSUFBTSxnQkFBZ0IsQ0FBQyxJQUFZLG9CQUNqQyxnQkFBZ0IsS0FBSyxDQUFDLGFBQWE7QUFDakMsUUFBTSxnQkFBZ0IsU0FBUyxXQUFXLEtBQUssS0FBSyxNQUFNLEdBQUc7QUFDN0QsUUFBTSxrQkFBa0IsU0FBUyxXQUFXLEtBQUssS0FBSyxNQUFNLEdBQUc7QUFFL0QsU0FBTyxHQUFHLFNBQVMsYUFBYSxLQUFLLEdBQUcsU0FBUyxlQUFlO0FBQ2xFLENBQUM7QUFFSCxJQUFNLHFDQUFxQyxDQUFDLFlBQzFDLFFBQVEsU0FBUyx3REFBd0QsS0FDdEU7QUFBQSxFQUNEO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0YsRUFBRSxLQUFLLENBQUMsYUFBYSxRQUFRLFNBQVMs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
