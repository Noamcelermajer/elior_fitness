import { Page, expect } from '@playwright/test';

/**
 * Test helper utilities for common operations
 */

/**
 * Waits for navigation and ensures page is loaded
 */
export async function waitForPageLoad(page: Page, url?: string) {
  if (url) {
    await page.waitForURL(url);
  }
  await page.waitForLoadState('networkidle');
}

/**
 * Fills a form field and waits for it to be updated
 */
export async function fillField(page: Page, selector: string, value: string) {
  await page.fill(selector, value);
  await page.waitForTimeout(100); // Small delay for React state updates
}

/**
 * Clicks a button and waits for navigation
 */
export async function clickAndWait(page: Page, selector: string, waitForNav = true) {
  if (waitForNav) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click(selector),
    ]);
  } else {
    await page.click(selector);
    await page.waitForTimeout(500);
  }
}

/**
 * Uploads a file to a file input
 */
export async function uploadFile(page: Page, selector: string, filePath: string) {
  const fileInput = await page.locator(selector);
  await fileInput.setInputFiles(filePath);
  await page.waitForTimeout(500); // Wait for upload processing
}

/**
 * Creates a test image file in memory
 */
export function createTestImage(width = 100, height = 100): Buffer {
  // Create a simple BMP image
  const headerSize = 54;
  const imageSize = width * height * 3;
  const fileSize = headerSize + imageSize;
  const buffer = Buffer.alloc(fileSize);
  
  // BMP header
  buffer.write('BM', 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(headerSize, 10);
  buffer.writeUInt32LE(40, 14); // DIB header size
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26); // planes
  buffer.writeUInt16LE(24, 28); // bits per pixel
  
  return buffer;
}

/**
 * Saves a test image to a temporary file
 */
export async function saveTestImage(filename: string): Promise<string> {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, filename);
  const imageBuffer = createTestImage();
  
  fs.writeFileSync(filePath, imageBuffer);
  return filePath;
}

/**
 * Waits for an element to be visible
 */
export async function waitForElement(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Checks if element exists without throwing
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'attached', timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets text content from an element
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = await page.locator(selector);
  return (await element.textContent()) || '';
}

/**
 * Waits for API response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  action: () => Promise<void>
) {
  const responsePromise = page.waitForResponse(
    response => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: 10000 }
  );
  
  await action();
  return await responsePromise;
}

/**
 * Verifies toast/notification message appears
 */
export async function verifyToastMessage(page: Page, message: string) {
  const toast = page.locator('[data-sonner-toast]', { hasText: message });
  await expect(toast).toBeVisible({ timeout: 5000 });
}

/**
 * Dismisses all toasts
 */
export async function dismissToasts(page: Page) {
  const closeButtons = page.locator('[data-sonner-toast] button[aria-label="Close"]');
  const count = await closeButtons.count();
  for (let i = 0; i < count; i++) {
    await closeButtons.nth(i).click();
  }
}

/**
 * Generates random string for unique test data
 */
export function randomString(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates random email
 */
export function randomEmail(): string {
  return `test.${randomString()}@example.com`;
}

/**
 * Current date in YYYY-MM-DD format
 */
export function currentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Date in the future (days from now)
 */
export function futureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Scrolls element into view
 */
export async function scrollIntoView(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * Takes screenshot with name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
}

/**
 * Retries an action until it succeeds or times out
 */
export async function retry<T>(
  action: () => Promise<T>,
  options: { maxAttempts?: number; delay?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 1000 } = options;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Retry failed');
}


