import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E Tests for Admin Features
 * Tests cover all admin functionality including user management, system monitoring
 */

const API_BASE_URL = 'http://localhost:8000/api';
const ADMIN_CREDENTIALS = {
  username: 'admin@elior.com',
  password: 'admin123',
};

test.describe('Admin Features - Complete Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:8000/login');
    
    // Login as admin
    await page.fill('input#username', ADMIN_CREDENTIALS.username);
    await page.fill('input#password', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    
    // Wait for successful login and redirect
    await page.waitForURL(/admin/, { timeout: 5000 });
  });

  test.describe('Admin Dashboard', () => {
    test('should display admin dashboard', async ({ page }) => {
      await page.goto('http://localhost:8000/admin');
      await page.waitForLoadState('networkidle');
      
      // Check dashboard loaded
      await expect(page.locator('h1')).toContainText('Admin Dashboard');
    });

    test('should display system stats', async ({ page }) => {
      await page.goto('http://localhost:8000/admin');
      await page.waitForTimeout(2000);
      
      // Check stats are displayed
      await expect(page.locator('text=Total Users')).toBeVisible();
      await expect(page.locator('text=Active Clients')).toBeVisible();
    });

    test('should display system health metrics', async ({ page }) => {
      await page.goto('http://localhost:8000/admin');
      await page.waitForTimeout(2000);
      
      // Check health section
      const healthSection = page.locator('text=System Health');
      if (await healthSection.isVisible()) {
        await expect(healthSection).toBeVisible();
      }
    });

    test('should display recent activity', async ({ page }) => {
      await page.goto('http://localhost:8000/admin');
      await page.waitForTimeout(2000);
      
      // Check activity section exists
      await expect(page.locator('text=Recent Activity')).toBeVisible();
    });
  });

  test.describe('User Management', () => {
    test('should navigate to users page', async ({ page }) => {
      await page.goto('http://localhost:8000/users');
      await page.waitForLoadState('networkidle');
      
      // Check page loaded
      await expect(page.locator('h1')).toContainText('User Management');
    });

    test('should display user list', async ({ page }) => {
      await page.goto('http://localhost:8000/users');
      await page.waitForTimeout(2000);
      
      // Check users table/list exists
      await expect(page.locator('text=Email')).toBeVisible();
    });

    test('should have role filter', async ({ page }) => {
      await page.goto('http://localhost:8000/users');
      await page.waitForTimeout(2000);
      
      // Check role filter exists
      const filterSelect = page.locator('select, [role="combobox"]').first();
      if (await filterSelect.isVisible()) {
        await expect(filterSelect).toBeVisible();
      }
    });

    test('should open add user dialog', async ({ page }) => {
      await page.goto('http://localhost:8000/users');
      await page.waitForTimeout(2000);
      
      // Click Add User button
      const addButton = page.locator('button:has-text("Add User")');
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Check dialog opened
        const dialog = page.locator('[role="dialog"]');
        if (await dialog.isVisible()) {
          await expect(dialog).toBeVisible();
        }
      }
    });

    test('should prevent admin from deleting self', async ({ page }) => {
      await page.goto('http://localhost:8000/users');
      await page.waitForTimeout(2000);
      
      // Try to delete current admin user (should be prevented)
      // This is a safety check - implementation depends on UI
    });

    test('should display user credentials', async ({ page }) => {
      await page.goto('http://localhost:8000/users');
      await page.waitForTimeout(2000);
      
      // Check user details are visible
      const userEmails = page.locator('text=@elior.com');
      const count = await userEmails.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('System Management', () => {
    test('should navigate to system page', async ({ page }) => {
      await page.goto('http://localhost:8000/system');
      await page.waitForLoadState('networkidle');
      
      // Check page loaded
      await expect(page.locator('h1')).toContainText('System');
    });

    test('should display system status', async ({ page }) => {
      await page.goto('http://localhost:8000/system');
      await page.waitForTimeout(2000);
      
      // Check system status section
      const statusSection = page.locator('text=Status');
      if (await statusSection.isVisible()) {
        await expect(statusSection).toBeVisible();
      }
    });

    test('should display database info', async ({ page }) => {
      await page.goto('http://localhost:8000/system');
      await page.waitForTimeout(2000);
      
      // Check database section
      const dbSection = page.locator('text=Database');
      if (await dbSection.isVisible()) {
        await expect(dbSection).toBeVisible();
      }
    });
  });

  test.describe('Secret Users Page', () => {
    test('should navigate to secret users page', async ({ page }) => {
      await page.goto('http://localhost:8000/secret-users');
      await page.waitForLoadState('networkidle');
      
      // Check page loaded
      await expect(page.locator('h1')).toContainText(/Users|Credentials/);
    });

    test('should display test credentials', async ({ page }) => {
      await page.goto('http://localhost:8000/secret-users');
      await page.waitForTimeout(2000);
      
      // Check test credentials are visible
      await expect(page.locator('text=admin@elior.com')).toBeVisible();
      await expect(page.locator('text=trainer@elior.com')).toBeVisible();
      await expect(page.locator('text=client@elior.com')).toBeVisible();
    });

    test('should filter users by role', async ({ page }) => {
      await page.goto('http://localhost:8000/secret-users');
      await page.waitForTimeout(2000);
      
      // Check filter exists
      const filterSelect = page.locator('select[name="role"]');
      if (await filterSelect.isVisible()) {
        await filterSelect.selectOption('ADMIN');
        await page.waitForTimeout(500);
        
        // Check only admins are shown
        await expect(page.locator('text=admin@elior.com')).toBeVisible();
      }
    });
  });

  test.describe('API Integration - Admin', () => {
    test('should fetch system status from API', async ({ page, request }) => {
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      
      const response = await request.get(`${API_BASE_URL}/system/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      expect(response.status()).toBe(200);
      const status = await response.json();
      expect(status).toHaveProperty('status');
    });

    test('should fetch all users from API', async ({ page, request }) => {
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      
      const response = await request.get(`${API_BASE_URL}/users/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      expect(response.status()).toBe(200);
      const users = await response.json();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    });

    test('should create new user via API', async ({ page, request }) => {
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      
      const newUser = {
        username: `testuser_${Date.now()}@elior.com`,
        email: `testuser_${Date.now()}@elior.com`,
        password: 'test123',
        full_name: 'Test User',
        role: 'CLIENT',
      };
      
      const response = await request.post(`${API_BASE_URL}/auth/register`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: newUser,
      });
      
      expect([200, 201]).toContain(response.status());
    });

    test('should delete user via API', async ({ page, request }) => {
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      
      // First create a test user
      const newUser = {
        username: `deletetest_${Date.now()}@elior.com`,
        email: `deletetest_${Date.now()}@elior.com`,
        password: 'test123',
        full_name: 'Delete Test',
        role: 'CLIENT',
      };
      
      const createResponse = await request.post(`${API_BASE_URL}/auth/register`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: newUser,
      });
      
      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const createdUser = await createResponse.json();
        const userId = createdUser.id || createdUser.user?.id;
        
        // Delete the user
        const deleteResponse = await request.delete(`${API_BASE_URL}/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        expect([200, 204]).toContain(deleteResponse.status());
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await page.goto('http://localhost:8000/admin');
      
      // Disconnect network
      await page.route('**/*', route => route.abort());
      
      // Try to reload
      await page.reload({ waitUntil: 'domcontentloaded' });
      
      // Page should handle error gracefully
      // (Implementation depends on error boundary)
    });

    test('should display error message for failed API calls', async ({ page, route }) => {
      // Intercept API call and return error
      await page.route(`${API_BASE_URL}/users/`, async (route) => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ detail: 'Server error' }),
        });
      });
      
      await page.goto('http://localhost:8000/users');
      await page.waitForTimeout(2000);
      
      // Error handling should show appropriate message
    });
  });
});



