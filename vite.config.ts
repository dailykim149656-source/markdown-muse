import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const matchesPackage = (id: string, packageNames: string[]) =>
  packageNames.some((packageName) => {
    const posixName = packageName.replaceAll("/", path.posix.sep);
    const windowsName = packageName.replaceAll("/", path.win32.sep);

    return (
      id.includes(`${path.posix.sep}node_modules${path.posix.sep}${posixName}${path.posix.sep}`) ||
      id.includes(`${path.win32.sep}node_modules${path.win32.sep}${windowsName}${path.win32.sep}`)
    );
  });

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (matchesPackage(id, ["katex"])) {
            return "math-vendor";
          }

          if (matchesPackage(id, ["@tiptap"])) {
            return "tiptap-vendor";
          }

          if (matchesPackage(id, ["prosemirror"])) {
            return "prosemirror-vendor";
          }

          if (matchesPackage(id, ["lowlight"])) {
            return "syntax-vendor";
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
        },
      },
    },
  },
}));
