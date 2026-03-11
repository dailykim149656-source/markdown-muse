import { expect, test, type Page } from "@playwright/test";

const clearAppState = async (page: Page) => {
  await page.goto("/editor", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto("/editor?e2e=1", { waitUntil: "domcontentloaded" });
};

const getPrimaryEditor = (page: Page) =>
  page.locator(".ProseMirror").first();

test.describe("editor regressions", () => {
  test.beforeEach(async ({ page }) => {
    await clearAppState(page);
    await expect(page.locator("header input").first()).toHaveValue(/Untitled|제목 없음/i);
    await expect(getPrimaryEditor(page)).toBeVisible();
  });

  test("markdown wysiwyg typing and backspace keep content stable", async ({ page }) => {
    const editor = getPrimaryEditor(page);

    await editor.click();
    await page.keyboard.type("Hello");
    await page.keyboard.press("Enter");
    await page.keyboard.type("World");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("!");

    await expect(editor).toContainText("Hello");
    await expect(editor).toContainText("Wor!");

    const editorText = await editor.innerText();
    expect(editorText).toContain("Hello");
    expect(editorText).toContain("Wor!");
    expect(editorText).not.toContain("World");
  }, 120000);

  test("html source and wysiwyg stay in sync both directions", async ({ page }) => {
    await page.getByRole("button", { name: "HTML", exact: true }).click();

    const source = page.locator("textarea").first();
    await expect(source).toBeVisible();
    await source.fill("<h1>Heading</h1><p>Alpha</p>");

    const editor = getPrimaryEditor(page);
    await expect(editor).toContainText("Heading");
    await expect(editor).toContainText("Alpha");

    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" Beta");

    await expect(editor).toContainText("Alpha Beta");
    await expect(source).toHaveValue(/Alpha Beta/);
    await expect(source).toHaveValue(/<h1[^>]*>Heading<\/h1>/);
  });
});
