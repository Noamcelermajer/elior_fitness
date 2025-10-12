import { test, expect } from '@playwright/test';

test('Manual test - Check login page', async ({ page }) => {
  // Go to the application
  await page.goto('http://localhost:8000');
  
  // Should redirect to login
  await page.waitForURL('**/login', { timeout: 10000 });
  
  // Take screenshot of login page
  await page.screenshot({ path: 'test-results/01-login-page.png', fullPage: true });
  console.log('Screenshot saved: 01-login-page.png');
  
  // Wait for the page to load
  await page.waitForSelector('input#username', { timeout: 10000 });
  
  // Check what's on the page
  const title = await page.title();
  console.log('Page title:', title);
  
  // Check registered users section
  const registeredUsersSection = await page.locator('text=Registered Users').isVisible();
  console.log('Registered Users section visible:', registeredUsersSection);
  
  // Try to login as admin
  console.log('\nAttempting login as admin@elior.com...');
  await page.fill('input#username', 'admin@elior.com');
  await page.fill('input#password', 'admin123');
  
  // Take screenshot before submit
  await page.screenshot({ path: 'test-results/02-before-login.png', fullPage: true });
  console.log('Screenshot saved: 02-before-login.png');
  
  await page.click('button[type="submit"]:has-text("Sign In")');
  
  // Wait a bit
  await page.waitForTimeout(3000);
  
  // Take screenshot after submit
  await page.screenshot({ path: 'test-results/03-after-login.png', fullPage: true });
  console.log('Screenshot saved: 03-after-login.png');
  
  // Check current URL
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  // Check if we're still on login or redirected
  if (currentUrl.includes('/login')) {
    console.log('[WARNING] Still on login page - login may have failed');
    
    // Check for error message
    const errorElement = page.locator('.text-destructive');
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent();
      console.log('[ERROR MESSAGE]:', errorText);
    }
  } else {
    console.log('[SUCCESS] Redirected away from login - login appears successful!');
  }
  
  // Keep browser open for 5 seconds to see result
  await page.waitForTimeout(5000);
});

test('Manual test - Try trainer login', async ({ page }) => {
  await page.goto('http://localhost:8000/login');
  await page.waitForSelector('input#username', { timeout: 10000 });
  
  console.log('\nAttempting login as trainer@elior.com...');
  await page.fill('input#username', 'trainer@elior.com');
  await page.fill('input#password', 'trainer123');
  await page.click('button[type="submit"]:has-text("Sign In")');
  
  await page.waitForTimeout(3000);
  
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  if (currentUrl.includes('/login')) {
    console.log('[WARNING] Still on login page');
    const errorElement = page.locator('.text-destructive');
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent();
      console.log('[ERROR]:', errorText);
    }
  } else {
    console.log('[SUCCESS] Login successful!');
    await page.screenshot({ path: 'test-results/04-trainer-dashboard.png', fullPage: true });
  }
  
  await page.waitForTimeout(5000);
});

test('Manual test - Check API endpoints', async ({ request }) => {
  // Test health endpoint
  console.log('\nTesting /health endpoint...');
  const healthResponse = await request.get('http://localhost:8000/health');
  console.log('Health status:', healthResponse.status());
  if (healthResponse.ok()) {
    const data = await healthResponse.json();
    console.log('Health data:', JSON.stringify(data, null, 2));
  }
  
  // Test login API
  console.log('\nTesting /api/auth/login endpoint...');
  const loginResponse = await request.post('http://localhost:8000/api/auth/login', {
    data: {
      username: 'admin@elior.com',
      password: 'admin123',
    },
  });
  console.log('Login status:', loginResponse.status());
  const loginData = await loginResponse.text();
  console.log('Login response:', loginData);
  
  if (loginResponse.ok()) {
    const json = JSON.parse(loginData);
    console.log('[SUCCESS] Login API works! Token received');
    
    // Try to get current user
    const meResponse = await request.get('http://localhost:8000/api/auth/me', {
      headers: {
        Authorization: `Bearer ${json.access_token}`,
      },
    });
    console.log('\n/api/auth/me status:', meResponse.status());
    if (meResponse.ok()) {
      const userData = await meResponse.json();
      console.log('User data:', JSON.stringify(userData, null, 2));
    }
  }
});



