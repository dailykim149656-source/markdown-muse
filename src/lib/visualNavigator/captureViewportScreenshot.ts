import html2canvas from "html2canvas";
import type { AiAssistantScreenshotPayload } from "@/types/aiAssistant";

const shouldIgnoreElement = (element: Element) =>
  element instanceof HTMLElement
  && (element.dataset.visualIgnore === "true" || element.closest("[data-visual-ignore='true']") !== null);

export const captureViewportScreenshot = async (): Promise<AiAssistantScreenshotPayload> => {
  const canvas = await html2canvas(document.body, {
    backgroundColor: null,
    height: window.innerHeight,
    ignoreElements: shouldIgnoreElement,
    logging: false,
    scale: 1,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    useCORS: true,
    width: window.innerWidth,
    windowHeight: window.innerHeight,
    windowWidth: window.innerWidth,
    x: window.scrollX,
    y: window.scrollY,
  });

  const dataUrl = canvas.toDataURL("image/png");

  return {
    capturedAt: Date.now(),
    dataBase64: dataUrl.replace(/^data:image\/png;base64,/, ""),
    height: window.innerHeight,
    mimeType: "image/png",
    width: window.innerWidth,
  };
};
