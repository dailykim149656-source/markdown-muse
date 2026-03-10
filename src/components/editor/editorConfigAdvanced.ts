import MermaidBlock from "./extensions/MermaidBlock";
import { MathExtension, MathBlockExtension } from "./extensions/MathExtension";

export const createAdvancedEditorExtensions = () => [
  MathExtension,
  MathBlockExtension,
  MermaidBlock,
];
