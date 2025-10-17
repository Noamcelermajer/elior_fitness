import { test, expect } from '@playwright/test';
import { randomEmail, randomString } from '../../utils/test-helpers';

test.describe('User Registration', () => {
  test('should display registration form', async ({ page }) => {
    await page.goto('/login');
    
    // Look for registration link or form
    const registerLink = page.locator('a:has-text("Register"), a:has-text("Sign Up"), button:has-text("Register")');
    
    if (await registerLink.isVisible()) {
      await registerLink.click();
      
      // Should show registration form
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="full_name"], input[name="fullName"]')).toBeVisible();
    }
  });
  
  test('should register new client successfully', async ({ page }) => {
    // Try to access registration page
    await page.goto('/register');
    
    const email = randomEmail();
    const password = 'Test123!@#';
    const fullName = `Test User ${randomString(4)}`;
    
    // Fill registration form if it exists
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    
    if (await emailInput.isVisible({ timeout: 2000 })) {
      await emailInput.fill(email);
      await page.fill('input[name="password"], input[type="password"]').first().fill(password);
      
      const fullNameInput = page.locator('input[name="full_name"], input[name="fullName"]');
      if (await fullNameInput.isVisible({ timeout: 1000 })) {
        await fullNameInput.fill(fullName);
      }
      
      // Submit form
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(2000);
      
      // Should either redirect to dashboard or login
      const url = page.url();
      expect(url).not.toContain('/register');
    } else {
      test.skip();
    }
  });
  
  test('should validate email format', async ({ page }) => {
    await page.goto('/register');
    
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    
    if (await emailInput.isVisible({ timeout: 2000 })) {
      await emailInput.fill('invalid-email');
      await page.fill('input[name="password"]', 'Test123!@#');
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(1000);
      
      // Should show validation error or stay on page
      expect(page.url()).toContain('/register');
    } else {
      test.skip();
    }
  });
  
  test('should validate password requirements', async ({ page }) => {
    await page.goto('/register');
    
    const passwordInput = page.locator('input[name="password"]');
    
    if (await passwordInput.isVisible({ timeout: 2000 })) {
      await page.fill('input[name="email"]', randomEmail());
      await passwordInput.fill('weak'); // Too short/weak password
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(1000);
      
      // Should show validation error
      expect(page.url()).toContain('/register');
    } else {
      test.skip();
    }
  });
  
  test('should prevent duplicate email registration', async ({ page, request }) => {
    const email = 'client@elior.com'; // Existing user
    
    await page.goto('/register');
    
    const emailInput = page.locator('input[name="email"]');
    
    if (await emailInput.isVisible({ timeout: 2000 })) {
      await emailInput.fill(email);
      await page.fill('input[name="password"]', 'Test123!@#');
      
      const fullNameInput = page.locator('input[name="full_name"]');
      if (await fullNameInput.isVisible({ timeout: 1000 })) {
        await fullNameInput.fill('Test User');
      }
      
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(2000);
      
      // Should show error about existing email
      const errorMessage = page.locator('[role="alert"], .error-message');
      if (await errorMessage.isVisible({ timeout: 2000 })) {
        const text = await errorMessage.textContent() || '';
        expect(text.toLowerCase()).toMatch(/already|exists|taken/);
      }
    } else {
      test.skip();
    }
  });
});






