/**
 * Markdown round-trip utilities.
 * Custom Turndown rules (HTML→MD) and marked extensions (MD→HTML)
 * for Tiptap custom nodes: math, mermaid, admonition, footnotes.
 */

import TurndownService from "turndown";
import { marked } from "marked";

// ─── Turndown: HTML → Markdown ───────────────────────────────────

export function createTurndownService(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  // Inline math: <span data-type="math" latex="..."> → $...$
  td.addRule("inlineMath", {
    filter(node) {
      return node.nodeName === "SPAN" && node.getAttribute("data-type") === "math";
    },
    replacement(_content, node) {
      const latex = (node as HTMLElement).getAttribute("latex") || "";
      return latex ? `$${latex}$` : "";
    },
  });

  // Block math: <div data-type="math-block" latex="..."> → $$...$$
  td.addRule("blockMath", {
    filter(node) {
      return node.nodeName === "DIV" && node.getAttribute("data-type") === "math-block";
    },
    replacement(_content, node) {
      const latex = (node as HTMLElement).getAttribute("latex") || "";
      return latex ? `\n\n$$\n${latex}\n$$\n\n` : "";
    },
  });

  // Mermaid: <div data-type="mermaid" code="..."> → ```mermaid\n...\n```
  td.addRule("mermaid", {
    filter(node) {
      return node.nodeName === "DIV" && node.getAttribute("data-type") === "mermaid";
    },
    replacement(_content, node) {
      const code = (node as HTMLElement).getAttribute("code") || "";
      return code ? `\n\n\`\`\`mermaid\n${code}\n\`\`\`\n\n` : "";
    },
  });

  // Admonition: <div data-type="admonition" ...> → > [!type] title\n> content
  td.addRule("admonition", {
    filter(node) {
      return node.nodeName === "DIV" && node.getAttribute("data-type") === "admonition";
    },
    replacement(content, node) {
      const el = node as HTMLElement;
      const type = el.getAttribute("data-admonition-type") || "note";
      const title = el.getAttribute("title") || "";
      const color = el.getAttribute("data-admonition-color") || "";
      const icon = el.getAttribute("data-admonition-icon") || "";

      // Build metadata for custom attrs
      let meta = type.toUpperCase();
      if (title) meta += ` ${title}`;

      // Store color/icon as HTML comment for lossless round-trip
      let extraMeta = "";
      if ((color && color !== "blue") || (icon && icon !== "info")) {
        const parts: string[] = [];
        if (color) parts.push(`color=${color}`);
        if (icon) parts.push(`icon=${icon}`);
        extraMeta = ` <!-- ${parts.join(" ")} -->`;
      }

      // Convert inner content to blockquote lines
      const innerMd = td.turndown(el.innerHTML).trim();
      const lines = innerMd.split("\n").map((l) => `> ${l}`).join("\n");

      return `\n\n> [!${meta}]${extraMeta}\n${lines}\n\n`;
    },
  });

  // Footnote ref: <span data-type="footnote-ref" data-footnote-id="..."> → [^id]
  td.addRule("footnoteRef", {
    filter(node) {
      return node.nodeName === "SPAN" && node.getAttribute("data-type") === "footnote-ref";
    },
    replacement(_content, node) {
      const id = (node as HTMLElement).getAttribute("data-footnote-id") || "";
      return `[^${id}]`;
    },
  });

  // Footnote item: <div data-type="footnote-item" data-footnote-id="..." text> → [^id]: text
  td.addRule("footnoteItem", {
    filter(node) {
      return node.nodeName === "DIV" && node.getAttribute("data-type") === "footnote-item";
    },
    replacement(_content, node) {
      const el = node as HTMLElement;
      const id = el.getAttribute("data-footnote-id") || "";
      const text = el.textContent?.trim() || "";
      return `\n[^${id}]: ${text}\n`;
    },
  });

  return td;
}

// ─── Marked: Markdown → HTML ─────────────────────────────────────

/**
 * Create a configured marked instance with custom extensions.
 */
export function createMarkedInstance(): typeof marked {
  const extensions: marked.TokenizerAndRendererExtension[] = [];

  // Block math: $$\n...\n$$
  extensions.push({
    name: "blockMath",
    level: "block",
    start(src: string) {
      return src.indexOf("$$");
    },
    tokenizer(src: string) {
      const match = src.match(/^\$\$\n([\s\S]+?)\n\$\$/);
      if (match) {
        return {
          type: "blockMath",
          raw: match[0],
          latex: match[1].trim(),
        };
      }
      return undefined;
    },
    renderer(token: any) {
      return `<div data-type="math-block" latex="${escapeAttr(token.latex)}" display="block"></div>`;
    },
  });

  // Inline math: $...$  (not $$)
  extensions.push({
    name: "inlineMath",
    level: "inline",
    start(src: string) {
      return src.indexOf("$");
    },
    tokenizer(src: string) {
      const match = src.match(/^\$([^\$\n]+?)\$/);
      if (match) {
        return {
          type: "inlineMath",
          raw: match[0],
          latex: match[1],
        };
      }
      return undefined;
    },
    renderer(token: any) {
      return `<span data-type="math" latex="${escapeAttr(token.latex)}" display="inline"></span>`;
    },
  });

  // Mermaid code blocks: ```mermaid\n...\n```
  // Override the default code renderer
  const originalRenderer = new marked.Renderer();
  const customRenderer = new marked.Renderer();
  customRenderer.code = function ({ text, lang }: { text: string; lang?: string }) {
    if (lang === "mermaid") {
      return `<div data-type="mermaid" code="${escapeAttr(text)}"></div>`;
    }
    return originalRenderer.code.call(this, { text, lang } as any);
  };

  // Admonition: > [!TYPE title]\n> content  (GitHub-style callout)
  extensions.push({
    name: "admonition",
    level: "block",
    start(src: string) {
      return src.indexOf("> [!");
    },
    tokenizer(src: string) {
      const match = src.match(
        /^> \[!([A-Z_]+)(?: ([^\]]*))?\](?: <!-- (.*?) -->)?\n((?:>.*(?:\n|$))*)/
      );
      if (match) {
        const type = match[1].toLowerCase();
        const title = match[2]?.trim() || "";
        const metaComment = match[3] || "";
        const bodyLines = match[4]
          .split("\n")
          .map((l) => l.replace(/^>\s?/, ""))
          .join("\n")
          .trim();

        // Parse metadata from comment
        let color = "";
        let icon = "";
        if (metaComment) {
          const colorMatch = metaComment.match(/color=(\S+)/);
          const iconMatch = metaComment.match(/icon=(\S+)/);
          if (colorMatch) color = colorMatch[1];
          if (iconMatch) icon = iconMatch[1];
        }

        return {
          type: "admonition",
          raw: match[0],
          admonitionType: type,
          title,
          color,
          icon,
          body: bodyLines,
        };
      }
      return undefined;
    },
    renderer(token: any) {
      const bodyHtml = marked.parse(token.body, { async: false }) as string;
      const attrs = [
        `data-type="admonition"`,
        `data-admonition-type="${escapeAttr(token.admonitionType)}"`,
      ];
      if (token.title) attrs.push(`title="${escapeAttr(token.title)}"`);
      if (token.color) attrs.push(`data-admonition-color="${escapeAttr(token.color)}"`);
      if (token.icon) attrs.push(`data-admonition-icon="${escapeAttr(token.icon)}"`);
      return `<div ${attrs.join(" ")}>${bodyHtml}</div>`;
    },
  });

  // Footnote reference: [^id]
  extensions.push({
    name: "footnoteRef",
    level: "inline",
    start(src: string) {
      const idx = src.indexOf("[^");
      return idx >= 0 ? idx : -1;
    },
    tokenizer(src: string) {
      // Don't match footnote definitions (those start at line beginning with [^id]:)
      const match = src.match(/^\[\^([^\]]+)\](?!:)/);
      if (match) {
        return {
          type: "footnoteRef",
          raw: match[0],
          id: match[1],
        };
      }
      return undefined;
    },
    renderer(token: any) {
      return `<span data-type="footnote-ref" data-footnote-id="${escapeAttr(token.id)}">[*]</span>`;
    },
  });

  // Footnote definition: [^id]: text
  extensions.push({
    name: "footnoteItem",
    level: "block",
    start(src: string) {
      return src.indexOf("[^");
    },
    tokenizer(src: string) {
      const match = src.match(/^\[\^([^\]]+)\]:\s*(.+)$/m);
      if (match) {
        return {
          type: "footnoteItem",
          raw: match[0],
          id: match[1],
          text: match[2].trim(),
        };
      }
      return undefined;
    },
    renderer(token: any) {
      return `<div data-type="footnote-item" data-footnote-id="${escapeAttr(token.id)}">${escapeHtml(token.text)}</div>`;
    },
  });

  marked.use({
    extensions,
    renderer: customRenderer,
  });

  return marked;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
