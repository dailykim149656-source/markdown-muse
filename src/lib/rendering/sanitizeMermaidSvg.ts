import DOMPurify from "dompurify";

export const sanitizeMermaidSvg = (svg: string) =>
  DOMPurify.sanitize(svg, {
    FORBID_TAGS: ["foreignObject", "script"],
    USE_PROFILES: {
      svg: true,
      svgFilters: true,
    },
  });
