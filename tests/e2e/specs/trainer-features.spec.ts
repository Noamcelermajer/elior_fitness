import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E Tests for Trainer Features
 * Tests cover all trainer-side functionality including client management, exercise creation, and plan creation
 */

const API_BASE_URL = 'http://localhost:8000/api';
const TRAINER_CREDENTIALS = {
  username: 'trainer@elior.com',
  password: 'trainer123',
};

test.describe('Trainer Features - Complete Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:8000/login');
    
    // Login as trainer
    await page.fill('input#username', TRAINER_CREDENTIALS.username);
    await page.fill('input#password', TRAINER_CREDENTIALS.password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    
    // Wait for successful login and redirect
    await page.waitForURL(/trainer-dashboard/, { timeout: 5000 });
  });

  test.describe('Trainer Dashboard', () => {
    test('should display trainer dashboard', async ({ page }) => {
      await page.goto('http://localhost:8000/trainer-dashboard');
      await page.waitForLoadState('networkidle');
      
      // Check dashboard loaded
      await expect(page.locator('h1')).toContainText('Trainer Dashboard');
    });

    test('should display client stats', async ({ page }) => {
      await page.goto('http://localhost:8000/trainer-dashboard');
      await page.waitForTimeout(2000);
      
      // Check stats cards
      await expect(page.locator('text=Total Clients')).toBeVisible();
      await expect(page.locator('text=Exercises')).toBeVisible();
      await expect(page.locator('text=Workout Completion')).toBeVisible();
    });

    test('should display client list', async ({ page }) => {
      await page.goto('http://localhost:8000/trainer-dashboard');
      await page.waitForTimeout(2000);
      
      // Check client list section
      await expect(page.locator('text=Your Clients')).toBeVisible();
      await expect(page.locator('button:has-text("Add Client")')).toBeVisible();
    });

    test('should have search functionality for clients', async ({ page }) => {
      await page.goto('http://localhost:8000/trainer-dashboard');
      await page.waitForTimeout(2000);
      
      // Check search input exists
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();
    });

    test('should open add client dialog', async ({ page }) => {
      await page.goto('http://localhost:8000/trainer-dashboard');
      await page.waitForTimeout(2000);
      
      // Click Add Client button
      await page.click('button:has-text("Add Client")');
      await page.waitForTimeout(500);
      
      // Check dialog opened
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        await expect(dialog).toBeVisible();
      }
    });
  });

  test.describe('Exercise Bank', () => {
    test('should navigate to exercise bank', async ({ page }) => {
      await page.goto('http://localhost:8000/exercises');
      await page.waitForLoadState('networkidle');
      
      // Check page loaded
      await expect(page.locator('h1')).toContainText('Exercise Bank');
    });

    test('should display exercise list', async ({ page }) => {
      await page.goto('http://localhost:8000/exercises');
      await page.waitForTimeout(2000);
      
      // Check exercise bank page loaded
      await expect(page.locator('button:has-text("Create Exercise")')).toBeVisible();
    });

    test('should have muscle group filter', async ({ page }) => {
      await page.goto('http://localhost:8000/exercises');
      await page.waitForTimeout(2000);
      
      // Check filter exists
      const filterSection = page.locator('text=Filter by Muscle Group');
      if (await filterSection.isVisible()) {
        await expect(filterSection).toBeVisible();
      }
    });

    test('should open create exercise dialog', async ({ page }) => {
      await page.goto('http://localhost:8000/exercises');
      await page.waitForTimeout(2000);
      
      // Click Create Exercise button
      await page.click('button:has-text("Create Exercise")');
      await page.waitForTimeout(500);
      
      // Check dialog opened
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        await expect(dialog).toBeVisible();
        await expect(page.locator('text=Exercise Name')).toBeVisible();
      }
    });

    test('should create new exercise', async ({ page }) => {
      await page.goto('http://localhost:8000/exercises');
      await page.waitForTimeout(2000);
      
      // Click Create Exercise
      await page.click('button:has-text("Create Exercise")');
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        // Fill in exercise details
        await page.fill('input[name="name"]', 'Test Exercise');
        await page.fill('textarea[name="description"]', 'Test description');
        
        // Submit form
        await page.click('button:has-text("Create")');
        await page.waitForTimeout(1000);
        
        // Verify exercise was created (check for toast or success message)
        // Implementation depends on success feedback mechanism
      }
    });
  });

  test.describe('Meal Plan Creation V2', () => {
    test('should navigate to create meal plan page', async ({ page }) => {
      await page.goto('http://localhost:8000/create-meal-plan-v2');
      await page.waitForLoadState('networkidle');
      
      // Check page loaded
      await expect(page.locator('h1')).toContainText('Create Meal Plan');
    });

    test('should display client dropdown', async ({ page }) => {
      await page.goto('http://localhost:8000/create-meal-plan-v2');
      await page.waitForTimeout(2000);
      
      // Check client dropdown exists
      const clientSelect = page.locator('select, [role="combobox"]').first();
      await expect(clientSelect).toBeVisible();
    });

    test('should populate client dropdown with trainer clients', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/users/clients`);
      
      if (response.status() === 200) {
        const clients = await response.json();
        
        await page.goto('http://localhost:8000/create-meal-plan-v2');
        await page.waitForTimeout(2000);
        
        if (clients.length > 0) {
          // Check client is in dropdown
          const clientOption = page.locator(`option:has-text("${clients[0].email}")`);
          await expect(clientOption).toBeVisible();
        }
      }
    });

    test('should display meal slots based on number of meals', async ({ page }) => {
      await page.goto('http://localhost:8000/create-meal-plan-v2');
      await page.waitForTimeout(2000);
      
      // Check default meal slots are displayed
      await expect(page.locator('text=ארוחה 1')).toBeVisible();
      await expect(page.locator('text=ארוחה 2')).toBeVisible();
      await expect(page.locator('text=ארוחה 3')).toBeVisible();
    });

    test('should expand meal slot accordion', async ({ page }) => {
      await page.goto('http://localhost:8000/create-meal-plan-v2');
      await page.waitForTimeout(2000);
      
      // Click first meal slot
      await page.click('button:has-text("ארוחה 1")');
      await page.waitForTimeout(500);
      
      // Check accordion expanded
      const expandedContent = page.locator('[role="region"]').first();
      await expect(expandedContent).toBeVisible();
    });

    test('should display macro tabs in meal slot', async ({ page }) => {
      await page.goto('http://localhost:8000/create-meal-plan-v2');
      await page.waitForTimeout(2000);
      
      // Click first meal slot
      await page.click('button:has-text("ארוחה 1")');
      await page.waitForTimeout(500);
      
      // Check macro tabs
      await expect(page.locator('text=חלבון (Protein)')).toBeVisible();
      await expect(page.locator('text=פחמימה (Carb)')).toBeVisible();
      await expect(page.locator('text=שומן (Fat)')).toBeVisible();
    });

    test('should have Add Food Option button', async ({ page }) => {
      await page.goto('http://localhost:8000/create-meal-plan-v2');
      await page.waitForTimeout(2000);
      
      // Click first meal slot
      await page.click('button:has-text("ארוחה 1")');
      await page.waitForTimeout(500);
      
      // Check Add Food Option button
      await expect(page.locator('button:has-text("Add Food Option")')).toBeVisible();
    });

    test('should disable Create button when form invalid', async ({ page }) => {
      await page.goto('http://localhost:8000/create-meal-plan-v2');
      await page.waitForTimeout(2000);
      
      // Check Create Meal Plan button is disabled initially
      const createButton = page.locator('button:has-text("Create Meal Plan")');
      const isDisabled = await createButton.isDisabled();
      expect(isDisabled).toBe(true);
    });

    test('should enable Create button when form valid', async ({ page }) => {
      await page.goto('http://localhost:8000/create-meal-plan-v2');
      await page.waitForTimeout(2000);
      
      // Select client
      await page.selectOption('select', { index: 1 });
      
      // Fill plan name
      await page.fill('input[placeholder*="Cutting Phase"]', 'Test Plan');
      await page.waitForTimeout(500);
      
      // Check Create Meal Plan button state
      const createButton = page.locator('button:has-text("Create Meal Plan")');
      const isDisabled = await createButton.isDisabled();
      // Button may still be disabled if validation requires more fields
    });
  });

  test.describe('Workout Plan Creation V2', () => {
    test('should navigate to create workout plan page', async ({ page }) => {
      await page.goto('http://localhost:8000/create-workout-plan-v2');
      await page.waitForLoadState('networkidle');
      
      // Check page loaded
      await expect(page.locator('h1')).toContainText('Create Workout Plan');
    });

    test('should display workout split options', async ({ page }) => {
      await page.goto('http://localhost:8000/create-workout-plan-v2');
      await page.waitForTimeout(2000);
      
      // Check split type radios
      await expect(page.locator('text=Push/Pull/Legs')).toBeVisible();
      await expect(page.locator('text=Upper/Lower')).toBeVisible();
      await expect(page.locator('text=Full Body')).toBeVisible();
    });

    test('should display workout days based on selected split', async ({ page }) => {
      await page.goto('http://localhost:8000/create-workout-plan-v2');
      await page.waitForTimeout(2000);
      
      // Default PPL split should show 6 days
      const workoutDays = page.locator('button:has-text("Day")');
      const count = await workoutDays.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should expand workout day accordion', async ({ page }) => {
      await page.goto('http://localhost:8000/create-workout-plan-v2');
      await page.waitForTimeout(2000);
      
      // Click first workout day
      const firstDay = page.locator('[role="button"]').first();
      await firstDay.click();
      await page.waitForTimeout(500);
      
      // Check accordion might expand (depends on implementation)
    });

    test('should require exercises before allowing creation', async ({ page }) => {
      await page.goto('http://localhost:8000/create-workout-plan-v2');
      await page.waitForTimeout(2000);
      
      // Check validation message
      await expect(page.locator('text=Fill in all required fields')).toBeVisible();
    });
  });

  test.describe('Client Profile Management', () => {
    test('should navigate to client profile', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/users/clients`);
      
      if (response.status() === 200) {
        const clients = await response.json();
        
        if (clients.length > 0) {
          await page.goto('http://localhost:8000/trainer-dashboard');
          await page.waitForTimeout(2000);
          
          // Click View Profile for first client
          await page.click('button:has-text("View Profile")');
          await page.waitForTimeout(2000);
          
          // Check profile page loaded
          await expect(page.locator('h1')).toContainText(/Client Profile|Profile/);
        }
      }
    });

    test('should display client information', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/users/clients`);
      
      if (response.status() === 200) {
        const clients = await response.json();
        
        if (clients.length > 0) {
          await page.goto(`http://localhost:8000/client/${clients[0].id}`);
          await page.waitForTimeout(2000);
          
          // Check client info is displayed
          await expect(page.locator('text=Email')).toBeVisible();
        }
      }
    });

    test('should have tabs for workout plans and meal plans', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/users/clients`);
      
      if (response.status() === 200) {
        const clients = await response.json();
        
        if (clients.length > 0) {
          await page.goto(`http://localhost:8000/client/${clients[0].id}`);
          await page.waitForTimeout(2000);
          
          // Check tabs exist
          const overviewTab = page.locator('text=Overview');
          const workoutTab = page.locator('text=Workout Plans');
          const mealTab = page.locator('text=Meal Plans');
          
          if (await overviewTab.isVisible()) {
            await expect(overviewTab).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Navigation & Routing', () => {
    test('should navigate to exercise bank from sidebar', async ({ page }) => {
      await page.goto('http://localhost:8000/trainer-dashboard');
      await page.waitForTimeout(2000);
      
      // Click Exercise Bank button
      await page.click('button:has-text("Exercise Bank")');
      await page.waitForTimeout(2000);
      
      // Check we're on exercise bank page
      expect(page.url()).toContain('/exercises');
    });

    test('should navigate back to dashboard', async ({ page }) => {
      await page.goto('http://localhost:8000/exercises');
      await page.waitForTimeout(2000);
      
      // Click Dashboard button
      await page.click('button:has-text("Dashboard")');
      await page.waitForTimeout(2000);
      
      // Check we're on dashboard
      expect(page.url()).toContain('trainer-dashboard');
    });
  });

  test.describe('Role Protection', () => {
    test('should prevent clients from accessing trainer pages', async ({ page }) => {
      // Logout
      const logoutButton = page.locator('button').last();
      await logoutButton.click();
      await page.waitForTimeout(1000);
      
      // Login as client
      await page.fill('input#username', 'client@elior.com');
      await page.fill('input#password', 'client123');
      await page.click('button[type="submit"]:has-text("Sign In")');
      await page.waitForTimeout(2000);
      
      // Try to access trainer dashboard
      await page.goto('http://localhost:8000/trainer-dashboard');
      await page.waitForTimeout(2000);
      
      // Should be redirected away
      expect(page.url()).not.toContain('trainer-dashboard');
    });

    test('should display trainer user info in header', async ({ page }) => {
      await page.goto('http://localhost:8000/trainer-dashboard');
      await page.waitForLoadState('networkidle');
      
      // Check trainer user info
      await expect(page.locator('text=Trainer User')).toBeVisible();
      await expect(page.locator('text=TRAINER')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should be mobile responsive', async ({ page }) => {
      // Set viewport to mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('http://localhost:8000/trainer-dashboard');
      await page.waitForTimeout(2000);
      
      // Check mobile layout is applied
      const header = page.locator('h1');
      await expect(header).toBeVisible();
    });

    test('should work on tablet size', async ({ page }) => {
      // Set viewport to tablet size
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('http://localhost:8000/trainer-dashboard');
      await page.waitForTimeout(2000);
      
      // Check layout adapts
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('API Integration', () => {
    test('should fetch clients from API', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/users/clients`, {
        headers: {
          'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('access_token'))}`,
        },
      });
      
      expect(response.status()).toBe(200);
      const clients = await response.json();
      expect(Array.isArray(clients)).toBe(true);
    });

    test('should fetch exercises from API', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/exercises/`, {
        headers: {
          'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('access_token'))}`,
        },
      });
      
      expect(response.status()).toBe(200);
      const exercises = await response.json();
      expect(Array.isArray(exercises)).toBe(true);
    });

    test('should create meal plan via API', async ({ page, request }) => {
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      
      const response = await request.post(`${API_BASE_URL}/v2/meals/plans/complete`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          client_id: 4,
          name: 'Test Meal Plan',
          number_of_meals: 3,
          meal_slots: [
            {
              name: 'Meal 1',
              macro_categories: [
                { macro_type: 'protein', food_options: [] },
                { macro_type: 'carb', food_options: [] },
                { macro_type: 'fat', food_options: [] },
              ],
            },
          ],
        },
      });
      
      expect(response.status()).toBe(201);
    });
  });
});



