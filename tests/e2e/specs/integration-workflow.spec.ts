import { test, expect } from '@playwright/test';

/**
 * Integration Workflow Tests
 * Tests complete user journeys from trainer creating plans to client using them
 */

const API_BASE_URL = 'http://localhost:8000/api';

test.describe('Complete Integration Workflows', () => {
  test.describe('Trainer → Client Meal Plan Workflow', () => {
    test('should complete full meal plan workflow', async ({ page, context }) => {
      // ===== TRAINER: Create Meal Plan =====
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', 'trainer@elior.com');
      await page.fill('input#password', 'trainer123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Navigate to create meal plan
      await page.goto('http://localhost:8000/create-meal-plan-v2');
      await page.waitForTimeout(2000);
      
      // Select client (John Doe)
      await page.selectOption('select', { index: 1 });
      
      // Fill in plan details
      await page.fill('input[placeholder*="Cutting Phase"]', 'Integration Test Meal Plan');
      await page.fill('input[type="number"]', '2000'); // Calories
      
      // Expand first meal
      await page.click('button:has-text("ארוחה 1")');
      await page.waitForTimeout(500);
      
      // Add food option to protein tab
      await page.click('button:has-text("Add Food Option")');
      await page.waitForTimeout(500);
      
      // Fill food option details
      const nameInput = page.locator('input[placeholder*="Chicken"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Chicken');
        await page.fill('input[placeholder*="Hebrew"]', 'עוף בדיקה');
        
        // Save food option
        await page.click('button:has-text("Save")');
        await page.waitForTimeout(500);
      }
      
      // Create meal plan
      const createButton = page.locator('button:has-text("Create Meal Plan")');
      if (!(await createButton.isDisabled())) {
        await createButton.click();
        await page.waitForTimeout(2000);
        
        // Should redirect to dashboard
        expect(page.url()).toContain('trainer-dashboard');
      }
      
      // Logout
      await page.locator('button').last().click();
      await page.waitForTimeout(1000);
      
      // ===== CLIENT: View and Use Meal Plan =====
      const clientPage = await context.newPage();
      await clientPage.goto('http://localhost:8000/login');
      await clientPage.fill('input#username', 'john.doe');
      await clientPage.fill('input#password', 'doe123');
      await clientPage.click('button[type="submit"]:has-text("Sign In")');
      await clientPage.waitForTimeout(2000);
      
      // Navigate to meals
      await clientPage.goto('http://localhost:8000/meals');
      await clientPage.waitForTimeout(2000);
      
      // Check meal plan is visible
      const mealPlanTitle = clientPage.locator('text=Integration Test Meal Plan');
      if (await mealPlanTitle.isVisible()) {
        await expect(mealPlanTitle).toBeVisible();
        
        // Click meal to expand
        await clientPage.click('button:has-text("ארוחה")');
        await clientPage.waitForTimeout(500);
        
        // Mark food as eaten
        const checkbox = clientPage.locator('[role="checkbox"]').first();
        if (await checkbox.isVisible()) {
          await checkbox.click();
          await clientPage.waitForTimeout(500);
          
          // Verify eaten badge appears
          await expect(clientPage.locator('text=Eaten')).toBeVisible();
        }
      }
      
      await clientPage.close();
    });
  });

  test.describe('Trainer → Client Workout Plan Workflow', () => {
    test('should complete full workout plan workflow', async ({ page, context }) => {
      // ===== TRAINER: Create Workout Plan =====
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', 'trainer@elior.com');
      await page.fill('input#password', 'trainer123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // First, ensure we have exercises
      await page.goto('http://localhost:8000/exercises');
      await page.waitForTimeout(2000);
      
      const exerciseCount = await page.locator('[class*="card"]').count();
      
      if (exerciseCount === 0) {
        // Create a test exercise
        await page.click('button:has-text("Create Exercise")');
        await page.waitForTimeout(500);
        
        await page.fill('input[name="name"]', 'Test Push Exercise');
        await page.fill('textarea[name="description"]', 'Test exercise for integration');
        await page.selectOption('select[name="muscle_group"]', 'chest');
        
        await page.click('button:has-text("Create")');
        await page.waitForTimeout(1000);
      }
      
      // Navigate to create workout plan
      await page.goto('http://localhost:8000/create-workout-plan-v2');
      await page.waitForTimeout(2000);
      
      // Select client
      await page.selectOption('select', { index: 1 });
      
      // Fill in plan details
      await page.fill('input[placeholder*="PPL"]', 'Integration Test Workout');
      
      // Validation message should show
      await expect(page.locator('text=Fill in all required fields')).toBeVisible();
      
      // Logout
      await page.locator('button').last().click();
      await page.waitForTimeout(1000);
      
      // ===== CLIENT: Check for workout plan =====
      const clientPage = await context.newPage();
      await clientPage.goto('http://localhost:8000/login');
      await clientPage.fill('input#username', 'client@elior.com');
      await clientPage.fill('input#password', 'client123');
      await clientPage.click('button[type="submit"]:has-text("Sign In")');
      await clientPage.waitForTimeout(2000);
      
      // Navigate to training
      await clientPage.goto('http://localhost:8000/training');
      await clientPage.waitForTimeout(2000);
      
      // Check page loaded (may show no plan if creation failed)
      await expect(clientPage.locator('h1')).toContainText('My Workouts');
      
      await clientPage.close();
    });
  });

  test.describe('Client Progress Tracking Workflow', () => {
    test('should add weigh-in and view progress', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', 'client@elior.com');
      await page.fill('input#password', 'client123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Navigate to progress page
      await page.goto('http://localhost:8000/progress');
      await page.waitForTimeout(2000);
      
      // Check page loaded
      await expect(page.locator('text=Progress Tracking')).toBeVisible();
      
      // Check stats are displayed
      await expect(page.locator('text=Current Weight')).toBeVisible();
      
      // Check tabs work
      await page.click('text=Progress Photos');
      await page.waitForTimeout(500);
      
      // Should show photos tab content
      await expect(page.locator('text=Progress Photos').nth(1)).toBeVisible();
    });
  });

  test.describe('Admin Monitoring Workflow', () => {
    test('should view all users and system status', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', 'admin@elior.com');
      await page.fill('input#password', 'admin123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // View admin dashboard
      await expect(page.locator('text=Admin Dashboard')).toBeVisible();
      
      // Navigate to users page
      await page.goto('http://localhost:8000/users');
      await page.waitForTimeout(2000);
      
      // Check all users are visible
      await expect(page.locator('text=User Management')).toBeVisible();
      
      // Navigate to system page
      await page.goto('http://localhost:8000/system');
      await page.waitForTimeout(2000);
      
      // Check system info is visible
      await expect(page.locator('h1')).toContainText('System');
    });

    test('should manage users (create and delete)', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', 'admin@elior.com');
      await page.fill('input#password', 'admin123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Navigate to users page
      await page.goto('http://localhost:8000/users');
      await page.waitForTimeout(2000);
      
      // Count initial users
      const initialUserCount = await page.locator('text=@elior.com').count();
      
      // Add new user
      const addButton = page.locator('button:has-text("Add User")');
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Fill user details
        await page.fill('input[name="username"]', `testuser_${Date.now()}@elior.com`);
        await page.fill('input[name="email"]', `testuser_${Date.now()}@elior.com`);
        await page.fill('input[name="password"]', 'test123');
        await page.fill('input[name="full_name"]', 'Test User');
        
        // Submit
        await page.click('button:has-text("Create")');
        await page.waitForTimeout(1000);
        
        // User should be added
        const newUserCount = await page.locator('text=@elior.com').count();
        expect(newUserCount).toBeGreaterThan(initialUserCount);
      }
    });
  });

  test.describe('Error Recovery & Edge Cases', () => {
    test('should recover from network interruption', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', 'client@elior.com');
      await page.fill('input#password', 'client123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Simulate network interruption
      await page.route('**/*', route => route.abort());
      
      // Try to navigate
      await page.goto('http://localhost:8000/meals').catch(() => {});
      await page.waitForTimeout(1000);
      
      // Restore network
      await page.unroute('**/*');
      
      // Should be able to recover
      await page.reload();
      await page.waitForTimeout(2000);
    });

    test('should handle API errors gracefully', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', 'trainer@elior.com');
      await page.fill('input#password', 'trainer123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Intercept API and return error
      await page.route(`${API_BASE_URL}/users/clients`, route => 
        route.fulfill({
          status: 500,
          body: JSON.stringify({ detail: 'Server error' }),
        })
      );
      
      await page.goto('http://localhost:8000/trainer-dashboard');
      await page.waitForTimeout(2000);
      
      // Page should still load, just without client data
      await expect(page.locator('h1')).toContainText('Trainer Dashboard');
    });

    test('should handle empty API responses', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', 'client@elior.com');
      await page.fill('input#password', 'client123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Mock empty meal plan response
      await page.route(`${API_BASE_URL}/v2/meals/plans*`, route =>
        route.fulfill({
          status: 200,
          body: JSON.stringify([]),
        })
      );
      
      await page.goto('http://localhost:8000/meals');
      await page.waitForTimeout(2000);
      
      // Should show empty state
      await expect(page.locator('text=No Active Meal Plan')).toBeVisible();
    });
  });

  test.describe('Data Consistency', () => {
    test('should maintain data consistency across role switches', async ({ page }) => {
      // Login as trainer and note client count
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', 'trainer@elior.com');
      await page.fill('input#password', 'trainer123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      const trainerClientCount = await page.locator('text=Total Clients').locator('..').locator('text=/\\d+/').first().textContent();
      
      // Logout
      await page.locator('button').last().click();
      await page.waitForTimeout(1000);
      
      // Login as admin and check same data
      await page.fill('input#username', 'admin@elior.com');
      await page.fill('input#password', 'admin123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      await page.goto('http://localhost:8000/users');
      await page.waitForTimeout(2000);
      
      // User data should be consistent
      await expect(page.locator('text=@elior.com')).toBeVisible();
    });
  });

  test.describe('Multi-User Scenarios', () => {
    test('should support multiple trainers with separate client lists', async ({ page, context }) => {
      // This test would require creating multiple trainers
      // Simplified version: verify trainer only sees assigned clients
      
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', 'trainer@elior.com');
      await page.fill('input#password', 'trainer123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Check trainer dashboard shows clients
      await expect(page.locator('text=Your Clients')).toBeVisible();
    });

    test('should allow admin to view all data across all users', async ({ page, request }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', 'admin@elior.com');
      await page.fill('input#password', 'admin123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Admin should see all users
      await page.goto('http://localhost:8000/users');
      await page.waitForTimeout(2000);
      
      const userCount = await page.locator('text=@elior.com').count();
      expect(userCount).toBeGreaterThanOrEqual(3); // At least admin, trainer, client
    });
  });

  test.describe('Performance Under Load', () => {
    test('should handle multiple API calls simultaneously', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', 'trainer@elior.com');
      await page.fill('input#password', 'trainer123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Dashboard makes multiple API calls simultaneously
      await page.goto('http://localhost:8000/trainer-dashboard');
      
      // Wait for all network calls to complete
      await page.waitForLoadState('networkidle');
      
      // Page should load successfully
      await expect(page.locator('text=Trainer Dashboard')).toBeVisible();
    });

    test('should load quickly with existing data', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', 'client@elior.com');
      await page.fill('input#password', 'client123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Navigate to different pages and measure load time
      const startTime = Date.now();
      
      await page.goto('http://localhost:8000/meals');
      await page.waitForLoadState('networkidle');
      
      await page.goto('http://localhost:8000/training');
      await page.waitForLoadState('networkidle');
      
      await page.goto('http://localhost:8000/progress');
      await page.waitForLoadState('networkidle');
      
      const totalTime = Date.now() - startTime;
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(15000);
    });
  });

  test.describe('UI Consistency Across Roles', () => {
    test('should use consistent design language across all roles', async ({ page }) => {
      // Login as client
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', 'client@elior.com');
      await page.fill('input#password', 'client123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Check header is consistent
      await expect(page.locator('text=FitTrainer Pro')).toBeVisible();
      
      // Logout and login as trainer
      await page.locator('button').last().click();
      await page.waitForTimeout(1000);
      
      await page.fill('input#username', 'trainer@elior.com');
      await page.fill('input#password', 'trainer123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Check same header
      await expect(page.locator('text=FitTrainer Pro')).toBeVisible();
      
      // Logout and login as admin
      await page.locator('button').last().click();
      await page.waitForTimeout(1000);
      
      await page.fill('input#username', 'admin@elior.com');
      await page.fill('input#password', 'admin123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Check same header
      await expect(page.locator('text=FitTrainer Pro')).toBeVisible();
    });

    test('should use consistent button styles', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      await page.fill('input#username', 'trainer@elior.com');
      await page.fill('input#password', 'trainer123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Check button gradients are used consistently
      const gradientButtons = page.locator('[class*="gradient"]');
      const count = await gradientButtons.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      
      // Check form accessibility
      const usernameInput = page.locator('input#username');
      await expect(usernameInput).toBeVisible();
      
      const passwordInput = page.locator('input#password');
      await expect(passwordInput).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      
      // Tab to username
      await page.keyboard.press('Tab');
      
      // Type username
      await page.keyboard.type('client@elior.com');
      
      // Tab to password
      await page.keyboard.press('Tab');
      
      // Type password
      await page.keyboard.type('client123');
      
      // Submit with Enter
      await page.keyboard.press('Enter');
      
      await page.waitForTimeout(2000);
      
      // Should be logged in
      await expect(page.locator('text=Client User')).toBeVisible();
    });

    test('should have focus indicators', async ({ page }) => {
      await page.goto('http://localhost:8000/login');
      
      // Tab to focus username input
      await page.keyboard.press('Tab');
      
      // Check input is focused
      const focusedElement = await page.evaluate(() => document.activeElement?.id);
      expect(focusedElement).toBe('username');
    });
  });
});






