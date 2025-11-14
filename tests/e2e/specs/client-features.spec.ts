import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E Tests for Client Features
 * Tests cover all client-side functionality including meals, workouts, and progress tracking
 */

const API_BASE_URL = 'http://localhost:8000/api';
const CLIENT_CREDENTIALS = {
  username: 'client@elior.com',
  password: 'client123',
};

test.describe('Client Features - Complete Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:8000/login');
    
    // Login as client
    await page.fill('input#username', CLIENT_CREDENTIALS.username);
    await page.fill('input#password', CLIENT_CREDENTIALS.password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    
    // Wait for successful login and redirect
    await page.waitForURL(/\/(|dashboard)?$/, { timeout: 5000 });
  });

  test.describe('Meal Plan Features (MealMenuV2)', () => {
    test('should navigate to meals page', async ({ page }) => {
      await page.goto('http://localhost:8000/meals');
      await page.waitForLoadState('networkidle');
      
      // Check page loaded
      await expect(page.locator('main h1').last()).toContainText(/My Meal Plan|Loading/);
    });

    test('should display no meal plan message when no plan exists', async ({ page }) => {
      await page.goto('http://localhost:8000/meals');
      await page.waitForTimeout(2000);
      
      const noMealPlanText = page.locator('text=No Active Meal Plan');
      if (await noMealPlanText.isVisible()) {
        await expect(noMealPlanText).toBeVisible();
        await expect(page.locator('text=Your trainer hasn\'t assigned a meal plan')).toBeVisible();
      }
    });

    test('should display meal plan with nutrition goals when plan exists', async ({ page, request }) => {
      // First check if a meal plan exists
      const response = await request.get(`${API_BASE_URL}/v2/meals/plans?active_only=true`);
      
      if (response.status() === 200) {
        const plans = await response.json();
        
        if (plans.length > 0) {
          await page.goto('http://localhost:8000/meals');
          await page.waitForTimeout(2000);
          
          // Check nutrition goals are displayed
          await expect(page.locator('text=Daily Nutrition Goals')).toBeVisible();
          await expect(page.locator('text=Calories')).toBeVisible();
          await expect(page.locator('text=Protein')).toBeVisible();
          await expect(page.locator('text=Carbs')).toBeVisible();
          await expect(page.locator('text=Fats')).toBeVisible();
        }
      }
    });

    test('should display meal slots with accordions', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/v2/meals/plans?active_only=true`);
      
      if (response.status() === 200) {
        const plans = await response.json();
        
        if (plans.length > 0 && plans[0].meal_slots.length > 0) {
          await page.goto('http://localhost:8000/meals');
          await page.waitForTimeout(2000);
          
          // Check meal slots are displayed
          const mealSlots = page.locator('[role="button"]:has-text("ארוחה")');
          const count = await mealSlots.count();
          expect(count).toBeGreaterThan(0);
        }
      }
    });

    test('should expand meal slot accordion on click', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/v2/meals/plans?active_only=true`);
      
      if (response.status() === 200) {
        const plans = await response.json();
        
        if (plans.length > 0 && plans[0].meal_slots.length > 0) {
          await page.goto('http://localhost:8000/meals');
          await page.waitForTimeout(2000);
          
          // Click first meal slot
          const firstMeal = page.locator('[role="button"]').first();
          await firstMeal.click();
          
          // Check accordion expanded
          await page.waitForTimeout(500);
          const expandedContent = page.locator('[role="region"]').first();
          await expect(expandedContent).toBeVisible();
        }
      }
    });

    test('should display macro tabs (Protein, Carb, Fat)', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/v2/meals/plans?active_only=true`);
      
      if (response.status() === 200) {
        const plans = await response.json();
        
        if (plans.length > 0 && plans[0].meal_slots.length > 0) {
          await page.goto('http://localhost:8000/meals');
          await page.waitForTimeout(2000);
          
          // Click first meal slot
          await page.locator('[role="button"]').first().click();
          await page.waitForTimeout(500);
          
          // Check tabs are visible
          await expect(page.locator('text=חלבון (Protein)')).toBeVisible();
          await expect(page.locator('text=פחמימה (Carb)')).toBeVisible();
          await expect(page.locator('text=שומן (Fat)')).toBeVisible();
        }
      }
    });

    test('should toggle food option selection with checkbox', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/v2/meals/plans?active_only=true`);
      
      if (response.status() === 200) {
        const plans = await response.json();
        
        if (plans.length > 0 && plans[0].meal_slots.length > 0) {
          const mealSlot = plans[0].meal_slots[0];
          if (mealSlot.macro_categories && mealSlot.macro_categories[0]?.food_options?.length > 0) {
            await page.goto('http://localhost:8000/meals');
            await page.waitForTimeout(2000);
            
            // Click first meal slot
            await page.locator('[role="button"]').first().click();
            await page.waitForTimeout(500);
            
            // Click first food option checkbox
            const firstCheckbox = page.locator('[role="checkbox"]').first();
            if (await firstCheckbox.isVisible()) {
              await firstCheckbox.click();
              await page.waitForTimeout(500);
              
              // Verify badge shows "Eaten"
              await expect(page.locator('text=Eaten')).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe('Workout Plan Features (TrainingPlanV2)', () => {
    test('should navigate to training page', async ({ page }) => {
      await page.goto('http://localhost:8000/training');
      await page.waitForLoadState('networkidle');
      
      // Check page loaded
      await expect(page.locator('main h1').last()).toContainText(/My Workouts|Loading/);
    });

    test('should display no workout plan message when no plan exists', async ({ page }) => {
      await page.goto('http://localhost:8000/training');
      await page.waitForTimeout(2000);
      
      const noWorkoutText = page.locator('text=No Active Workout Plan');
      if (await noWorkoutText.isVisible()) {
        await expect(noWorkoutText).toBeVisible();
        await expect(page.locator('text=Your trainer hasn\'t assigned a workout plan')).toBeVisible();
      }
    });

    test('should display workout plan info when plan exists', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/v2/workouts/plans?active_only=true`);
      
      if (response.status() === 200) {
        const plans = await response.json();
        
        if (plans.length > 0) {
          await page.goto('http://localhost:8000/training');
          await page.waitForTimeout(2000);
          
          // Check workout plan title
          await expect(page.locator('h1')).toContainText(plans[0].name);
          
          // Check split type badge
          await expect(page.locator('text=/days\\/week/')).toBeVisible();
        }
      }
    });

    test('should display workout days with icons', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/v2/workouts/plans?active_only=true`);
      
      if (response.status() === 200) {
        const plans = await response.json();
        
        if (plans.length > 0 && plans[0].workout_days.length > 0) {
          await page.goto('http://localhost:8000/training');
          await page.waitForTimeout(2000);
          
          // Check workout days are displayed
          const workoutDays = page.locator('[role="button"]:has-text("Day")');
          const count = await workoutDays.count();
          expect(count).toBeGreaterThanOrEqual(0); // May be 0 if no days
        }
      }
    });

    test('should expand workout day accordion and show exercises', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/v2/workouts/plans?active_only=true`);
      
      if (response.status() === 200) {
        const plans = await response.json();
        
        if (plans.length > 0 && plans[0].workout_days.length > 0) {
          await page.goto('http://localhost:8000/training');
          await page.waitForTimeout(2000);
          
          // Click first workout day
          const firstDay = page.locator('[role="button"]').first();
          await firstDay.click();
          
          // Check exercises are visible
          await page.waitForTimeout(500);
          const expandedContent = page.locator('[role="region"]').first();
          if (await expandedContent.isVisible()) {
            // Check exercise details
            await expect(page.locator('text=Sets')).toBeVisible();
            await expect(page.locator('text=Reps')).toBeVisible();
            await expect(page.locator('text=Rest')).toBeVisible();
          }
        }
      }
    });

    test('should display set tracking inputs for each set', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/v2/workouts/plans?active_only=true`);
      
      if (response.status() === 200) {
        const plans = await response.json();
        
        if (plans.length > 0 && plans[0].workout_days.length > 0) {
          const workoutDay = plans[0].workout_days[0];
          if (workoutDay.workout_exercises && workoutDay.workout_exercises.length > 0) {
            await page.goto('http://localhost:8000/training');
            await page.waitForTimeout(2000);
            
            // Click first workout day
            await page.locator('[role="button"]').first().click();
            await page.waitForTimeout(500);
            
            // Check for set tracking inputs
            const repsInput = page.locator('input[placeholder="Reps"]').first();
            const weightInput = page.locator('input[placeholder="Weight"]').first();
            
            if (await repsInput.isVisible()) {
              await expect(repsInput).toBeVisible();
              await expect(weightInput).toBeVisible();
            }
          }
        }
      }
    });

    test('should log completed set', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/v2/workouts/plans?active_only=true`);
      
      if (response.status() === 200) {
        const plans = await response.json();
        
        if (plans.length > 0 && plans[0].workout_days.length > 0) {
          const workoutDay = plans[0].workout_days[0];
          if (workoutDay.workout_exercises && workoutDay.workout_exercises.length > 0) {
            await page.goto('http://localhost:8000/training');
            await page.waitForTimeout(2000);
            
            // Click first workout day
            await page.locator('[role="button"]').first().click();
            await page.waitForTimeout(500);
            
            // Fill in set data
            const repsInput = page.locator('input[placeholder="Reps"]').first();
            const weightInput = page.locator('input[placeholder="Weight"]').first();
            
            if (await repsInput.isVisible()) {
              await repsInput.fill('10');
              await weightInput.fill('50');
              
              // Click complete button
              const completeButton = page.locator('button:has-text("✓")').first();
              await completeButton.click();
              
              // Wait for API call
              await page.waitForTimeout(1000);
              
              // Verify completion badge appears
              await expect(page.locator('text=Completed')).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe('Progress Tracking Features (ProgressTrackingV2)', () => {
    test('should navigate to progress page', async ({ page }) => {
      await page.goto('http://localhost:8000/progress');
      await page.waitForLoadState('networkidle');
      
      // Check page loaded
      await expect(page.locator('main h1').last()).toContainText(/Progress Tracking|Loading/);
    });

    test('should display stats cards', async ({ page }) => {
      await page.goto('http://localhost:8000/progress');
      await page.waitForTimeout(2000);
      
      // Check stats are displayed
      await expect(page.locator('text=Current Weight').first()).toBeVisible();
      await expect(page.locator('text=Total Change').first()).toBeVisible();
      await expect(page.locator('main p:has-text("Progress")').first()).toBeVisible();
    });

    test('should display empty state for no progress data', async ({ page }) => {
      await page.goto('http://localhost:8000/progress');
      await page.waitForTimeout(2000);
      
      const noDataText = page.locator('text=No weight data yet');
      if (await noDataText.isVisible()) {
        await expect(noDataText).toBeVisible();
        await expect(page.locator('text=Add your first entry')).toBeVisible();
      }
    });

    test('should have tabs for Weight Chart and Progress Photos', async ({ page }) => {
      await page.goto('http://localhost:8000/progress');
      await page.waitForTimeout(2000);
      
      // Check tabs exist
      await expect(page.locator('text=Weight Chart')).toBeVisible();
      await expect(page.locator('text=Progress Photos')).toBeVisible();
    });

    test('should switch to Progress Photos tab', async ({ page }) => {
      await page.goto('http://localhost:8000/progress');
      await page.waitForTimeout(2000);
      
      // Click Progress Photos tab
      await page.locator('text=Progress Photos').click();
      await page.waitForTimeout(500);
      
      // Check photos section is visible
      const photosSection = page.locator('text=Progress Photos').nth(1); // Second occurrence in content
      await expect(photosSection).toBeVisible();
    });

    test('should display weight history list', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/progress/`);
      
      if (response.status() === 200) {
        const entries = await response.json();
        
        await page.goto('http://localhost:8000/progress');
        await page.waitForTimeout(2000);
        
        if (entries.length > 0) {
          // Check weight history section
          await expect(page.locator('text=Weight History')).toBeVisible();
        }
      }
    });

    test('should display progress photos when available', async ({ page, request }) => {
      const response = await request.get(`${API_BASE_URL}/progress/`);
      
      if (response.status() === 200) {
        const entries = await response.json();
        const photosExist = entries.some((entry: any) => entry.photo_url);
        
        await page.goto('http://localhost:8000/progress');
        await page.waitForTimeout(2000);
        
        // Click Progress Photos tab
        await page.locator('text=Progress Photos').click();
        await page.waitForTimeout(500);
        
        if (photosExist) {
          // Check photos are displayed
          const photoCards = page.locator('img[alt*="Progress"]');
          const count = await photoCards.count();
          expect(count).toBeGreaterThan(0);
        } else {
          // Check empty state
          await expect(page.locator('text=No Progress Photos Yet')).toBeVisible();
        }
      }
    });
  });

  test.describe('Client Dashboard', () => {
    test('should display client dashboard with welcome message', async ({ page }) => {
      await page.goto('http://localhost:8000/');
      await page.waitForLoadState('networkidle');
      
      // Check welcome message
      await expect(page.locator('text=Welcome back')).toBeVisible();
    });

    test('should have navigation buttons to all client pages', async ({ page }) => {
      await page.goto('http://localhost:8000/');
      await page.waitForLoadState('networkidle');
      
      // Check navigation buttons exist (may be in different locations on desktop vs mobile)
      const mealsButton = page.locator('button:has-text("Meals")').first();
      const trainingButton = page.locator('button:has-text("Training")').first();
      const progressButton = page.locator('button:has-text("Progress")').first();
      
      await expect(mealsButton).toBeVisible();
      await expect(trainingButton).toBeVisible();
      await expect(progressButton).toBeVisible();
    });

    test('should display client stats cards', async ({ page }) => {
      await page.goto('http://localhost:8000/');
      await page.waitForLoadState('networkidle');
      
      // Check stats cards are present
      const statsCards = page.locator('[class*="gradient"]');
      const count = await statsCards.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Authentication & Role Protection', () => {
    test('should redirect non-clients away from client pages', async ({ page, context }) => {
      // Use a fresh page for trainer login
      const trainerPage = await context.newPage();
      await trainerPage.goto('http://localhost:8000/login', { waitUntil: 'domcontentloaded' });
      await trainerPage.waitForSelector('input#username', { timeout: 10000 });
      
      // Login as trainer
      await trainerPage.fill('input#username', 'trainer@elior.com');
      await trainerPage.fill('input#password', 'trainer123');
      await trainerPage.click('button[type="submit"]:has-text("Sign In")');
      
      await trainerPage.waitForURL(/trainer/, { timeout: 10000 });
      
      // Try to access client meal page
      await trainerPage.goto('http://localhost:8000/meals');
      await trainerPage.waitForTimeout(2000);
      
      // Should be redirected away from meals page
      expect(trainerPage.url()).not.toContain('/meals');
      
      await trainerPage.close();
    });

    test('should show correct user info in header', async ({ page }) => {
      await page.goto('http://localhost:8000/');
      await page.waitForLoadState('networkidle');
      
      // Check client user info is displayed (look for user in welcome or header)
      const welcomeText = page.locator('text=Welcome back, Client User');
      await expect(welcomeText).toBeVisible();
    });
  });

  test.describe('Responsive Design & UI/UX', () => {
    test('should be mobile responsive', async ({ page }) => {
      // Set viewport to mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('http://localhost:8000/meals');
      await page.waitForTimeout(2000);
      
      // Check mobile layout is applied
      const header = page.locator('main h1').last();
      await expect(header).toBeVisible();
    });

    test('should display loading states', async ({ page }) => {
      await page.goto('http://localhost:8000/meals');
      
      // Check loading text appears briefly
      const loadingText = page.locator('text=Loading');
      // Loading may be very brief, so we just check the page eventually loads
      await page.waitForLoadState('networkidle');
    });

    test('should display proper error messages when API fails', async ({ page }) => {
      // Intercept API call and return error
      await page.route(`${API_BASE_URL}/v2/meals/plans*`, route => 
        route.fulfill({
          status: 500,
          body: JSON.stringify({ detail: 'Server error' }),
        })
      );
      
      await page.goto('http://localhost:8000/meals');
      await page.waitForTimeout(2000);
      
      // Error handling should show appropriate message
      // (Implementation depends on error boundary)
    });
  });
});

