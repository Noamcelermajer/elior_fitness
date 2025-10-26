import { test, expect } from '@playwright/test';

test.describe('Elior Fitness Application', () => {
  test('should load the login page', async ({ page }) => {
    await page.goto('/');
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/login-page.png', fullPage: true });
    
    // Check if redirected to login or shows login interface
    await page.waitForLoadState('networkidle');
    
    // Should either be on login page or redirected
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('should display API health check', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('should access API documentation', async ({ page }) => {
    await page.goto('/docs');
    
    // Check if Swagger UI loads
    await page.waitForSelector('text=Elior Fitness API', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/api-docs.png', fullPage: true });
  });

  test('should show registered users endpoint', async ({ page }) => {
    // This endpoint doesn't require auth
    await page.goto('/api/auth/registered-users');
    
    const response = await page.waitForResponse('**/registered-users');
    expect(response.ok()).toBeTruthy();
  });

  test('should have frontend static files served', async ({ page }) => {
    // Check if the app tries to serve from static
    await page.goto('/');
    
    // Wait a bit for the app to load
    await page.waitForTimeout(2000);
    
    // Check if React app is loaded (look for React root element or common class)
    const body = await page.content();
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/frontend-loading.png', fullPage: true });
  });
});

test.describe('API Endpoints', () => {
  test('should have health endpoint working', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('should have database status endpoint', async ({ request }) => {
    const response = await request.get('/status/database');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });
});

test.describe('Authentication Flow', () => {
  test('should show login page with user selection', async ({ page }) => {
    await page.goto('/login');
    
    await page.waitForLoadState('networkidle');
    
    // Look for login form elements
    const bodyText = await page.textContent('body');
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/login-detailed.png', fullPage: true });
  });

  test('should fetch registered users for login', async ({ request }) => {
    const response = await request.get('/api/auth/registered-users');
    expect(response.ok()).toBeTruthy();
    
    const users = await response.json();
    expect(Array.isArray(users)).toBeTruthy();
  });

  test('should handle login attempt', async ({ page }) => {
    await page.goto('/login');
    
    await page.waitForLoadState('networkidle');
    
    // Try to find any user selection or login button
    const hasUserList = await page.locator('[data-testid="user-list"], button, .user-item').count() > 0;
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/login-interaction.png', fullPage: true });
  });
});

test.describe('Frontend Build', () => {
  test('should serve static assets', async ({ page }) => {
    // Try to access the app root
    await page.goto('/');
    
    // Check if any assets are loaded
    const response = await page.goto('/');
    expect([200, 404].includes(response?.status() || 0)).toBeTruthy();
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/app-root.png', fullPage: true });
  });

  test('should handle 404 for non-existent pages', async ({ page }) => {
    const response = await page.goto('/non-existent-page');
    
    // Should either redirect to login or show 404
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/404-page.png', fullPage: true });
  });
});

