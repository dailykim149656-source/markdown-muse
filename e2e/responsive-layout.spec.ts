import { expect, test, type Page } from "@playwright/test";

const AUTOSAVE_KEY = "docsy-autosave-v2";
const UI_LANGUAGE_KEY = "docsy-ui-language";

const getHorizontalOverflow = async (page: Page) =>
  page.evaluate(() => {
    const { body, documentElement } = document;
    return Math.max(
      body.scrollWidth - body.clientWidth,
      documentElement.scrollWidth - documentElement.clientWidth,
    );
  });

const getSidebarTextActionClearance = async (page: Page) =>
  page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('[data-sidebar="menu-item"]'));
    if (rows.length === 0) {
      return false;
    }

    return rows.every((row) => {
      const text = row.querySelector("div[class*=\"truncate\"]");
      const action = Array.from(row.querySelectorAll("div")).find((element) =>
        element.className.includes("group-hover/item:opacity-100"),
      );

      if (!text || !action) {
        return true;
      }

      const textRect = text.getBoundingClientRect();
      const actionRect = action.getBoundingClientRect();
      return textRect.right <= actionRect.left + 2;
    });
  });

const getEditorRowsHeights = async (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-sidebar="menu-item"]'))
      .map((row) => row.getBoundingClientRect().height),
  );

const seedEditorState = async (page: Page, locale: "en" | "ko") => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate((args) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(args.uiLanguageKey, args.locale);

    const now = Date.now();
    const documents = [
      {
        id: "doc-long-1",
        name: "Very Long Project Notes with Detailed Cross-Reference Synchronization and Workspace Metadata",
        mode: "markdown",
        content: "# Alpha\n\nLong doc for overlap checks.\n",
        createdAt: now - 6000,
        updatedAt: now - 1000,
        storageKind: "docsy",
        workspaceBinding: {
          documentKind: "google_docs",
          fileId: "file-alpha-001",
          importedAt: now - 12000,
          mimeType: "application/vnd.google-apps.document",
          provider: "google_drive",
          syncStatus: "synced",
        },
        sourceSnapshots: {
          markdown: "# Alpha\n\nLong doc for overlap checks.\n",
        },
      },
      {
        id: "doc-long-2",
        name: "Another Extremely Long Document Name to Exercise Sidebar Wrapping and Action Safety",
        mode: "markdown",
        content: "# Beta\n\nLong doc for overlap checks.\n",
        createdAt: now - 5000,
        updatedAt: now - 2000,
        storageKind: "docsy",
        sourceSnapshots: {
          markdown: "# Beta\n\nLong doc for overlap checks.\n",
        },
      },
      {
        id: "doc-long-3",
        name: "Short note",
        mode: "markdown",
        content: "# Gamma\n\nShort doc for overlap checks.\n",
        createdAt: now - 4000,
        updatedAt: now - 3000,
        storageKind: "docsy",
        sourceSnapshots: {
          markdown: "# Gamma\n\nShort doc for overlap checks.\n",
        },
      },
    ];

    localStorage.setItem(args.autosaveKey, JSON.stringify({
      activeDocId: "doc-long-1",
      documents,
      lastSaved: now,
      version: 2,
    }));
  }, {
    autosaveKey: AUTOSAVE_KEY,
    uiLanguageKey: UI_LANGUAGE_KEY,
    locale,
  });
};

const seedLandingLocale = async (page: Page, locale: "en" | "ko") => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate((args) => {
    localStorage.clear();
    localStorage.setItem(args.uiLanguageKey, args.locale);
  }, {
    uiLanguageKey: UI_LANGUAGE_KEY,
    locale,
  });
};

const LOCALES_TO_TEST: Array<"en" | "ko"> = ["ko", "en"];

test.describe("responsive overlap checks", () => {
  test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });

  for (const locale of LOCALES_TO_TEST) {
    test(`editor desktop at 150% scale keeps sidebar rows readable (${locale})`, async ({ page }) => {
      await seedEditorState(page, locale);
      await page.goto("/editor?e2e=1", { waitUntil: "domcontentloaded" });
      await page.keyboard.press("Control+b");

      await expect(page.locator("input[placeholder]").first()).toBeVisible();
      await expect(page.locator('[data-sidebar="menu-item"]').first()).toBeVisible();
      expect(await getHorizontalOverflow(page)).toBeLessThanOrEqual(1);
      expect(await getSidebarTextActionClearance(page)).toBeTruthy();
    });
  }

  for (const locale of LOCALES_TO_TEST) {
    test(`mobile landing wraps without horizontal overflow at 375x812 (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await seedLandingLocale(page, locale);
      await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });

      const nav = page.locator("nav").first();
      expect(await nav.getByRole("button").count()).toBeGreaterThanOrEqual(3);
      expect(await getHorizontalOverflow(page)).toBeLessThanOrEqual(1);
    });

    test(`mobile landing wraps without horizontal overflow at 390x844 (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await seedLandingLocale(page, locale);
      await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });

      const nav = page.locator("nav").first();
      expect(await nav.getByRole("button").count()).toBeGreaterThanOrEqual(3);
      expect(await getHorizontalOverflow(page)).toBeLessThanOrEqual(1);
    });
  }

  test("mobile editor shows expanded sidebar rows and readable header controls", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedEditorState(page, "ko");
    await page.goto("/editor?e2e=1", { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Control+b");

    await expect(page.locator("header input").first()).toBeVisible();
    await expect(page.locator('[data-sidebar="menu-item"]').first()).toBeVisible();
    expect(await getHorizontalOverflow(page)).toBeLessThanOrEqual(1);
    expect(await getSidebarTextActionClearance(page)).toBeTruthy();

    const rowHeights = await getEditorRowsHeights(page);
    expect(rowHeights.length).toBeGreaterThan(0);
    expect(Math.max(...rowHeights.slice(0, 3))).toBeGreaterThanOrEqual(32);
  });
});
