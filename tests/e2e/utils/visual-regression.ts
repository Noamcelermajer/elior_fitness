import { Page, expect } from '@playwright/test';

/**
 * Visual regression testing utilities
 */

export interface ScreenshotOptions {
  fullPage?: boolean;
  mask?: string[];
  maxDiffPixels?: number;
  maxDiffPixelRatio?: number;
}

/**
 * Takes a screenshot and compares with baseline
 */
export async function compareScreenshot(
  page: Page,
  name: string,
  options: ScreenshotOptions = {}
) {
  const {
    fullPage = false,
    mask = [],
    maxDiffPixels = 100,
    maxDiffPixelRatio = 0.01,
  } = options;
  
  // Mask dynamic elements
  const maskSelectors = [
    ...mask,
    '[data-timestamp]', // Dynamic timestamps
    '[data-random-id]', // Random IDs
    '.notification-badge', // Notification counts
  ];
  
  const maskElements = [];
  for (const selector of maskSelectors) {
    const elements = await page.locator(selector).all();
    maskElements.push(...elements);
  }
  
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage,
    mask: maskElements,
    maxDiffPixels,
    maxDiffPixelRatio,
  });
}

/**
 * Compares a specific component
 */
export async function compareComponent(
  page: Page,
  selector: string,
  name: string,
  options: ScreenshotOptions = {}
) {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  
  await expect(element).toHaveScreenshot(`${name}.png`, {
    maxDiffPixels: options.maxDiffPixels || 50,
    maxDiffPixelRatio: options.maxDiffPixelRatio || 0.01,
  });
}

/**
 * Prepares page for consistent screenshots
 */
export async function prepareForScreenshot(page: Page) {
  // Wait for all images to load
  await page.waitForLoadState('networkidle');
  
  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);
  
  // Hide scrollbars
  await page.addStyleTag({
    content: `
      * {
        scrollbar-width: none;
      }
      *::-webkit-scrollbar {
        display: none;
      }
    `,
  });
  
  // Disable animations for consistency
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
  
  // Small delay to ensure everything is stable
  await page.waitForTimeout(500);
}

/**
 * Takes screenshot of the login page
 */
export async function screenshotLoginPage(page: Page) {
  await prepareForScreenshot(page);
  await compareScreenshot(page, 'login-page', { fullPage: true });
}

/**
 * Takes screenshot of a dashboard
 */
export async function screenshotDashboard(
  page: Page,
  dashboardName: string
) {
  await prepareForScreenshot(page);
  await compareScreenshot(page, `${dashboardName}-dashboard`, {
    fullPage: true,
    mask: [
      '[data-testid="user-greeting"]', // May contain user-specific name
      '[data-testid="last-login"]', // Dynamic timestamp
    ],
  });
}

/**
 * Takes screenshot of a form
 */
export async function screenshotForm(
  page: Page,
  formName: string,
  selector?: string
) {
  await prepareForScreenshot(page);
  
  if (selector) {
    await compareComponent(page, selector, `${formName}-form`);
  } else {
    await compareScreenshot(page, `${formName}-form`, { fullPage: true });
  }
}

/**
 * Takes screenshot of a modal/dialog
 */
export async function screenshotModal(
  page: Page,
  modalName: string,
  selector: string = '[role="dialog"]'
) {
  await prepareForScreenshot(page);
  await compareComponent(page, selector, `${modalName}-modal`);
}

/**
 * Takes screenshot of a table
 */
export async function screenshotTable(
  page: Page,
  tableName: string,
  selector: string = 'table'
) {
  await prepareForScreenshot(page);
  await compareComponent(page, selector, `${tableName}-table`);
}

/**
 * Updates visual baselines (use with caution)
 */
export function shouldUpdateBaselines(): boolean {
  return process.env.UPDATE_SNAPSHOTS === 'true';
}


