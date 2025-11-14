import { test, expect } from '../../fixtures/auth.fixture';
import { screenshotLoginPage, screenshotDashboard, prepareForScreenshot } from '../../utils/visual-regression';

test.describe('Visual Regression - UI Components', () => {
  test('login page visual', async ({ page }) => {
    await page.goto('/login');
    await screenshotLoginPage(page);
  });
  
  test('admin dashboard visual', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await screenshotDashboard(adminPage, 'admin');
  });
  
  test('trainer dashboard visual', async ({ trainerPage }) => {
    await trainerPage.goto('/trainer-dashboard');
    await screenshotDashboard(trainerPage, 'trainer');
  });
  
  test('client dashboard visual', async ({ clientPage }) => {
    await clientPage.goto('/');
    await screenshotDashboard(clientPage, 'client');
  });
  
  test('exercise bank visual', async ({ trainerPage }) => {
    await trainerPage.goto('/exercises');
    await prepareForScreenshot(trainerPage);
    
    await expect(trainerPage).toHaveScreenshot('exercise-bank.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
  
  test('workout creation form visual', async ({ trainerPage }) => {
    await trainerPage.goto('/create-workout');
    await prepareForScreenshot(trainerPage);
    
    const form = trainerPage.locator('form, [data-testid="workout-form"]');
    if (await form.isVisible({ timeout: 2000 })) {
      await expect(form).toHaveScreenshot('workout-form.png', {
        maxDiffPixels: 50,
      });
    }
  });
  
  test('meal plan creation form visual', async ({ trainerPage }) => {
    await trainerPage.goto('/create-meal-plan');
    await prepareForScreenshot(trainerPage);
    
    const form = trainerPage.locator('form, [data-testid="meal-plan-form"]');
    if (await form.isVisible({ timeout: 2000 })) {
      await expect(form).toHaveScreenshot('meal-plan-form.png', {
        maxDiffPixels: 50,
      });
    }
  });
  
  test('training page visual', async ({ clientPage }) => {
    await clientPage.goto('/training');
    await prepareForScreenshot(clientPage);
    
    await expect(clientPage).toHaveScreenshot('training-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
  
  test('meals page visual', async ({ clientPage }) => {
    await clientPage.goto('/meals');
    await prepareForScreenshot(clientPage);
    
    await expect(clientPage).toHaveScreenshot('meals-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
  
  test('progress page visual', async ({ clientPage }) => {
    await clientPage.goto('/progress');
    await prepareForScreenshot(clientPage);
    
    await expect(clientPage).toHaveScreenshot('progress-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});






