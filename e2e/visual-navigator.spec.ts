import { expect, test, type Page } from "@playwright/test";

const USER_PROFILE_STORAGE_KEY = "docsy:web:user-profile";

const prepareAdvancedEditor = async (page: Page) => {
  await page.addInitScript((storageKey) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(storageKey, "advanced");
  }, USER_PROFILE_STORAGE_KEY);
  await page.goto("/editor?e2e=1", { waitUntil: "domcontentloaded" });
};

const openAiAssistant = async (page: Page) => {
  const trigger = page.locator("[data-visual-target='header-open-ai-assistant']");
  await trigger.click();

  const dialog = page.locator("[data-visual-target='ai-assistant-dialog']");
  if (await dialog.count() === 0) {
    await page.waitForTimeout(500);
    await trigger.click();
  }

  await expect(dialog).toBeVisible();
};

test.describe("visual navigator", () => {
  test("executes a bounded multi-step UI flow with mocked navigator turns", async ({ page }) => {
    let turnCount = 0;

    await page.route("**/api/ai/navigator/turn", async (route) => {
      turnCount += 1;

      if (turnCount === 1) {
        await route.fulfill({
          body: JSON.stringify({
            action: {
              target: {
                dataTarget: "header-google-menu",
                name: "Google Workspace",
                role: "button",
              },
              type: "click",
            },
            confidence: 0.92,
            rationale: "Open the Google Workspace menu first.",
            statusText: "Opening Google Workspace.",
          }),
          contentType: "application/json",
          status: 200,
        });
        return;
      }

      if (turnCount === 2) {
        await route.fulfill({
          body: JSON.stringify({
            action: {
              target: {
                dataTarget: "workspace-manage-connection",
                name: "Manage Connection",
                role: "menuitem",
              },
              type: "click",
            },
            confidence: 0.9,
            rationale: "The connection dialog is the next visible target.",
            statusText: "Opening the connection dialog.",
          }),
          contentType: "application/json",
          status: 200,
        });
        return;
      }

      await route.fulfill({
        body: JSON.stringify({
          action: {
            summary: "The requested visual flow is complete.",
            type: "done",
          },
          confidence: 0.88,
          rationale: "The workspace connection dialog is visible.",
          statusText: "Visual navigation complete.",
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    await prepareAdvancedEditor(page);

    await openAiAssistant(page);
    await page.locator("[data-visual-target='ai-dialog-tab-navigator']").click();
    await page.locator("[data-visual-target='navigator-intent']").fill("Open the Google Workspace connection dialog.");
    await page.locator("[data-visual-target='navigator-start']").click();

    await expect(page.locator("[data-visual-target='visual-navigator-overlay']")).toBeVisible();
    await expect(page.locator("[data-visual-target='workspace-connection-dialog']")).toBeVisible();
    await expect(page.locator("[data-visual-target='visual-navigator-overlay']")).toContainText("Visual navigation complete.");
    expect(turnCount).toBe(3);
  });
});
