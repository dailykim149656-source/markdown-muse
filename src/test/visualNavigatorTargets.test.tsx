import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveNavigatorActionTarget } from "@/lib/visualNavigator/domTargets";

describe("resolveNavigatorActionTarget", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.spyOn(window, "getComputedStyle").mockImplementation(() => ({
      display: "block",
      visibility: "visible",
    } as CSSStyleDeclaration));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("prefers stable data targets when present", () => {
    document.body.innerHTML = `
      <button data-visual-target="header-google-menu">Google Workspace</button>
      <button>Google Workspace</button>
    `;

    const buttons = document.querySelectorAll("button");
    buttons.forEach((button, index) => {
      Object.defineProperty(button, "innerText", {
        configurable: true,
        value: index === 0 ? "Google Workspace" : "Google Workspace",
      });
      button.getBoundingClientRect = () => ({
        bottom: 40,
        height: 32,
        left: 12,
        right: 160,
        top: 8,
        width: 148,
        x: 12,
        y: 8,
        toJSON: () => ({}),
      } as DOMRect);
    });

    const result = resolveNavigatorActionTarget({
      dataTarget: "header-google-menu",
      role: "button",
    });

    expect(result.outcome).toBe("resolved");
    expect(result.description).toContain("Google Workspace");
  });

  it("reports ambiguity when multiple semantic matches have the same score", () => {
    document.body.innerHTML = `
      <button>Open</button>
      <button>Open</button>
    `;

    document.querySelectorAll("button").forEach((button, index) => {
      Object.defineProperty(button, "innerText", {
        configurable: true,
        value: "Open",
      });
      button.getBoundingClientRect = () => ({
        bottom: 40 + index * 40,
        height: 32,
        left: 12,
        right: 112,
        top: 8 + index * 40,
        width: 100,
        x: 12,
        y: 8 + index * 40,
        toJSON: () => ({}),
      } as DOMRect);
    });

    const result = resolveNavigatorActionTarget({
      name: "Open",
      role: "button",
    });

    expect(result.outcome).toBe("ambiguous");
  });
});
