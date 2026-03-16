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
  const dialog = page.locator("[data-visual-target='ai-assistant-dialog']");

  await trigger.click();
  await page.waitForTimeout(500);

  if (await dialog.isVisible()) {
    return;
  }

  await trigger.click();

  await expect(dialog).toBeVisible();
};

test.describe("visual navigator", () => {
  test("starts a run from a suggested goal chip", async ({ page }) => {
    let turnCount = 0;

    await page.route("**/api/ai/navigator/suggest-goals", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          suggestions: [{
            confidence: 0.93,
            intent: "Open the Google Workspace connection dialog.",
            label: "Open Google Workspace",
            rationale: "Google controls are visible.",
          }],
        }),
        contentType: "application/json",
        status: 200,
      });
    });

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
    await page.locator("[data-visual-target='navigator-suggested-goal-0']").click();

    await expect(page.locator("[data-visual-target='visual-navigator-overlay']")).toBeVisible();
    await expect(page.locator("[data-visual-target='workspace-connection-dialog']")).toBeVisible();
    await expect(page.locator("[data-visual-target='visual-navigator-overlay']")).toContainText("Visual navigation complete.");
    expect(turnCount).toBe(3);
  });

  test("supports quick actions and surfaces recent goals after a run", async ({ page }) => {
    await page.route("**/api/ai/navigator/suggest-goals", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          suggestions: [],
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    await page.route("**/api/ai/navigator/turn", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          action: {
            summary: "Patch Review is ready.",
            type: "done",
          },
          confidence: 0.87,
          rationale: "Use the quick action goal directly.",
          statusText: "Visual navigation complete.",
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    await prepareAdvancedEditor(page);
    await openAiAssistant(page);
    await page.locator("[data-visual-target='ai-dialog-tab-navigator']").click();
    await page.locator("[data-visual-target='navigator-preset-open-patch-review']").click();

    await expect(page.locator("[data-visual-target='visual-navigator-overlay']")).toContainText("Patch Review is ready.");

    await openAiAssistant(page);
    await page.locator("[data-visual-target='ai-dialog-tab-navigator']").click();
    await expect(page.locator("[data-visual-target='navigator-recent-goal-0']")).toContainText("Open Patch Review");
  });
});
