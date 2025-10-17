import { test, expect } from '@playwright/test';

test('Debug UI loading', async ({ page }) => {
  // Capture console messages
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  // Capture page errors
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  // Go to the app
  await page.goto('http://localhost:8000');
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Check if React root exists
  const rootDiv = page.locator('#root');
  console.log('Root div exists:', await rootDiv.count());
  console.log('Root div HTML:', await rootDiv.innerHTML().catch(() => 'ERROR'));
  
  // Check if any JavaScript loaded
  const scripts = page.locator('script[src]');
  console.log('Script tags:', await scripts.count());
  for (let i = 0; i < await scripts.count(); i++) {
    const src = await scripts.nth(i).getAttribute('src');
    console.log(`Script ${i}: ${src}`);
  }
  
  // Check network requests
  const responses = [];
  page.on('response', response => {
    console.log(`${response.status()} ${response.url()}`);
  });
  
  await page.reload();
  await page.waitForTimeout(2000);
  
  // Check if any React components rendered
  const buttons = page.locator('button');
  console.log('Total buttons:', await buttons.count());
  
  const inputs = page.locator('input');
  console.log('Total inputs:', await inputs.count());
});

