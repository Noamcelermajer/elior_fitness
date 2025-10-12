import { test, expect } from '../../fixtures/auth.fixture';
import { LoginPage } from '../../fixtures/page-objects/LoginPage';
import { TEST_USERS } from '../../fixtures/auth.fixture';

test.describe('Login Functionality', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });
  
  test('should display login page correctly', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(page).toHaveTitle(/.*Elior.*|.*Login.*/i);
  });
  
  test('should login successfully as admin', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.loginAndWaitForRedirect(
      TEST_USERS.admin.username,
      TEST_USERS.admin.password
    );
    
    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/admin|dashboard/);
    
    // Should have logged in state
    const isOnLogin = await loginPage.isOnLoginPage();
    expect(isOnLogin).toBe(false);
  });
  
  test('should login successfully as trainer', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.loginAndWaitForRedirect(
      TEST_USERS.trainer.username,
      TEST_USERS.trainer.password
    );
    
    // Should redirect to trainer dashboard
    await expect(page).toHaveURL(/trainer-dashboard|dashboard|\//);
    
    const isOnLogin = await loginPage.isOnLoginPage();
    expect(isOnLogin).toBe(false);
  });
  
  test('should login successfully as client', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.loginAndWaitForRedirect(
      TEST_USERS.client.username,
      TEST_USERS.client.password
    );
    
    // Should redirect to client dashboard (home)
    await expect(page).toHaveURL(/^.*\/$|\/dashboard/);
    
    const isOnLogin = await loginPage.isOnLoginPage();
    expect(isOnLogin).toBe(false);
  });
  
  test('should show error with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.login('invalid@user.com', 'wrongpassword');
    
    // Should stay on login page
    await page.waitForTimeout(2000);
    const isOnLogin = await loginPage.isOnLoginPage();
    expect(isOnLogin).toBe(true);
    
    // Should show error message
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
    const errorText = await loginPage.getErrorMessage();
    expect(errorText.toLowerCase()).toMatch(/invalid|incorrect|failed/);
  });
  
  test('should show error with empty credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.submitButton.click();
    
    // Should show validation errors or stay on page
    await page.waitForTimeout(1000);
    const isOnLogin = await loginPage.isOnLoginPage();
    expect(isOnLogin).toBe(true);
  });
  
  test('should show error with empty password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.usernameInput.fill(TEST_USERS.client.username);
    await loginPage.submitButton.click();
    
    await page.waitForTimeout(1000);
    const isOnLogin = await loginPage.isOnLoginPage();
    expect(isOnLogin).toBe(true);
  });
  
  test('should maintain session after page reload', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    // Login
    await loginPage.loginAndWaitForRedirect(
      TEST_USERS.client.username,
      TEST_USERS.client.password
    );
    
    const urlAfterLogin = page.url();
    
    // Reload page
    await page.reload();
    
    // Should still be logged in (not redirected to login)
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/login');
  });
  
  test('should logout successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    // Login first
    await loginPage.loginAndWaitForRedirect(
      TEST_USERS.client.username,
      TEST_USERS.client.password
    );
    
    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")');
    
    // May need to open a menu first
    const userMenu = page.locator('[data-testid="user-menu"], button[aria-label*="User menu"]');
    if (await userMenu.isVisible()) {
      await userMenu.click();
    }
    
    await logoutButton.click();
    
    // Should redirect to login page
    await expect(page).toHaveURL(/login/);
  });
  
  test('should handle concurrent login attempts', async ({ page, context }) => {
    const loginPage1 = new LoginPage(page);
    const page2 = await context.newPage();
    const loginPage2 = new LoginPage(page2);
    
    await loginPage1.goto();
    await loginPage2.goto();
    
    // Login in both pages simultaneously
    await Promise.all([
      loginPage1.loginAndWaitForRedirect(TEST_USERS.client.username, TEST_USERS.client.password),
      loginPage2.loginAndWaitForRedirect(TEST_USERS.client.username, TEST_USERS.client.password),
    ]);
    
    // Both should be logged in
    expect(page.url()).not.toContain('/login');
    expect(page2.url()).not.toContain('/login');
    
    await page2.close();
  });
  
  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});



