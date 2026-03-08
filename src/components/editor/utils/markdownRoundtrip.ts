/**
 * Markdown round-trip utilities.
 * Custom Turndown pre/post-processing (HTML→MD) and marked extensions (MD→HTML)
 * for Tiptap custom nodes: math, mermaid, admonition, footnotes.
 */

import TurndownService from "turndown";
import { marked } from "marked";

// ─── Turndown: HTML → Markdown ───────────────────────────────────

const PLACEHOLDER_PREFIX = "\x00CUSTOM_";
const PLACEHOLDER_SUFFIX = "\x00";

/**
 * Pre-process HTML to replace custom Tiptap nodes with placeholders
 * that Turndown won't strip (since they're empty/atom elements).
 */
function preProcessHtml(html: string): { html: string; replacements: Map<string, string> } {
  const replacements = new Map<string, string>();
  let counter = 0;

  const makeKey = () => `${PLACEHOLDER_PREFIX}${counter++}${PLACEHOLDER_SUFFIX}`;

  let processed = html;

  // Inline math: <span data-type="math" latex="..." display="inline"></span>
  processed = processed.replace(
    /<span[^>]*data-type="math"[^>]*><\/span>/g,
    (match) => {
      const latex = match.match(/latex="([^"]*)"/)?.[1] || "";
      if (!latex) return match;
      const key = makeKey();
      const decoded = latex.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
      replacements.set(key, `$${decoded}$`);
      return key;
    }
  );

  // Block math: <div data-type="math-block" latex="..." display="block"></div>
  processed = processed.replace(
    /<div[^>]*data-type="math-block"[^>]*><\/div>/g,
    (match) => {
      const latex = match.match(/latex="([^"]*)"/)?.[1] || "";
      if (!latex) return match;
      const key = makeKey();
      const decoded = latex.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
      replacements.set(key, `\n\n$$\n${decoded}\n$$\n\n`);
      return `<p>${key}</p>`;
    }
  );

  // Mermaid: <div data-type="mermaid" code="..."></div>
  processed = processed.replace(
    /<div[^>]*data-type="mermaid"[^>]*><\/div>/g,
    (match) => {
      const code = match.match(/code="([^"]*)"/)?.[1] || "";
      if (!code) return match;
      const key = makeKey();
      const decoded = code.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
      replacements.set(key, `\n\n\`\`\`mermaid\n${decoded}\n\`\`\`\n\n`);
      return `<p>${key}</p>`;
    }
  );

  // Footnote ref: <span data-type="footnote-ref" data-footnote-id="...">...</span>
  processed = processed.replace(
    /<span[^>]*data-type="footnote-ref"[^>]*data-footnote-id="([^"]*)"[^>]*>[^<]*<\/span>/g,
    (_match, id) => {
      const key = makeKey();
      replacements.set(key, `[^${id}]`);
      return key;
    }
  );

  // Footnote item: <div data-type="footnote-item" data-footnote-id="...">text</div>
  processed = processed.replace(
    /<div[^>]*data-type="footnote-item"[^>]*data-footnote-id="([^"]*)"[^>]*>([^<]*)<\/div>/g,
    (_match, id, text) => {
      const key = makeKey();
      replacements.set(key, `\n[^${id}]: ${text.trim()}\n`);
      return `<p>${key}</p>`;
    }
  );

  return { html: processed, replacements };
}

/** Post-process markdown to restore placeholders to proper syntax */
function postProcessMd(md: string, replacements: Map<string, string>): string {
  let result = md;
  for (const [key, value] of replacements) {
    result = result.replace(key, value);
  }
  // Clean up excessive blank lines
  return result.replace(/\n{3,}/g, "\n\n");
}

export function createTurndownService(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  // Admonition: <div data-type="admonition" ...> → > [!type] title\n> content
  // (Admonitions have content so Turndown processes them normally)
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

      let meta = type.toUpperCase();
      if (title) meta += ` ${title}`;

      // Store color/icon as HTML comment for lossless round-trip
      let extraMeta = "";
      const defaultMap: Record<string, { color: string; icon: string }> = {
        note: { color: "blue", icon: "info" },
        warning: { color: "yellow", icon: "alert-triangle" },
        tip: { color: "green", icon: "lightbulb" },
        danger: { color: "red", icon: "shield-alert" },
      };
      const defaults = defaultMap[type] || { color: "blue", icon: "info" };
      if ((color && color !== defaults.color) || (icon && icon !== defaults.icon)) {
        const parts: string[] = [];
        if (color) parts.push(`color=${color}`);
        if (icon) parts.push(`icon=${icon}`);
        extraMeta = ` <!-- ${parts.join(" ")} -->`;
      }

      const lines = content.trim().split("\n").map((l) => `> ${l}`).join("\n");
      return `\n\n> [!${meta}]${extraMeta}\n${lines}\n\n`;
    },
  });

  // Wrap the turndown method to add pre/post processing
  const originalTurndown = td.turndown.bind(td);
  td.turndown = function (input: string | TurndownService.Node): string {
    if (typeof input !== "string") return originalTurndown(input);
    const { html, replacements } = preProcessHtml(input);
    const md = originalTurndown(html);
    return postProcessMd(md, replacements);
  };

  return td;
}

// ─── Marked: Markdown → HTML ─────────────────────────────────────

export function createMarkedInstance(): typeof marked {
  const extensions: any[] = [];

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
        return { type: "blockMath", raw: match[0], latex: match[1].trim() };
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
        return { type: "inlineMath", raw: match[0], latex: match[1] };
      }
      return undefined;
    },
    renderer(token: any) {
      return `<span data-type="math" latex="${escapeAttr(token.latex)}" display="inline"></span>`;
    },
  });

  // Mermaid code blocks - handled via renderer override
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
      const match = src.match(/^\[\^([^\]]+)\](?!:)/);
      if (match) {
        return { type: "footnoteRef", raw: match[0], id: match[1] };
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
        return { type: "footnoteItem", raw: match[0], id: match[1], text: match[2].trim() };
      }
      return undefined;
    },
    renderer(token: any) {
      return `<div data-type="footnote-item" data-footnote-id="${escapeAttr(token.id)}">${escapeHtml(token.text)}</div>`;
    },
  });

  marked.use({ extensions, renderer: customRenderer });
  return marked;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
