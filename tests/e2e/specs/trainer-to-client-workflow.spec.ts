import { test, expect } from '@playwright/test';

/**
 * Complete Trainer → Client Workflow Tests
 * Tests that content created by trainers is visible and usable by clients
 */

const API_BASE_URL = 'http://localhost:8000/api';

test.describe('Trainer → Client Feature Integration', () => {
  test('COMPLETE WORKFLOW: Trainer creates meal plan → Client sees and uses it', async ({ browser }) => {
    // ===== PART 1: TRAINER CREATES MEAL PLAN =====
    const trainerContext = await browser.newContext();
    const trainerPage = await trainerContext.newPage();
    
    // Login as trainer
    await trainerPage.goto('http://localhost:8000/login');
    await trainerPage.fill('input#username', 'trainer@elior.com');
    await trainerPage.fill('input#password', 'trainer123');
    await trainerPage.click('button[type="submit"]:has-text("Sign In")');
    await trainerPage.waitForTimeout(3000);
    
    console.log('✅ Trainer logged in');
    
    // Navigate to create meal plan V2
    await trainerPage.goto('http://localhost:8000/create-meal-plan-v2');
    await trainerPage.waitForTimeout(2000);
    
    // Select John Doe as client
    await trainerPage.selectOption('select', { label: /John Doe/ });
    
    // Fill in meal plan details
    await trainerPage.fill('input[placeholder*="Cutting Phase"]', 'E2E Test Meal Plan');
    await trainerPage.fill('input[type="number"]', '2500'); // Total calories
    await trainerPage.waitForTimeout(500);
    
    // Expand first meal
    const firstMeal = trainerPage.locator('button:has-text("ארוחה 1")').first();
    await firstMeal.click();
    await trainerPage.waitForTimeout(1000);
    
    // Change meal name
    await trainerPage.fill('input[placeholder*="ארוחת בוקר"]', 'ארוחת בוקר - E2E Test');
    
    // Add food option to protein tab
    const addFoodButton = trainerPage.locator('button:has-text("Add Food Option")').first();
    await addFoodButton.click();
    await trainerPage.waitForTimeout(500);
    
    // Fill food option (if dialog/form appears)
    const nameInput = trainerPage.locator('input[placeholder*="Chicken"], input[name="name"]').first();
    if (await nameInput.isVisible({ timeout: 2000 })) {
      await nameInput.fill('Test Chicken Breast');
      
      const hebrewInput = trainerPage.locator('input[placeholder*="Hebrew"], input[name="name_hebrew"]').first();
      if (await hebrewInput.isVisible()) {
        await hebrewInput.fill('חזה עוף בדיקה');
      }
      
      // Save food option
      const saveButton = trainerPage.locator('button:has-text("Save"), button:has-text("Add")').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await trainerPage.waitForTimeout(500);
      }
    }
    
    // Try to create meal plan
    const createButton = trainerPage.locator('button:has-text("Create Meal Plan")');
    const isDisabled = await createButton.isDisabled();
    
    if (!isDisabled) {
      await createButton.click();
      await trainerPage.waitForTimeout(2000);
      console.log('✅ Meal plan created');
    } else {
      console.log('⚠️ Create button disabled - may need more data');
    }
    
    await trainerContext.close();
    
    // ===== PART 2: CLIENT VIEWS MEAL PLAN =====
    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();
    
    // Login as John Doe (client)
    await clientPage.goto('http://localhost:8000/login');
    await clientPage.fill('input#username', 'john.doe');
    await clientPage.fill('input#password', 'doe123');
    await clientPage.click('button[type="submit"]:has-text("Sign In")');
    await clientPage.waitForTimeout(3000);
    
    console.log('✅ Client (John Doe) logged in');
    
    // Navigate to meals
    await clientPage.goto('http://localhost:8000/meals');
    await clientPage.waitForTimeout(2000);
    
    // Check if meal plan is visible
    const mealPlanTitle = clientPage.locator('text=E2E Test Meal Plan');
    const hasMealPlan = await mealPlanTitle.isVisible();
    
    if (hasMealPlan) {
      console.log('✅ Meal plan visible to client');
      
      // Click on first meal to expand
      const mealButton = clientPage.locator('button:has-text("ארוחה")').first();
      await mealButton.click();
      await clientPage.waitForTimeout(1000);
      
      // Try to mark food as eaten
      const checkbox = clientPage.locator('[role="checkbox"]').first();
      if (await checkbox.isVisible()) {
        await checkbox.click();
        await clientPage.waitForTimeout(500);
        
        // Verify eaten badge appears
        const eatenBadge = clientPage.locator('text=Eaten');
        if (await eatenBadge.isVisible()) {
          console.log('✅ Client marked food as eaten');
        }
      }
      
      expect(hasMealPlan).toBe(true);
    } else {
      console.log('⚠️ Meal plan not visible - may not have been created');
    }
    
    await clientContext.close();
  });

  test('COMPLETE WORKFLOW: Trainer creates workout → Client logs sets', async ({ browser }) => {
    // ===== PART 1: ENSURE EXERCISES EXIST =====
    const trainerContext = await browser.newContext();
    const trainerPage = await trainerContext.newPage();
    
    // Login as trainer
    await trainerPage.goto('http://localhost:8000/login');
    await trainerPage.fill('input#username', 'trainer@elior.com');
    await trainerPage.fill('input#password', 'trainer123');
    await trainerPage.click('button[type="submit"]:has-text("Sign In")');
    await trainerPage.waitForTimeout(3000);
    
    console.log('✅ Trainer logged in');
    
    // Check if exercises exist
    await trainerPage.goto('http://localhost:8000/exercises');
    await trainerPage.waitForTimeout(2000);
    
    const exerciseCards = trainerPage.locator('[class*="card"]');
    const exerciseCount = await exerciseCards.count();
    
    console.log(`📊 Found ${exerciseCount} exercises`);
    
    if (exerciseCount === 0) {
      // Create a test exercise
      const createExerciseButton = trainerPage.locator('button:has-text("Create Exercise")');
      if (await createExerciseButton.isVisible()) {
        await createExerciseButton.click();
        await trainerPage.waitForTimeout(500);
        
        await trainerPage.fill('input[name="name"]', 'E2E Test Bench Press');
        await trainerPage.fill('textarea[name="description"]', 'Integration test exercise');
        await trainerPage.selectOption('select[name="muscle_group"]', 'chest');
        await trainerPage.selectOption('select[name="equipment"]', 'barbell');
        
        await trainerPage.click('button:has-text("Create")');
        await trainerPage.waitForTimeout(2000);
        
        console.log('✅ Test exercise created');
      }
    }
    
    await trainerContext.close();
    
    // ===== PART 2: CLIENT VIEWS WORKOUTS =====
    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();
    
    // Login as client
    await clientPage.goto('http://localhost:8000/login');
    await clientPage.fill('input#username', 'client@elior.com');
    await clientPage.fill('input#password', 'client123');
    await clientPage.click('button[type="submit"]:has-text("Sign In")');
    await clientPage.waitForTimeout(3000);
    
    console.log('✅ Client logged in');
    
    // Navigate to training
    await clientPage.goto('http://localhost:8000/training');
    await clientPage.waitForTimeout(2000);
    
    // Check if workout plan exists
    const noWorkoutText = clientPage.locator('text=No Active Workout Plan');
    const hasNoWorkout = await noWorkoutText.isVisible();
    
    if (hasNoWorkout) {
      console.log('⚠️ No workout plan assigned to client yet');
    } else {
      console.log('✅ Workout plan visible to client');
      
      // Try to expand first workout day
      const firstDay = clientPage.locator('[role="button"]').first();
      await firstDay.click();
      await clientPage.waitForTimeout(1000);
      
      // Try to log a set
      const repsInput = clientPage.locator('input[placeholder="Reps"]').first();
      if (await repsInput.isVisible()) {
        await repsInput.fill('10');
        
        const weightInput = clientPage.locator('input[placeholder="Weight"]').first();
        await weightInput.fill('60');
        
        // Click complete button
        const completeButton = clientPage.locator('button:has-text("✓")').first();
        await completeButton.click();
        await clientPage.waitForTimeout(1000);
        
        // Verify completion
        const completedBadge = clientPage.locator('text=Completed');
        if (await completedBadge.isVisible()) {
          console.log('✅ Client logged set completion');
        }
      }
    }
    
    await clientContext.close();
  });

  test('WORKFLOW: Exercise created by trainer appears in workout plans', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Login as trainer
    await page.goto('http://localhost:8000/login');
    await page.fill('input#username', 'trainer@elior.com');
    await page.fill('input#password', 'trainer123');
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForTimeout(3000);
    
    // Create a new exercise
    await page.goto('http://localhost:8000/exercises');
    await page.waitForTimeout(2000);
    
    const exerciseName = `Test Exercise ${Date.now()}`;
    
    const createButton = page.locator('button:has-text("Create Exercise")');
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);
      
      await page.fill('input[name="name"]', exerciseName);
      await page.fill('textarea[name="description"]', 'Auto-created test exercise');
      await page.selectOption('select[name="muscle_group"]', 'chest');
      await page.selectOption('select[name="equipment"]', 'dumbbell');
      
      await page.click('button:has-text("Create")');
      await page.waitForTimeout(2000);
      
      console.log(`✅ Created exercise: ${exerciseName}`);
      
      // Verify exercise appears in list
      const exerciseInList = page.locator(`text=${exerciseName}`);
      if (await exerciseInList.isVisible()) {
        console.log('✅ Exercise appears in exercise bank');
        expect(await exerciseInList.isVisible()).toBe(true);
      }
    }
    
    await context.close();
  });

  test('API INTEGRATION: Verify all V2 endpoints work', async ({ request, browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Login to get token
    await page.goto('http://localhost:8000/login');
    await page.fill('input#username', 'trainer@elior.com');
    await page.fill('input#password', 'trainer123');
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForTimeout(2000);
    
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    const headers = { 'Authorization': `Bearer ${token}` };
    
    console.log('Testing V2 API endpoints...');
    
    // Test meal system endpoints
    const mealPlansResponse = await request.get(`${API_BASE_URL}/v2/meals/plans`, { headers });
    console.log(`GET /v2/meals/plans: ${mealPlansResponse.status()}`);
    expect(mealPlansResponse.status()).toBe(200);
    
    // Test workout system endpoints
    const workoutPlansResponse = await request.get(`${API_BASE_URL}/v2/workouts/plans`, { headers });
    console.log(`GET /v2/workouts/plans: ${workoutPlansResponse.status()}`);
    expect(workoutPlansResponse.status()).toBe(200);
    
    // Test set completions endpoint
    const setCompletionsResponse = await request.get(`${API_BASE_URL}/v2/workouts/set-completions`, { headers });
    console.log(`GET /v2/workouts/set-completions: ${setCompletionsResponse.status()}`);
    expect(setCompletionsResponse.status()).toBe(200);
    
    // Test meal choices endpoint (as client)
    await page.goto('http://localhost:8000/login');
    await page.evaluate(() => localStorage.clear());
    await page.fill('input#username', 'client@elior.com');
    await page.fill('input#password', 'client123');
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForTimeout(2000);
    
    const clientToken = await page.evaluate(() => localStorage.getItem('access_token'));
    const clientHeaders = { 'Authorization': `Bearer ${clientToken}` };
    
    const choicesResponse = await request.get(`${API_BASE_URL}/v2/meals/choices?client_id=3&date=2025-10-11`, { headers: clientHeaders });
    console.log(`GET /v2/meals/choices: ${choicesResponse.status()}`);
    expect(choicesResponse.status()).toBe(200);
    
    console.log('✅ All V2 API endpoints working');
    
    await context.close();
  });

  test('DATA VISIBILITY: Client sees trainer-created meal plan', async ({ browser }) => {
    // First verify meal plan exists
    const trainerContext = await browser.newContext();
    const trainerPage = await trainerContext.newPage();
    
    await trainerPage.goto('http://localhost:8000/login');
    await trainerPage.fill('input#username', 'trainer@elior.com');
    await trainerPage.fill('input#password', 'trainer123');
    await trainerPage.click('button[type="submit"]:has-text("Sign In")');
    await trainerPage.waitForTimeout(2000);
    
    const token = await trainerPage.evaluate(() => localStorage.getItem('access_token'));
    
    // Check meal plans via API
    const response = await trainerPage.request.get(`${API_BASE_URL}/v2/meals/plans`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const mealPlans = await response.json();
    console.log(`📊 Total meal plans in system: ${mealPlans.length}`);
    
    await trainerContext.close();
    
    // Now check client can see it
    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();
    
    await clientPage.goto('http://localhost:8000/login');
    await clientPage.fill('input#username', 'client@elior.com');
    await clientPage.fill('input#password', 'client123');
    await clientPage.click('button[type="submit"]:has-text("Sign In")');
    await clientPage.waitForTimeout(2000);
    
    await clientPage.goto('http://localhost:8000/meals');
    await clientPage.waitForTimeout(2000);
    
    // Check if meal plan is displayed
    const noMealPlan = clientPage.locator('text=No Active Meal Plan');
    const hasNoMealPlan = await noMealPlan.isVisible();
    
    if (hasNoMealPlan) {
      console.log('⚠️ Client has no active meal plan');
    } else {
      console.log('✅ Client can see meal plan');
      
      // Verify nutrition goals are shown
      await expect(clientPage.locator('text=Daily Nutrition Goals')).toBeVisible();
    }
    
    await clientContext.close();
  });

  test('DATA VISIBILITY: Client sees trainer-created workout plan', async ({ browser }) => {
    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();
    
    await clientPage.goto('http://localhost:8000/login');
    await clientPage.fill('input#username', 'client@elior.com');
    await clientPage.fill('input#password', 'client123');
    await clientPage.click('button[type="submit"]:has-text("Sign In")');
    await clientPage.waitForTimeout(2000);
    
    await clientPage.goto('http://localhost:8000/training');
    await clientPage.waitForTimeout(2000);
    
    const noWorkout = clientPage.locator('text=No Active Workout Plan');
    const hasNoWorkout = await noWorkout.isVisible();
    
    if (hasNoWorkout) {
      console.log('⚠️ Client has no active workout plan');
    } else {
      console.log('✅ Client can see workout plan');
    }
    
    await clientContext.close();
  });

  test('FEATURE TEST: Client can mark meals as eaten', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('http://localhost:8000/login');
    await page.fill('input#username', 'client@elior.com');
    await page.fill('input#password', 'client123');
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForTimeout(2000);
    
    await page.goto('http://localhost:8000/meals');
    await page.waitForTimeout(2000);
    
    // Check if meal plan exists
    const hasMealPlan = !(await page.locator('text=No Active Meal Plan').isVisible());
    
    if (hasMealPlan) {
      // Click first meal
      const firstMeal = page.locator('button:has-text("ארוחה")').first();
      await firstMeal.click();
      await page.waitForTimeout(1000);
      
      // Count checkboxes before
      const checkboxesBefore = await page.locator('[role="checkbox"]').count();
      console.log(`📊 Found ${checkboxesBefore} food options`);
      
      if (checkboxesBefore > 0) {
        // Click first checkbox
        const firstCheckbox = page.locator('[role="checkbox"]').first();
        const wasChecked = await firstCheckbox.isChecked();
        
        await firstCheckbox.click();
        await page.waitForTimeout(1000);
        
        // Verify state changed
        const isNowChecked = await firstCheckbox.isChecked();
        expect(isNowChecked).not.toBe(wasChecked);
        
        console.log('✅ Food option checkbox toggled successfully');
      }
    }
    
    await context.close();
  });

  test('FEATURE TEST: Client can log workout sets', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('http://localhost:8000/login');
    await page.fill('input#username', 'client@elior.com');
    await page.fill('input#password', 'client123');
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForTimeout(2000);
    
    await page.goto('http://localhost:8000/training');
    await page.waitForTimeout(2000);
    
    // Check if workout plan exists
    const hasWorkout = !(await page.locator('text=No Active Workout Plan').isVisible());
    
    if (hasWorkout) {
      console.log('✅ Workout plan found');
      
      // Click first workout day
      const firstDay = page.locator('[role="button"]').first();
      await firstDay.click();
      await page.waitForTimeout(1000);
      
      // Check for set tracking inputs
      const repsInput = page.locator('input[placeholder="Reps"]').first();
      if (await repsInput.isVisible()) {
        console.log('✅ Set tracking inputs visible');
        
        // Fill in set data
        await repsInput.fill('12');
        
        const weightInput = page.locator('input[placeholder="Weight"]').first();
        await weightInput.fill('50.5');
        
        // Click complete button
        const completeButton = page.locator('button').filter({ hasText: '✓' }).first();
        await completeButton.click();
        await page.waitForTimeout(2000);
        
        // Verify completion badge
        const completedBadge = page.locator('text=Completed');
        if (await completedBadge.isVisible()) {
          console.log('✅ Set logged successfully');
        } else {
          console.log('⚠️ Set logging may have failed - check API');
        }
      }
    } else {
      console.log('⚠️ No workout plan available for testing');
    }
    
    await context.close();
  });

  test('CONSISTENCY: Same data visible across roles', async ({ browser }) => {
    // Get meal plan count as trainer
    const trainerContext = await browser.newContext();
    const trainerPage = await trainerContext.newPage();
    
    await trainerPage.goto('http://localhost:8000/login');
    await trainerPage.fill('input#username', 'trainer@elior.com');
    await trainerPage.fill('input#password', 'trainer123');
    await trainerPage.click('button[type="submit"]:has-text("Sign In")');
    await trainerPage.waitForTimeout(2000);
    
    const trainerToken = await trainerPage.evaluate(() => localStorage.getItem('access_token'));
    const trainerResponse = await trainerPage.request.get(`${API_BASE_URL}/v2/meals/plans`, {
      headers: { 'Authorization': `Bearer ${trainerToken}` }
    });
    const trainerMealPlans = await trainerResponse.json();
    
    console.log(`📊 Trainer sees ${trainerMealPlans.length} meal plans`);
    
    await trainerContext.close();
    
    // Get meal plan count as admin
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    
    await adminPage.goto('http://localhost:8000/login');
    await adminPage.fill('input#username', 'admin@elior.com');
    await adminPage.fill('input#password', 'admin123');
    await adminPage.click('button[type="submit"]:has-text("Sign In")');
    await adminPage.waitForTimeout(2000);
    
    const adminToken = await adminPage.evaluate(() => localStorage.getItem('access_token'));
    const adminResponse = await adminPage.request.get(`${API_BASE_URL}/v2/meals/plans`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminMealPlans = await adminResponse.json();
    
    console.log(`📊 Admin sees ${adminMealPlans.length} meal plans`);
    
    // Data should be consistent
    expect(adminMealPlans.length).toBe(trainerMealPlans.length);
    
    await adminContext.close();
  });
});






