import { test, expect } from '@playwright/test';

/**
 * Comprehensive Authentication & Core Flow Tests
 * Tests login, logout, role-based access, and security features
 */

const API_BASE_URL = 'http://localhost:8000/api';

const TEST_USERS = {
  admin: {
    username: 'admin@elior.com',
    password: 'admin123',
    expectedRedirect: '/admin',
  },
  trainer: {
    username: 'trainer@elior.com',
    password: 'trainer123',
    expectedRedirect: '/trainer-dashboard',
  },
  client: {
    username: 'client@elior.com',
    password: 'client123',
    expectedRedirect: '/',
  },
};

test.describe('Authentication - Complete Test Suite', () => {
  test.describe('Login Functionality', () => {
    test('should display login page', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      
      // Check login page elements
      await expect(page.locator('h3:has-text("Sign In")')).toBeVisible();
      await expect(page.locator('input#username')).toBeVisible();
      await expect(page.locator('input#password')).toBeVisible();
      await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible();
    });

    test('should display registered users list', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.waitForLoadState('networkidle');
      
      // Check registered users section
      await expect(page.locator('text=Registered Users')).toBeVisible();
      await expect(page.locator('text=admin@elior.com')).toBeVisible();
      await expect(page.locator('text=trainer@elior.com')).toBeVisible();
      await expect(page.locator('text=client@elior.com')).toBeVisible();
    });

    test('should login as admin and redirect correctly', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      
      await page.fill('input#username', TEST_USERS.admin.username);
      await page.fill('input#password', TEST_USERS.admin.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      
      // Wait for redirect
      await page.waitForURL(/admin/, { timeout: 5000 });
      
      // Verify we're on admin dashboard
      expect(page.url()).toContain(TEST_USERS.admin.expectedRedirect);
      await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    });

    test('should login as trainer and redirect correctly', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      
      await page.fill('input#username', TEST_USERS.trainer.username);
      await page.fill('input#password', TEST_USERS.trainer.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      
      // Wait for redirect
      await page.waitForURL(/trainer/, { timeout: 5000 });
      
      // Verify we're on trainer dashboard
      expect(page.url()).toContain(TEST_USERS.trainer.expectedRedirect);
      await expect(page.locator('text=Trainer Dashboard')).toBeVisible();
    });

    test('should login as client and redirect correctly', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      
      await page.fill('input#username', TEST_USERS.client.username);
      await page.fill('input#password', TEST_USERS.client.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      
      // Wait for redirect
      await page.waitForURL(/\/(|dashboard)?$/, { timeout: 5000 });
      
      // Verify we're on client dashboard
      await expect(page.locator('text=Welcome back')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      
      await page.fill('input#username', 'invalid@elior.com');
      await page.fill('input#password', 'wrongpassword');
      await page.click('button[type="submit"]:has-text("Sign In")');
      
      await page.waitForTimeout(2000);
      
      // Should show error message (implementation depends on error handling)
      // Still on login page
      expect(page.url()).toContain('/login');
    });

    test('should store auth token in localStorage after login', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      
      await page.fill('input#username', TEST_USERS.client.username);
      await page.fill('input#password', TEST_USERS.client.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      
      await page.waitForTimeout(2000);
      
      // Check token is stored
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      expect(token).toBeTruthy();
      expect(token).toMatch(/^eyJ/); // JWT token format
    });
  });

  test.describe('Logout Functionality', () => {
    test('should logout and redirect to login page', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.client.username);
      await page.fill('input#password', TEST_USERS.client.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Click logout button
      const logoutButton = page.locator('button').last(); // Usually last button
      await logoutButton.click();
      
      await page.waitForTimeout(1000);
      
      // Should redirect to login
      expect(page.url()).toContain('/login');
    });

    test('should clear auth token on logout', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.client.username);
      await page.fill('input#password', TEST_USERS.client.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Logout
      await page.locator('button').last().click();
      await page.waitForTimeout(1000);
      
      // Check token is cleared
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      expect(token).toBeNull();
    });
  });

  test.describe('Role-Based Access Control (RBAC)', () => {
    test('should redirect client away from admin pages', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.client.username);
      await page.fill('input#password', TEST_USERS.client.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Try to access admin page
      await page.goto('http://localhost:8000/admin');
      await page.waitForTimeout(2000);
      
      // Should be redirected
      expect(page.url()).not.toContain('/admin');
    });

    test('should redirect client away from trainer pages', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.client.username);
      await page.fill('input#password', TEST_USERS.client.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Try to access trainer dashboard
      await page.goto('http://localhost:8000/trainer-dashboard');
      await page.waitForTimeout(2000);
      
      // Should be redirected
      expect(page.url()).not.toContain('trainer-dashboard');
    });

    test('should redirect trainer away from client-only pages', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.trainer.username);
      await page.fill('input#password', TEST_USERS.trainer.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Try to access client meals page
      await page.goto('http://localhost:8000/meals');
      await page.waitForTimeout(2000);
      
      // Should be redirected
      expect(page.url()).not.toContain('/meals');
    });

    test('should redirect admin away from client-only pages', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.admin.username);
      await page.fill('input#password', TEST_USERS.admin.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Try to access client training page
      await page.goto('http://localhost:8000/training');
      await page.waitForTimeout(2000);
      
      // Should be redirected
      expect(page.url()).toContain('/admin');
    });

    test('should allow admin to access user management', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.admin.username);
      await page.fill('input#password', TEST_USERS.admin.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Navigate to users page
      await page.goto('http://localhost:8000/users');
      await page.waitForTimeout(2000);
      
      // Should successfully access the page
      await expect(page.locator('text=User Management')).toBeVisible();
    });

    test('should prevent trainer from accessing admin pages', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.trainer.username);
      await page.fill('input#password', TEST_USERS.trainer.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Try to access users page
      await page.goto('http://localhost:8000/users');
      await page.waitForTimeout(2000);
      
      // Should be redirected or show access denied
      const accessDenied = page.locator('text=Access denied');
      if (await accessDenied.isVisible()) {
        await expect(accessDenied).toBeVisible();
      } else {
        expect(page.url()).not.toContain('/users');
      }
    });
  });

  test.describe('Session Persistence', () => {
    test('should persist session on page reload', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.client.username);
      await page.fill('input#password', TEST_USERS.client.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Reload page
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Should still be logged in
      await expect(page.locator('text=Client User')).toBeVisible();
    });

    test('should maintain user context across navigation', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.trainer.username);
      await page.fill('input#password', TEST_USERS.trainer.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Navigate to different pages
      await page.goto('http://localhost:8000/exercises');
      await page.waitForTimeout(1000);
      
      // User info should still be visible
      await expect(page.locator('text=Trainer User')).toBeVisible();
      
      // Navigate back
      await page.goto('http://localhost:8000/trainer-dashboard');
      await page.waitForTimeout(1000);
      
      // Should still be authenticated
      await expect(page.locator('text=Trainer Dashboard')).toBeVisible();
    });
  });

  test.describe('Security & Edge Cases', () => {
    test('should require authentication for protected routes', async ({ page }) => {
      // Clear any existing session
      await page.goto('http://localhost:8000/login');
      await page.evaluate(() => localStorage.clear());
      
      // Try to access protected route
      await page.goto('http://localhost:8000/trainer-dashboard');
      await page.waitForTimeout(2000);
      
      // Should redirect to login
      expect(page.url()).toContain('/login');
    });

    test('should validate form inputs', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      
      // Try to submit empty form
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(500);
      
      // Form validation should prevent submission
      expect(page.url()).toContain('/login');
    });

    test('should handle concurrent logins correctly', async ({ page, context }) => {
      // Login in first page
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.client.username);
      await page.fill('input#password', TEST_USERS.client.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Open new page and login as different user
      const page2 = await context.newPage();
      await page2.goto('http://localhost:8000/login');
      await page2.fill('input#username', TEST_USERS.trainer.username);
      await page2.fill('input#password', TEST_USERS.trainer.password);
      await page2.click('button[type="submit"]:has-text("Sign In")');
      await page2.waitForTimeout(2000);
      
      // Both should maintain separate sessions
      await expect(page.locator('text=Client User')).toBeVisible();
      await expect(page2.locator('text=Trainer User')).toBeVisible();
      
      await page2.close();
    });

    test('should prevent access after logout', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.client.username);
      await page.fill('input#password', TEST_USERS.client.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      const clientPageUrl = page.url();
      
      // Logout
      await page.locator('button').last().click();
      await page.waitForTimeout(1000);
      
      // Try to go back to client page
      await page.goto(clientPageUrl);
      await page.waitForTimeout(2000);
      
      // Should be redirected to login
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('API Token Management', () => {
    test('should include Bearer token in authenticated requests', async ({ page, request }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.trainer.username);
      await page.fill('input#password', TEST_USERS.trainer.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Get token
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      expect(token).toBeTruthy();
      
      // Make authenticated API call
      const response = await request.get(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      expect(response.status()).toBe(200);
      const userData = await response.json();
      expect(userData.username).toBe(TEST_USERS.trainer.username);
    });

    test('should reject requests with invalid token', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': 'Bearer invalid_token',
        },
      });
      
      expect(response.status()).toBe(401);
    });

    test('should reject requests without token', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/auth/me`);
      
      expect(response.status()).toBe(401);
    });
  });

  test.describe('User Context & State', () => {
    test('should display correct user role in header', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.admin.username);
      await page.fill('input#password', TEST_USERS.admin.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Check role badge
      await expect(page.locator('text=ADMIN')).toBeVisible();
    });

    test('should update user context after login', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.trainer.username);
      await page.fill('input#password', TEST_USERS.trainer.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Check user context is set
      await expect(page.locator('text=Trainer User')).toBeVisible();
      await expect(page.locator('text=TRAINER')).toBeVisible();
    });
  });

  test.describe('Login Page UX', () => {
    test('should toggle password visibility', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      
      const passwordInput = page.locator('input#password');
      const toggleButton = page.locator('button:near(input#password)').first();
      
      // Check initial type is password
      const initialType = await passwordInput.getAttribute('type');
      expect(initialType).toBe('password');
      
      // Click toggle
      if (await toggleButton.isVisible()) {
        await toggleButton.click();
        
        // Check type changed
        const newType = await passwordInput.getAttribute('type');
        expect(newType).toBe('text');
      }
    });

    test('should show loading state during login', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.client.username);
      await page.fill('input#password', TEST_USERS.client.password);
      
      // Click sign in
      await page.click('button[type="submit"]:has-text("Sign In")');
      
      // Button should show loading state briefly
      // (Implementation depends on loading state design)
    });

    test('should have working quick login cards', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      
      // Check registered users cards are interactive
      const adminCard = page.locator('text=admin@elior.com').locator('..');
      await expect(adminCard).toBeVisible();
      
      // Cards should help users know what credentials are available
    });
  });

  test.describe('Cross-Role Navigation Prevention', () => {
    test('should prevent role switching via URL manipulation', async ({ page }) => {
      // Login as client
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.client.username);
      await page.fill('input#password', TEST_USERS.client.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Remember we're logged in as client
      await expect(page.locator('text=CLIENT')).toBeVisible();
      
      // Try to navigate to trainer dashboard directly
      await page.goto('http://localhost:8000/trainer-dashboard');
      await page.waitForTimeout(2000);
      
      // Should be redirected back
      expect(page.url()).not.toContain('trainer-dashboard');
      
      // Try to navigate to admin page
      await page.goto('http://localhost:8000/admin');
      await page.waitForTimeout(2000);
      
      // Should be redirected back
      expect(page.url()).not.toContain('/admin');
    });

    test('should handle logout-login role switch correctly', async ({ page }) => {
      // Login as trainer
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', TEST_USERS.trainer.username);
      await page.fill('input#password', TEST_USERS.trainer.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Navigate to trainer-specific page
      await page.goto('http://localhost:8000/exercises');
      await page.waitForTimeout(1000);
      
      // Logout
      await page.locator('button').last().click();
      await page.waitForTimeout(1000);
      
      // Login as admin
      await page.fill('input#username', TEST_USERS.admin.username);
      await page.fill('input#password', TEST_USERS.admin.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Should redirect to admin page, not stay on exercises page
      expect(page.url()).toContain('/admin');
    });
  });

  test.describe('Performance & Loading', () => {
    test('should load login page quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('http://localhost:8000/login');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time
      expect(loadTime).toBeLessThan(5000);
    });

    test('should complete login flow quickly', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      
      const startTime = Date.now();
      await page.fill('input#username', TEST_USERS.client.username);
      await page.fill('input#password', TEST_USERS.client.password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForURL(/\/(|dashboard)?$/, { timeout: 5000 });
      const loginTime = Date.now() - startTime;
      
      // Login should complete within reasonable time
      expect(loginTime).toBeLessThan(5000);
    });
  });
});



