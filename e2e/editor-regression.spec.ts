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

const selectMode = async (page: Page, mode: "HTML" | "LaTeX") => {
  await page.getByRole("button", { name: /Markdown|LaTeX|HTML/, exact: false }).first().click();

  const modeOption = page
    .locator('[role="option"], [role="menuitemradio"], [role="menuitem"], [data-radix-collection-item]')
    .filter({ hasText: new RegExp(`^${mode}$`) })
    .first();

  await expect(modeOption).toBeVisible();
  await modeOption.click();
};

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
    await selectMode(page, "HTML");

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

  test("latex wysiwyg typing stays stable and the empty-state help disappears once", async ({ page }) => {
    await selectMode(page, "LaTeX");

    await expect(page.getByText("LaTeX WYSIWYG with synced source pane.")).toBeVisible();

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
    await expect(page.getByText("LaTeX WYSIWYG with synced source pane.")).toHaveCount(0);

    const source = page.locator("textarea").first();
    await expect(source).toHaveValue(/Hello/);
    await expect(source).toHaveValue(/Wor!/);
  });
});
