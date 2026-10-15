import { test, expect } from '@playwright/test';

/** Type into the field and wait until the debounced suggestions catch up. */
async function typeText(page, text) {
    await page.locator('#textInput').fill(text);
    await expect(page.locator('#suggestionsContainer .suggestion-item, #suggestionsContainer .empty-state').first())
        .toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#footerText')).toContainText('v1.');
});

test('paste mistyped Arabic → apply → undo', async ({ page }) => {
    const input = page.locator('#textInput');
    await typeText(page, 'g]d la;gm');
    const first = page.locator('.suggestion-item').first();
    await expect(first.locator('.suggestion-content')).toHaveText('لدي مشكلة');

    await first.locator('.btn-fix').click();
    await expect(input).toHaveValue('لدي مشكلة');

    await page.locator('.toast-action').click();
    await expect(input).toHaveValue('g]d la;gm');
});

test('a correct word next to a mistyped one is left alone', async ({ page }) => {
    await typeText(page, 'شكرا اثممخ');
    await expect(page.locator('.suggestion-item').first().locator('.suggestion-content'))
        .toHaveText('شكرا hello');
});

test('Ctrl+Enter right after typing applies the current text, not a stale one', async ({ page }) => {
    const input = page.locator('#textInput');
    await typeText(page, 'g]d');
    await expect(page.locator('.suggestion-content').first()).toHaveText('لدي');
    // Type and fire the shortcut before the debounce can refresh the list.
    await input.press('End');
    await input.pressSequentially(' la;gm', { delay: 0 });
    await page.keyboard.press('Control+Enter');
    await expect(input).toHaveValue('لدي مشكلة');
});

test('Ctrl+Enter works even before the first suggestion has rendered', async ({ page }) => {
    const input = page.locator('#textInput');
    await input.pressSequentially('g]d', { delay: 0 });
    await page.keyboard.press('Control+Enter');
    await expect(input).toHaveValue('لدي');
});

test('history is off by default and stores nothing', async ({ page }) => {
    await expect(page.locator('#historyToggle')).not.toBeChecked();
    await typeText(page, 'g]d la;gm');
    await page.locator('.btn-fix').first().click();
    const stored = await page.evaluate(() => localStorage.getItem('akf_history'));
    expect(stored).toBeNull();
});

test('undoing an apply also removes its history entry', async ({ page }) => {
    await page.locator('#historyToggle').check();
    await typeText(page, 'g]d la;gm');
    await page.locator('.btn-fix').first().click();
    await expect(page.locator('.history-item')).toHaveCount(1);

    await page.locator('.toast-action').first().click();
    await expect(page.locator('.history-item')).toHaveCount(0);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('akf_history')));
    expect(stored).toEqual([]);
});

test('turning history off deletes what was stored', async ({ page }) => {
    await page.locator('#historyToggle').check();
    await typeText(page, 'g]d la;gm');
    await page.locator('.btn-fix').first().click();
    await page.locator('#historyToggle').uncheck();
    const stored = await page.evaluate(() => localStorage.getItem('akf_history'));
    expect(stored).toBeNull();
});

test('low-confidence suggestions are marked as such', async ({ page }) => {
    await typeText(page, 'ahs');
    const item = page.locator('.suggestion-item').first();
    await expect(item).toHaveClass(/low-confidence/);
});
