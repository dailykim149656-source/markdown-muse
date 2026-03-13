import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const PREVIEW_PORT = 4177;
const BASE_URL = `http://127.0.0.1:${PREVIEW_PORT}`;
const OUTPUT_DIR = path.join(process.cwd(), "output", "playwright");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "release-closeout-performance.json");

const AUTOSAVE_KEY = "docsy-autosave-v2";
const KNOWLEDGE_DB_NAME = "docsy-knowledge-index";
const KNOWLEDGE_FALLBACK_KEY = "docsy-knowledge-index-fallback-v2";
const SOURCE_SNAPSHOT_KEY = "docsy.source-snapshots.v1";
const UI_LANGUAGE_KEY = "docsy-ui-language";
const USER_PROFILE_KEY = "docsy:web:user-profile";

const scenarioConfigs = [
  { name: "small", documentCount: 10, graphQuery: "Document 007", knowledgeQuery: "token-007", knowledgeResult: "Document 007" },
  { name: "medium", documentCount: 40, graphQuery: "Document 007", knowledgeQuery: "token-007", knowledgeResult: "Document 007" },
  { name: "large", documentCount: 90, graphQuery: "Document 007", knowledgeQuery: "token-007", knowledgeResult: "Document 007" },
  { name: "workspace-200", documentCount: 200, graphQuery: "Document 007", knowledgeQuery: "token-007", knowledgeResult: "Document 007" },
  {
    name: "heavy-active",
    documentCount: 1,
    graphQuery: "Heavy Active Document",
    heavyActive: true,
    knowledgeQuery: "heavy-active-token",
    knowledgeResult: "Heavy Active Document",
  },
  {
    name: "mixed-heavy",
    documentCount: 120,
    graphQuery: "Document 007",
    heavyActive: true,
    knowledgeQuery: "token-007",
    knowledgeResult: "Document 007",
  },
];

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

const createHeavyMarkdownDocument = (id, name, now) => {
  const sections = Array.from({ length: 320 }, (_, index) => [
    `## Heavy Section ${String(index + 1).padStart(3, "0")}`,
    "",
    `heavy-active-token block-${index + 1}`,
    "",
    "```ts",
    `export const section${index + 1} = "heavy";`,
    "```",
    "",
    `- item ${index + 1}`,
    `- item ${index + 1}-b`,
  ].join("\n")).join("\n\n");
  const content = [
    `# ${name}`,
    "",
    "## Overview",
    "",
    "This heavy active document is used to validate high-character-count stability.",
    "",
    sections,
  ].join("\n\n");

  return {
    ast: null,
    content,
    createdAt: now - 2_000,
    id,
    metadata: {},
    mode: "markdown",
    name,
    sourceSnapshots: {
      markdown: content,
    },
    storageKind: "docsy",
    tiptapJson: null,
    updatedAt: now - 1_000,
  };
};

const createDocuments = (config) => {
  const { documentCount, heavyActive = false } = config;
  const now = Date.now();
  const documents = Array.from({ length: documentCount }, (_, index) => {
    const number = String(index + 1).padStart(3, "0");
    const nextNumber = String(((index + 1) % documentCount) + 1).padStart(3, "0");
    const name = `Document ${number}`;
    const content = [
      `# ${name}`,
      "",
      `Reference: [Document ${nextNumber}](document-${nextNumber}.md#overview)`,
      "",
      "## Overview",
      "",
      `Unique token: token-${number}`,
      "",
      `This workspace document ${number} is used for release-closeout measurement.`,
    ].join("\n");

    return {
      ast: null,
      content,
      createdAt: now - ((documentCount - index) * 1000),
      id: `doc-${number}`,
      metadata: {},
      mode: "markdown",
      name,
      sourceSnapshots: {
        markdown: content,
      },
      storageKind: "docsy",
      tiptapJson: null,
      updatedAt: now - ((documentCount - index) * 500),
    };
  });

  if (heavyActive && documents.length > 0) {
    documents[0] = createHeavyMarkdownDocument(documents[0].id, "Heavy Active Document", now);
  }

  return documents;
};

const seedWorkspace = async (page, config) => {
  const documents = createDocuments(config);
  const activeDocId = documents[0].id;

  await page.goto(`${BASE_URL}/editor`, { waitUntil: "domcontentloaded" });
  await page.evaluate(async ({
    activeDocId,
    autosaveKey,
    dbName,
    documents,
    knowledgeFallbackKey,
    sourceSnapshotKey,
    uiLanguageKey,
    userProfileKey,
  }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.removeItem(knowledgeFallbackKey);
    localStorage.removeItem(sourceSnapshotKey);
    localStorage.setItem(uiLanguageKey, "en");
    localStorage.setItem(userProfileKey, "advanced");

    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });

    localStorage.setItem(autosaveKey, JSON.stringify({
      activeDocId,
      documents,
      lastSaved: Date.now(),
      version: 2,
    }));
  }, {
    activeDocId,
    autosaveKey: AUTOSAVE_KEY,
    dbName: KNOWLEDGE_DB_NAME,
    documents,
    knowledgeFallbackKey: KNOWLEDGE_FALLBACK_KEY,
    sourceSnapshotKey: SOURCE_SNAPSHOT_KEY,
    uiLanguageKey: UI_LANGUAGE_KEY,
    userProfileKey: USER_PROFILE_KEY,
  });
};

const measure = async (label, action) => {
  const start = performance.now();
  await action();
  const end = performance.now();
  return Math.round(end - start);
};

const measureScenario = async (browser, config) => {
  const page = await browser.newPage();

  await seedWorkspace(page, config);

  const editorLoadMs = await measure("editorLoadMs", async () => {
    await page.goto(`${BASE_URL}/editor?e2e=1`, { waitUntil: "domcontentloaded" });
    await page.locator(".ProseMirror").first().waitFor();
  });

  const knowledgeSearchMs = await measure("knowledgeSearchMs", async () => {
    await page.getByRole("button", { name: /toggle sidebar/i }).click();
    await page.locator("button").filter({ hasText: /^Knowledge$/ }).first().click();
    await page.getByRole("textbox", { name: "Search sections and chunks" }).fill(config.knowledgeQuery);
    await page.getByText(config.knowledgeResult).first().waitFor();
  });

  const graphRouteOpenMs = await measure("graphRouteOpenMs", async () => {
    await page.goto(`${BASE_URL}/editor/graph?e2e=1`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("graph-canvas-svg").waitFor();
  });

  const graphFilterSearchMs = await measure("graphFilterSearchMs", async () => {
    await page.getByRole("textbox", { name: "Search nodes and connections" }).fill(config.graphQuery);
    await page.getByRole("button", { name: config.graphQuery }).first().waitFor();
  });

  const queueCreationToReadyMs = config.documentCount < 2
    ? null
    : await (async () => {
      try {
        return await measure("queueCreationToReadyMs", async () => {
          await page.goto(
            `${BASE_URL}/editor/graph?e2e=1&context=change&source=doc%3Adoc-001&target=doc%3Adoc-002&node=doc%3Adoc-002`,
            { waitUntil: "domcontentloaded" },
          );
          await page.getByText("Context chain").waitFor();
          await page.getByRole("button", { name: "Suggest update" }).click();
          await page.waitForURL((url) => url.pathname === "/editor");
          await page.getByRole("button", { name: /toggle sidebar/i }).click();
          await page.locator("button").filter({ hasText: /^Knowledge$/ }).first().click();
          await page.getByRole("heading", { name: "Suggestion Queue" }).waitFor();

          const patchReviewDialog = page.getByRole("dialog");
          const retryButton = page.getByRole("button", { name: "Retry", exact: true });
          const openReviewButton = page.getByRole("button", { name: "Open review" });

          try {
            await patchReviewDialog.getByText("Patch Review", { exact: true }).waitFor({ timeout: 10_000 });
          } catch {
            if (await retryButton.isVisible().catch(() => false)) {
              await retryButton.click();
            }

            try {
              await patchReviewDialog.getByText("Patch Review", { exact: true }).waitFor({ timeout: 20_000 });
            } catch {
              const openReviewEnabled = await openReviewButton.isEnabled().catch(() => false);

              if (!openReviewEnabled) {
                throw new Error("Open review button never became enabled.");
              }

              await openReviewButton.click();
              await patchReviewDialog.getByText("Patch Review", { exact: true }).waitFor({ timeout: 20_000 });
            }
          }

          await page.keyboard.press("Escape");
          await patchReviewDialog.waitFor({ state: "hidden" });
        });
      } catch {
        return null;
      }
    })();

  await page.close();

  return {
    documentCount: config.documentCount,
    editorLoadMs,
    graphFilterSearchMs,
    graphRouteOpenMs,
    knowledgeSearchMs,
    queueCreationToReadyMs,
    tier: config.name,
  };
};

const main = async () => {
  const previewProcess = process.platform === "win32"
    ? spawn(
      "cmd.exe",
      ["/c", "npm", "run", "preview", "--", "--host", "127.0.0.1", "--port", String(PREVIEW_PORT)],
      {
        cwd: process.cwd(),
        shell: false,
        stdio: "ignore",
      },
    )
    : spawn(
      "npm",
      ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(PREVIEW_PORT)],
      {
        cwd: process.cwd(),
        shell: false,
        stdio: "ignore",
      },
    );

  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch();

    try {
      const results = [];

      for (const config of scenarioConfigs) {
        results.push(await measureScenario(browser, config));
      }

      const payload = {
        baseUrl: BASE_URL,
        capturedAt: new Date().toISOString(),
        results,
      };

      await mkdir(OUTPUT_DIR, { recursive: true });
      await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

      console.log(JSON.stringify(payload, null, 2));
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
