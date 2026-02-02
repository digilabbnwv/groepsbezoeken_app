/**
 * E2E Smoke Tests
 * Test de belangrijkste user journeys in de applicatie
 */
import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
    test('should display landing page with correct elements', async ({ page }) => {
        await page.goto('/');

        // Check for main heading
        await expect(page.locator('h1')).toContainText('BiebBattle');

        // Check for player button
        const playerButton = page.locator('button:has-text("Start als speler")');
        await expect(playerButton).toBeVisible();

        // Check for admin link
        const adminLink = page.locator('a[href="#admin"]');
        await expect(adminLink).toBeVisible();

        // Check version footer
        const footer = page.locator('#version-footer');
        await expect(footer).toContainText('Versie');
    });

    test('should navigate to player join page', async ({ page }) => {
        await page.goto('/');

        await page.click('button:has-text("Start als speler")');

        // URL should change to #player
        await expect(page).toHaveURL(/#player/);

        // Should see join form
        await expect(page.locator('#session-code')).toBeVisible();
        await expect(page.locator('#btn-join')).toBeVisible();
    });

    test('should navigate to admin setup page', async ({ page }) => {
        await page.goto('/');

        await page.click('a[href="#admin"]');

        // URL should change to #admin
        await expect(page).toHaveURL(/#admin/);

        // Should see admin form
        await expect(page.locator('#session-name')).toBeVisible();
        await expect(page.locator('#session-pin')).toBeVisible();
    });
});

test.describe('Player Join Flow', () => {
    test('should show error for empty session code', async ({ page }) => {
        await page.goto('/#player');

        // Try to join without code
        await page.click('#btn-join');

        // Should still be on join page (code too short)
        await expect(page.locator('#session-code')).toBeVisible();
    });

    test('should accept session code input', async ({ page }) => {
        await page.goto('/#player');

        const input = page.locator('#session-code');
        await input.fill('ABC1234');

        // Should show uppercase
        await expect(input).toHaveValue('ABC1234');
    });

    test('should show code input with correct styling', async ({ page }) => {
        await page.goto('/#player');

        const input = page.locator('#session-code');

        // Check for code-input class (larger font, centered)
        await expect(input).toHaveClass(/code-input/);
    });
});

test.describe('Admin Setup Flow', () => {
    test('should require session name and valid PIN', async ({ page }) => {
        await page.goto('/#admin');

        // Fill only name, no PIN
        await page.fill('#session-name', 'Groep 6B');

        // Set up dialog handler before triggering
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('PIN');
            await dialog.accept();
        });

        await page.click('#btn-create');
    });

    test('should reject invalid PIN codes', async ({ page }) => {
        await page.goto('/#admin');

        await page.fill('#session-name', 'Groep 6B');
        await page.fill('#session-pin', '0000');

        // Set up dialog handler
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Ongeldige PIN');
            await dialog.accept();
        });

        await page.click('#btn-create');
    });

    test('should only allow numeric PIN input', async ({ page }) => {
        await page.goto('/#admin');

        const pinInput = page.locator('#session-pin');
        await pinInput.fill('abcd');

        // Should be empty (non-numeric stripped)
        await expect(pinInput).toHaveValue('');
    });
});

test.describe('Dyslexia Mode', () => {
    test('should toggle dyslexia mode', async ({ page }) => {
        await page.goto('/');

        const toggle = page.locator('#dyslexia-toggle');
        await expect(toggle).toBeVisible();

        // Click to enable
        await toggle.click();
        await expect(page.locator('body')).toHaveClass(/dyslexia-mode/);

        // Click to disable
        await toggle.click();
        await expect(page.locator('body')).not.toHaveClass(/dyslexia-mode/);
    });
});

test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // All main elements should be visible
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('button:has-text("Start als speler")')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');

        await expect(page.locator('h1')).toBeVisible();
    });
});

test.describe('Error Handling', () => {
    test('should handle questions.json loading error gracefully', async ({ page }) => {
        // Intercept questions.json to simulate error
        await page.route('**/content/questions.json', route => {
            route.abort();
        });

        await page.goto('/');

        // Should show error message
        await expect(page.locator('text=Fout')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=questions.json')).toBeVisible();
    });
});
