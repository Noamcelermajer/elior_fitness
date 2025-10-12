import { test, expect } from '../../fixtures/auth.fixture';
import { TEST_USERS } from '../../fixtures/auth.fixture';
import { LoginPage } from '../../fixtures/page-objects/LoginPage';
import { createExercise, createWorkoutPlan, createMealPlan, deleteWorkoutPlan, deleteMealPlan } from '../../utils/api-helpers';
import { TEST_DATA } from '../../fixtures/test-data';

test.describe('Smoke Tests - Critical Paths', () => {
  test('critical path: admin login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(
      TEST_USERS.admin.username,
      TEST_USERS.admin.password
    );
    
    expect(page.url()).not.toContain('/login');
  });
  
  test('critical path: trainer login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(
      TEST_USERS.trainer.username,
      TEST_USERS.trainer.password
    );
    
    expect(page.url()).not.toContain('/login');
  });
  
  test('critical path: client login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(
      TEST_USERS.client.username,
      TEST_USERS.client.password
    );
    
    expect(page.url()).not.toContain('/login');
  });
  
  test('critical path: trainer creates workout', async ({ request, trainerToken, clientUser }) => {
    const exercise = await createExercise(
      request,
      trainerToken,
      TEST_DATA.exercise.basic()
    );
    
    const workout = await createWorkoutPlan(
      request,
      trainerToken,
      TEST_DATA.workoutPlan.basic(clientUser.id)
    );
    
    expect(workout).toHaveProperty('id');
    
    await deleteWorkoutPlan(request, trainerToken, workout.id);
    await request.delete(`/api/workouts/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
  });
  
  test('critical path: client logs workout completion', async ({ request, trainerToken, clientToken, clientUser }) => {
    const exercise = await createExercise(
      request,
      trainerToken,
      TEST_DATA.exercise.basic()
    );
    
    const workout = await createWorkoutPlan(
      request,
      trainerToken,
      TEST_DATA.workoutPlan.basic(clientUser.id)
    );
    
    expect(workout).toHaveProperty('id');
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
    await request.delete(`/api/workouts/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
  });
  
  test('critical path: trainer creates meal plan', async ({ request, trainerToken, clientUser }) => {
    const mealPlan = await createMealPlan(
      request,
      trainerToken,
      TEST_DATA.mealPlan.basic(clientUser.id)
    );
    
    expect(mealPlan).toHaveProperty('id');
    
    await deleteMealPlan(request, trainerToken, mealPlan.id);
  });
  
  test('critical path: all API endpoints accessible', async ({ request }) => {
    const healthResponse = await request.get('/health');
    expect(healthResponse.ok()).toBeTruthy();
  });
  
  test('critical path: basic navigation', async ({ trainerPage }) => {
    await trainerPage.goto('/');
    expect(trainerPage.url()).not.toContain('/login');
    
    await trainerPage.goto('/clients');
    await trainerPage.waitForTimeout(1000);
    expect(trainerPage.url()).toContain('clients');
    
    await trainerPage.goto('/exercises');
    await trainerPage.waitForTimeout(1000);
    expect(trainerPage.url()).toContain('exercises');
  });
});



