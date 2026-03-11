import type { EditorMode } from "@/types/document";
import type { AiAssistantScreenshotPayload } from "@/types/aiAssistant";

interface CaptureWorkspaceScreenshotOptions {
  documentName: string;
  markdown: string;
  mode: EditorMode;
}

const WIDTH = 1280;
const HEIGHT = 720;

const extractHeadings = (markdown: string) =>
  markdown
    .split(/\r?\n/)
    .filter((line) => /^#{1,6}\s+/.test(line))
    .slice(0, 6)
    .map((line) => line.replace(/^#{1,6}\s+/, "").trim())
    .filter((line) => line.length > 0);

const trimPreview = (markdown: string, maxLength: number) => {
  const normalized = markdown.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const wrapText = (value: string, maxCharsPerLine: number, maxLines: number) => {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word.slice(0, maxCharsPerLine));
      current = word.slice(maxCharsPerLine);
    }

    if (lines.length >= maxLines) {
      break;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
};

const buildSvg = ({ documentName, markdown, mode }: CaptureWorkspaceScreenshotOptions) => {
  const headings = extractHeadings(markdown);
  const preview = trimPreview(markdown, 520);
  const previewLines = wrapText(preview || "No document content available.", 72, 8);
  const headingLines = headings.length > 0 ? headings : ["No headings detected"];

  const headingMarkup = headingLines
    .map((heading, index) => `
      <text x="80" y="${232 + index * 34}" font-size="22" fill="#102542">- ${escapeXml(heading)}</text>
    `)
    .join("");

  const previewMarkup = previewLines
    .map((line, index) => `
      <text x="80" y="${504 + index * 30}" font-size="22" fill="#1d3557">${escapeXml(line)}</text>
    `)
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f4efe6" />
          <stop offset="100%" stop-color="#dce8f2" />
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)" />
      <rect x="48" y="44" width="1184" height="632" rx="28" fill="#fffdf8" stroke="#d6c7b8" stroke-width="2" />
      <rect x="48" y="44" width="1184" height="88" rx="28" fill="#102542" />
      <text x="80" y="98" font-size="36" font-weight="700" fill="#fffdf8">Docsy editor snapshot</text>
      <text x="80" y="164" font-size="26" font-weight="700" fill="#102542">Document</text>
      <text x="260" y="164" font-size="26" fill="#1d3557">${escapeXml(documentName)}</text>
      <text x="820" y="164" font-size="26" font-weight="700" fill="#102542">Mode</text>
      <text x="920" y="164" font-size="26" fill="#1d3557">${escapeXml(mode)}</text>
      <text x="80" y="208" font-size="26" font-weight="700" fill="#102542">Detected headings</text>
      ${headingMarkup}
      <text x="80" y="444" font-size="26" font-weight="700" fill="#102542">Document preview</text>
      ${previewMarkup}
      <text x="80" y="644" font-size="18" fill="#57636f">Generated as an image payload for Gemini multimodal input.</text>
    </svg>
  `.trim();
};

const svgToPngDataUrl = async (svg: string) => {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Unable to render the workspace snapshot image."));
      nextImage.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context is unavailable.");
    }

    context.drawImage(image, 0, 0, WIDTH, HEIGHT);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const captureWorkspaceScreenshot = async (
  options: CaptureWorkspaceScreenshotOptions,
): Promise<AiAssistantScreenshotPayload> => {
  const svg = buildSvg(options);
  const dataUrl = await svgToPngDataUrl(svg);
  const dataBase64 = dataUrl.replace(/^data:image\/png;base64,/, "");

  return {
    capturedAt: Date.now(),
    dataBase64,
    height: HEIGHT,
    mimeType: "image/png",
    width: WIDTH,
  };
};
