import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const PREVIEW_PORT = 4178;
const BASE_URL = `http://127.0.0.1:${PREVIEW_PORT}`;
const ASSET_DIR = path.join(process.cwd(), "src", "assets");

const AUTOSAVE_KEY = "docsy-autosave-v2";
const KNOWLEDGE_DB_NAME = "docsy-knowledge-index";
const KNOWLEDGE_FALLBACK_KEY = "docsy-knowledge-index-fallback-v2";
const SOURCE_SNAPSHOT_KEY = "docsy.source-snapshots.v1";
const UI_LANGUAGE_KEY = "docsy-ui-language";
const WORKSPACE_API_BASE = "http://localhost:8787";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForServer = async (url, attempts = 60) => {
  for (let index = 0; index < attempts; index += 1) {
    const ok = await new Promise((resolve) => {
      const request = httpRequest(url, { method: "GET" }, (response) => {
        resolve(Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 500));
        response.resume();
      });

      request.on("error", () => resolve(false));
      request.end();
    });

    if (ok) {
      return;
    }

    await wait(500);
  }

  throw new Error(`Preview server did not become ready at ${url}.`);
};

const createSeedDocuments = () => {
  const now = Date.now();

  return [
    {
      id: "doc-alpha",
      name: "alpha",
      mode: "markdown",
      content: "# Alpha\n\nSee [Beta](beta.md#missing-anchor)\n\n## Procedure\n\n1. Review upstream source.\n2. Queue downstream maintenance.\n",
      createdAt: now - 3000,
      updatedAt: now - 1000,
      ast: null,
      metadata: {},
      sourceSnapshots: {
        markdown: "# Alpha\n\nSee [Beta](beta.md#missing-anchor)\n\n## Procedure\n\n1. Review upstream source.\n2. Queue downstream maintenance.\n",
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
      workspaceBinding: {
        documentKind: "google_docs",
        driveModifiedTime: new Date(now - 60_000).toISOString(),
        fileId: "google-doc-beta",
        importedAt: now - 86_400_000,
        lastSyncedAt: now - 30_000,
        mimeType: "application/vnd.google-apps.document",
        provider: "google_drive",
        revisionId: "rev-beta-4",
        syncStatus: "synced",
        syncWarnings: [
          "Google Docs tables and code blocks can lose formatting fidelity during round-trip sync.",
        ],
      },
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
};

const seedWorkspace = async (page) => {
  const documents = createSeedDocuments();

  await page.goto(`${BASE_URL}/editor`, { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({
    autosaveKey,
    dbName,
    documents,
    knowledgeFallbackKey,
    sourceSnapshotKey,
    uiLanguageKey,
  }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.removeItem(knowledgeFallbackKey);
    localStorage.removeItem(sourceSnapshotKey);
    localStorage.setItem(uiLanguageKey, "en");

    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });

    localStorage.setItem(autosaveKey, JSON.stringify({
      activeDocId: "doc-alpha",
      documents,
      lastSaved: Date.now(),
      version: 2,
    }));
  }, {
    autosaveKey: AUTOSAVE_KEY,
    dbName: KNOWLEDGE_DB_NAME,
    documents,
    knowledgeFallbackKey: KNOWLEDGE_FALLBACK_KEY,
    sourceSnapshotKey: SOURCE_SNAPSHOT_KEY,
    uiLanguageKey: UI_LANGUAGE_KEY,
  });
};

const saveScreenshot = async (locatorOrPage, name, options = {}) => {
  const targetPath = path.join(ASSET_DIR, name);
  await locatorOrPage.screenshot({ path: targetPath, ...options });
};

const mockWorkspaceApi = async (page) => {
  await page.route(`${WORKSPACE_API_BASE}/api/**`, async (route) => {
    const { pathname } = new URL(route.request().url());

    if (pathname === "/api/auth/session") {
      await route.fulfill({
        body: JSON.stringify({
          connected: true,
          provider: "google_drive",
          user: {
            email: "docs@example.com",
            name: "Docs Operator",
          },
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    if (pathname === "/api/workspace/files") {
      await route.fulfill({
        body: JSON.stringify({
          files: [
            {
              fileId: "google-doc-runbook",
              mimeType: "application/vnd.google-apps.document",
              modifiedTime: new Date(Date.now() - 300_000).toISOString(),
              name: "Incident Runbook",
              revisionId: "drive-rev-12",
            },
            {
              fileId: "google-doc-release",
              mimeType: "application/vnd.google-apps.document",
              modifiedTime: new Date(Date.now() - 1_800_000).toISOString(),
              name: "Release Checklist",
              revisionId: "drive-rev-8",
            },
          ],
          nextCursor: null,
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    if (pathname === "/api/workspace/changes") {
      await route.fulfill({
        body: JSON.stringify({
          changes: [],
          lastRescannedAt: null,
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    if (pathname === "/api/workspace/rescan") {
      await route.fulfill({
        body: JSON.stringify({
          changes: [],
          lastRescannedAt: Date.now(),
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({ error: `Unhandled mocked workspace endpoint: ${pathname}` }),
      contentType: "application/json",
      status: 500,
    });
  });
};

const main = async () => {
  await mkdir(ASSET_DIR, { recursive: true });

  const previewProcess = process.platform === "win32"
    ? spawn("cmd.exe", ["/c", "npm", "run", "preview", "--", "--host", "127.0.0.1", "--port", String(PREVIEW_PORT)], {
      cwd: process.cwd(),
      shell: false,
      stdio: "ignore",
    })
    : spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(PREVIEW_PORT)], {
      cwd: process.cwd(),
      shell: false,
      stdio: "ignore",
    });

  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch();

    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await mockWorkspaceApi(page);
      await seedWorkspace(page);

      await page.goto(`${BASE_URL}/editor?e2e=1`, { waitUntil: "domcontentloaded" });
      await page.locator(".ProseMirror").first().waitFor();
      await page.getByRole("button", { name: "Markdown", exact: true }).click();
      await page.getByRole("menuitem", { name: "LaTeX", exact: true }).waitFor();
      await saveScreenshot(page, "marketing-editor-surface.png");

      await page.goto(`${BASE_URL}/editor/graph?e2e=1`, { waitUntil: "domcontentloaded" });
      await page.getByTestId("graph-canvas-svg").waitFor();
      await saveScreenshot(page, "marketing-graph-surface.png");

      await page.goto(`${BASE_URL}/editor/graph?e2e=1&context=change&source=doc%3Adoc-alpha&target=doc%3Adoc-beta&node=doc%3Adoc-beta`);
      await page.getByRole("button", { name: "Suggest update" }).click();
      await page.waitForURL((url) => url.pathname === "/editor");
      await page.getByRole("button", { name: "Toggle sidebar" }).click();
      await page.getByRole("button", { name: "Knowledge" }).click();
      await page.getByText("Editor is not ready yet.").first().waitFor();
      await page.getByRole("button", { name: "Retry", exact: true }).click();

      const patchReviewDialog = page.getByRole("dialog");
      await patchReviewDialog.getByText("Patch Review", { exact: true }).waitFor({ timeout: 30000 });
      await saveScreenshot(patchReviewDialog, "marketing-patch-review-surface.png");

      await page.keyboard.press("Escape");
      await patchReviewDialog.waitFor({ state: "hidden" });
      await page.getByRole("heading", { name: "Suggestion Queue" }).waitFor();
      const suggestionQueueSection = page
        .getByRole("heading", { name: "Suggestion Queue" })
        .locator("xpath=ancestor::section[1]");
      await saveScreenshot(suggestionQueueSection, "marketing-queue-surface.png");

      const operationsHeading = page.getByRole("heading", { name: "Operations Gate" });
      await operationsHeading.scrollIntoViewIfNeeded();
      const operationsBox = await operationsHeading.boundingBox();

      if (!operationsBox) {
        throw new Error("Failed to resolve the Operations Gate heading bounds for marketing capture.");
      }

      await saveScreenshot(page, "marketing-operations-surface.png", {
        clip: {
          height: 520,
          width: 340,
          x: 0,
          y: 300,
        },
      });

      await page.goto(`${BASE_URL}/editor?e2e=1`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Drive Import" }).click();
      const workspaceDialog = page.getByRole("dialog");
      await workspaceDialog.getByText("Import from Google Drive", { exact: true }).waitFor();
      await workspaceDialog.getByText("Incident Runbook", { exact: true }).waitFor();
      await saveScreenshot(page, "marketing-google-workspace-surface.png");

      await page.close();
    } finally {
      await browser.close();
    }
  } finally {
    previewProcess.kill();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
