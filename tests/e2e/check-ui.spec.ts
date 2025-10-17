import { test, expect } from '@playwright/test';

test('Check homepage and login', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:8000');
  
  // Wait for page to load
  await page.waitForTimeout(2000);
  
  // Take screenshot of homepage
  await page.screenshot({ path: '../../homepage-screenshot.png', fullPage: true });
  
  // Check if translation icon exists
  const globeIcon = page.locator('svg').filter({ hasText: /globe/i }).or(page.locator('[aria-label*="language"]')).or(page.locator('button:has-text("🇮🇱")'));
  console.log('Globe icon count:', await globeIcon.count());
  
  // Try login
  await page.fill('input[type="text"]', 'trainer@elior.com');
  await page.fill('input[type="password"]', 'trainer123');
  await page.screenshot({ path: '../../login-filled-screenshot.png' });
  
  await page.click('button[type="submit"]');
  
  // Wait for navigation
  await page.waitForTimeout(3000);
  
  // Take screenshot after login
  await page.screenshot({ path: '../../after-login-screenshot.png', fullPage: true });
  
  // Check URL
  console.log('Current URL:', page.url());
  
  // Check for translation icon on dashboard
  const dashboardGlobe = page.locator('svg').filter({ hasText: /globe/i }).or(page.locator('[aria-label*="language"]'));
  console.log('Globe icon on dashboard:', await dashboardGlobe.count());
  
  // Get all buttons in header
  const headerButtons = page.locator('header button, nav button, [role="navigation"] button');
  console.log('Header buttons:', await headerButtons.count());
  
  // Log all button text
  for (let i = 0; i < await headerButtons.count(); i++) {
    const btn = headerButtons.nth(i);
    console.log(`Button ${i}:`, await btn.textContent());
  }
});

