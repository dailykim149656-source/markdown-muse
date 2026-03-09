import type katex from "katex";

let katexPromise: Promise<typeof katex> | null = null;

export const loadKatex = () => {
  if (!katexPromise) {
    katexPromise = import("katex").then((module) => module.default);
  }

  return katexPromise;
};
