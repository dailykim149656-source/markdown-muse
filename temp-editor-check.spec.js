import { test } from '@playwright/test';

test('capture console', async ({ page }) => {
  page.on('console', message => {
    console.log('PAGE_CONSOLE', message.type(), message.text());
  });
  page.on('pageerror', err => {
    console.log('PAGE_ERROR', err.stack || String(err));
  });
  page.on('requestfailed', request => {
    console.log('REQUEST_FAILED', request.url(), request.failure()?.errorText);
  });

  await page.goto('http://127.0.0.1:8080/editor', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  console.log('TITLE', await page.title());
  console.log('BODY_LEN', (await page.textContent('body') || '').length);
});