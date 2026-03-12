import { expect, test, type Page } from "@playwright/test";

const AUTOSAVE_KEY = "docsy-autosave-v2";
const KNOWLEDGE_DB_NAME = "docsy-knowledge-index";
const KNOWLEDGE_FALLBACK_KEY = "docsy-knowledge-index-fallback-v2";
const SOURCE_SNAPSHOT_KEY = "docsy.source-snapshots.v1";
const UI_LANGUAGE_KEY = "docsy-ui-language";

const clearGraphState = async (page: Page) => {
  await page.goto("/editor");
  await page.evaluate(async ({
    autosaveKey,
    dbName,
    knowledgeFallbackKey,
    sourceSnapshotKey,
    uiLanguageKey,
  }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.removeItem(knowledgeFallbackKey);
    localStorage.removeItem(sourceSnapshotKey);
    localStorage.setItem(uiLanguageKey, "en");

    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });

    const now = Date.now();
    const documents = [
      {
        id: "doc-alpha",
        name: "alpha",
        mode: "markdown",
        content: "# Alpha\n\nSee [Beta](beta.md#missing-anchor)\n",
        createdAt: now - 3000,
        updatedAt: now - 1000,
        ast: null,
        metadata: {},
        sourceSnapshots: {
          markdown: "# Alpha\n\nSee [Beta](beta.md#missing-anchor)\n",
        },
        storageKind: "docsy",
        tiptapJson: null,
      },
      {
        id: "doc-beta",
        name: "beta",
        mode: "markdown",
        content: "# Beta\n\n## Intro\n\nReference target.\n",
        createdAt: now - 2500,
        updatedAt: now - 900,
        ast: null,
        metadata: {},
        sourceSnapshots: {
          markdown: "# Beta\n\n## Intro\n\nReference target.\n",
        },
        storageKind: "docsy",
        tiptapJson: null,
      },
      {
        id: "doc-gamma",
        name: "gamma",
        mode: "markdown",
        content: "# Gamma\n\nIndependent note.\n",
        createdAt: now - 2000,
        updatedAt: now - 800,
        ast: null,
        metadata: {},
        sourceSnapshots: {
          markdown: "# Gamma\n\nIndependent note.\n",
        },
        storageKind: "docsy",
        tiptapJson: null,
      },
    ];

    localStorage.setItem(autosaveKey, JSON.stringify({
      activeDocId: "doc-alpha",
      documents,
      lastSaved: now,
      version: 2,
    }));
  }, {
    autosaveKey: AUTOSAVE_KEY,
    dbName: KNOWLEDGE_DB_NAME,
    knowledgeFallbackKey: KNOWLEDGE_FALLBACK_KEY,
    sourceSnapshotKey: SOURCE_SNAPSHOT_KEY,
    uiLanguageKey: UI_LANGUAGE_KEY,
  });
};

const getPrimaryEditor = (page: Page) => page.locator(".ProseMirror").first();

test.describe("workspace graph regressions", () => {
  test.beforeEach(async ({ page }) => {
    await clearGraphState(page);
    await page.goto("/editor/graph?e2e=1");

    await expect(page.getByText("Graph canvas")).toBeVisible();
    await expect(page.getByTestId("graph-canvas-svg")).toBeVisible();
    await expect(page.getByTestId("graph-canvas-node-doc:doc-alpha")).toBeVisible();
    await expect(page.getByTestId("graph-canvas-node-doc:doc-beta")).toBeVisible();
    await expect(page.getByTestId("graph-canvas-node-doc:doc-gamma")).toBeVisible();
  });

  test("canvas hover, focus reset, and fullscreen remain usable", async ({ page }) => {
    await page.getByTestId("graph-canvas-node-doc:doc-beta").hover();
    await expect(page.getByTestId("graph-canvas-hover-card")).toContainText(/beta/i);
    await expect(page.getByTestId("graph-canvas-hover-card")).toContainText("Double-click this node to open its document.");

    await page.getByRole("button", { name: "Focus selection" }).click();
    await expect(page.getByTestId("graph-canvas-node-doc:doc-gamma")).toHaveCount(0);

    await page.getByRole("button", { name: "Reset view" }).click();
    await expect(page.getByTestId("graph-canvas-node-doc:doc-gamma")).toBeVisible();

    await page.getByRole("button", { name: "Fullscreen" }).click();
    await expect(page.getByTestId("graph-canvas-fullscreen")).toBeVisible();
    await page.getByRole("button", { name: "Exit fullscreen" }).first().click();
    await expect(page.getByTestId("graph-canvas-fullscreen")).toHaveCount(0);
  });

  test("issues mode narrows the graph to issue-linked documents", async ({ page }) => {
    await page.getByRole("button", { name: "Issues graph" }).click();

    await expect(page.getByTestId("graph-canvas-node-doc:doc-alpha")).toBeVisible();
    await expect(page.getByTestId("graph-canvas-node-doc:doc-beta")).toBeVisible();
    await expect(page.getByTestId("graph-canvas-node-doc:doc-gamma")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Broken reference", exact: true })).toBeVisible();
  });

  test("graph context can create a queue item and open patch review", async ({ page }) => {
    await page.goto("/editor/graph?e2e=1&context=change&source=doc%3Adoc-alpha&target=doc%3Adoc-beta&node=doc%3Adoc-beta");

    await expect(page.getByText("Context chain")).toBeVisible();
    await expect(page.getByRole("button", { name: "Suggest update" })).toBeVisible();

    await page.getByRole("button", { name: "Suggest update" }).click();
    await expect(page).toHaveURL(/\/editor/);

    await page.getByRole("button", { name: "Toggle sidebar" }).click();
    await page.getByRole("button", { name: "Knowledge" }).click();

    await expect(page.getByRole("heading", { name: "Suggestion Queue" })).toBeVisible();
    await expect(page.getByText("alpha").first()).toBeVisible();
    await expect(page.getByText("beta").first()).toBeVisible();
    await expect(page.getByText("Editor is not ready yet.").first()).toBeVisible();

    await page.getByRole("button", { name: "Retry", exact: true }).click();
    const patchReviewDialog = page.getByRole("dialog");
    await expect(patchReviewDialog.getByText("Patch Review", { exact: true })).toBeVisible({ timeout: 30000 });
    await expect(patchReviewDialog.getByText("Patches", { exact: true })).toBeVisible();
    await expect(patchReviewDialog.getByText("Provenance", { exact: true })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(patchReviewDialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open review" })).toBeEnabled();

    await page.getByRole("button", { name: "Open review" }).click();
    await expect(page.getByRole("dialog").getByText("Patch Review", { exact: true })).toBeVisible();
  });

  test("queue item can reopen graph context", async ({ page }) => {
    await page.goto("/editor/graph?e2e=1&context=change&source=doc%3Adoc-alpha&target=doc%3Adoc-beta&node=doc%3Adoc-beta");

    await expect(page.getByText("Context chain")).toBeVisible();
    await page.getByRole("button", { name: "Suggest update" }).click();
    await expect(page).toHaveURL(/\/editor/);

    await page.getByRole("button", { name: "Toggle sidebar" }).click();
    await page.getByRole("button", { name: "Knowledge" }).click();
    await expect(page.getByRole("heading", { name: "Suggestion Queue" })).toBeVisible();

    const suggestionQueueSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Suggestion Queue" }),
    });
    await suggestionQueueSection.getByRole("button", { name: "Explore", exact: true }).click();

    await expect(page).toHaveURL(/\/editor\/graph/);
    await expect(page.getByText("Context chain")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open source" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open target" })).toBeVisible();
  });

  test("ai-assisted suggestions do not mutate the target document before explicit apply", async ({ page }) => {
    await page.goto("/editor/graph?e2e=1&context=change&source=doc%3Adoc-alpha&target=doc%3Adoc-beta&node=doc%3Adoc-beta");

    await expect(page.getByText("Context chain")).toBeVisible();
    await page.getByRole("button", { name: "Suggest update" }).click();
    await expect(page).toHaveURL(/\/editor/);

    await page.getByRole("button", { name: "Toggle sidebar" }).click();
    await page.getByRole("button", { name: "Knowledge" }).click();
    await expect(page.getByRole("heading", { name: "Suggestion Queue" })).toBeVisible();
    await expect(page.getByText("Editor is not ready yet.").first()).toBeVisible();

    await page.getByRole("button", { name: "Retry", exact: true }).click();
    const patchReviewDialog = page.getByRole("dialog");
    await expect(patchReviewDialog.getByText("Patch Review", { exact: true })).toBeVisible({ timeout: 30000 });

    await page.keyboard.press("Escape");
    await expect(patchReviewDialog).toHaveCount(0);

    await page.getByRole("button", { name: /beta\s*\.md/i }).click();
    await expect(getPrimaryEditor(page)).toBeVisible();
    await expect(getPrimaryEditor(page)).toContainText("Reference target.");

    const betaEditorText = (await getPrimaryEditor(page).innerText())
      .trim()
      .replace(/\n{2,}/g, "\n");
    expect(betaEditorText).toBe("Beta\nIntro\nReference target.");
  });
});
