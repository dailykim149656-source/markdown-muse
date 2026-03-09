import type mermaid from "mermaid";

let mermaidPromise: Promise<typeof mermaid> | null = null;

export const loadMermaid = () => {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((module) => module.default);
  }

  return mermaidPromise;
};
