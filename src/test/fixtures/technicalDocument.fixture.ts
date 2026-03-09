import type { JSONContent } from "@tiptap/core";

export const technicalDocumentFixture: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1, textAlign: "center" },
      content: [{ type: "text", text: "System Overview" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "See " },
        { type: "crossReference", attrs: { targetLabel: "fig:system", referenceKind: "figure" } },
        { type: "text", text: " and visit " },
        {
          type: "text",
          text: "Docsy",
          marks: [
            { type: "bold" },
            { type: "link", attrs: { href: "https://example.com", title: "Docsy" } },
          ],
        },
        { type: "text", text: " with formula " },
        { type: "math", attrs: { latex: "E=mc^2", display: "inline" } },
        { type: "text", text: "." },
      ],
    },
    {
      type: "admonition",
      attrs: { type: "warning", title: "Review", icon: "alert-triangle", color: "yellow" },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Use patch review before applying changes." }],
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Architecture first" }],
            },
          ],
        },
      ],
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Baseline tests" }],
            },
          ],
        },
      ],
    },
    {
      type: "codeBlock",
      attrs: { language: "ts" },
      content: [{ type: "text", text: "const phase = 'ast';" }],
    },
    {
      type: "mermaidBlock",
      attrs: { code: "graph TD\nA-->B" },
    },
    {
      type: "mathBlock",
      attrs: { latex: "\\int_0^1 x^2 dx", display: "block" },
    },
    {
      type: "image",
      attrs: { src: "diagram.png", alt: "diagram", width: 480, align: "center" },
    },
    {
      type: "figureCaption",
      attrs: { captionType: "figure", label: "fig:system", captionText: "System architecture" },
    },
    {
      type: "tableOfContents",
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Name" }] }],
            },
            {
              type: "tableHeader",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Value" }] }],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Phase" }] }],
            },
            {
              type: "tableCell",
              content: [{ type: "paragraph", content: [{ type: "text", text: "AST" }] }],
            },
          ],
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Detailed note" },
        { type: "footnoteRef", attrs: { id: "fn-1" } },
      ],
    },
    {
      type: "footnoteItem",
      attrs: { id: "fn-1", text: "Footnote text" },
    },
  ],
};
