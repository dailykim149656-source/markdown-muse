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
});
