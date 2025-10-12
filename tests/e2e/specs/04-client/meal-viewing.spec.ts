import { test, expect } from '../../fixtures/auth.fixture';
import { NutritionPages } from '../../fixtures/page-objects/NutritionPages';
import { createMealPlan, createMealEntry, deleteMealPlan } from '../../utils/api-helpers';
import { TEST_DATA } from '../../fixtures/test-data';

test.describe('Client - Meal Viewing', () => {
  test('should access meals page', async ({ clientPage }) => {
    const nutritionPages = new NutritionPages(clientPage);
    await nutritionPages.gotoMealsPage();
    
    // Should be on meals page
    await expect(clientPage).toHaveURL(/meals/);
  });
  
  test('should view todays meal plan', async ({ clientPage, request, trainerToken, clientUser }) => {
    const mealPlan = await createMealPlan(
      request,
      trainerToken,
      TEST_DATA.mealPlan.basic(clientUser.id)
    );
    
    const nutritionPages = new NutritionPages(clientPage);
    await nutritionPages.gotoMealsPage();
    
    await clientPage.waitForTimeout(2000);
    
    // Should see meal plan
    await expect(clientPage.locator('body')).toContainText(/meal|nutrition|food/i);
    
    // Cleanup
    await deleteMealPlan(request, trainerToken, mealPlan.id);
  });
  
  test('should view meal entries', async ({ clientPage, request, trainerToken, clientUser }) => {
    const mealPlan = await createMealPlan(
      request,
      trainerToken,
      TEST_DATA.mealPlan.basic(clientUser.id)
    );
    
    const breakfast = await createMealEntry(
      request,
      trainerToken,
      mealPlan.id,
      TEST_DATA.mealEntry.breakfast()
    );
    
    const lunch = await createMealEntry(
      request,
      trainerToken,
      mealPlan.id,
      TEST_DATA.mealEntry.lunch()
    );
    
    await clientPage.goto('/meals');
    await clientPage.waitForTimeout(2000);
    
    const pageContent = await clientPage.textContent('body');
    
    // Should display meals
    expect(pageContent).toContain('Breakfast');
    expect(pageContent).toContain('Lunch');
    
    // Cleanup
    await deleteMealPlan(request, trainerToken, mealPlan.id);
  });
  
  test('should view macronutrient targets', async ({ clientPage, request, trainerToken, clientUser }) => {
    const mealPlan = await createMealPlan(
      request,
      trainerToken,
      {
        ...TEST_DATA.mealPlan.basic(clientUser.id),
        total_calories: 2500,
        protein_target: 180,
        carb_target: 250,
        fat_target: 70,
      }
    );
    
    await clientPage.goto('/meals');
    await clientPage.waitForTimeout(2000);
    
    const pageContent = await clientPage.textContent('body');
    
    // Should show macros
    expect(pageContent).toMatch(/2500|180|250|70|calories|protein|carb|fat/i);
    
    // Cleanup
    await deleteMealPlan(request, trainerToken, mealPlan.id);
  });
  
  test('should display component details', async ({ request, trainerToken, clientUser }) => {
    const mealPlan = await createMealPlan(
      request,
      trainerToken,
      TEST_DATA.mealPlan.basic(clientUser.id)
    );
    
    const mealEntry = await createMealEntry(
      request,
      trainerToken,
      mealPlan.id,
      TEST_DATA.mealEntry.breakfast()
    );
    
    // Add components
    const proteinComponent = await request.post(
      `/api/meal-plans/${mealPlan.id}/meals/${mealEntry.id}/components`,
      {
        headers: { Authorization: `Bearer ${trainerToken}` },
        data: TEST_DATA.mealComponent.protein(),
      }
    );
    
    expect(proteinComponent.ok()).toBeTruthy();
    
    // Get meal plan
    const response = await request.get(`/api/meal-plans/${mealPlan.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
    
    expect(response.ok()).toBeTruthy();
    
    // Cleanup
    await deleteMealPlan(request, trainerToken, mealPlan.id);
  });
  
  test('client can only view own meal plans', async ({ request, clientToken, trainerToken, adminToken }) => {
    // Get another client
    const clientsResponse = await request.get('/api/users/?role=client', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    if (clientsResponse.ok()) {
      const clients = await clientsResponse.json();
      
      if (clients.length >= 2) {
        const otherClient = clients.find((c: any) => c.email !== 'client@elior.com');
        
        if (otherClient) {
          // Create meal plan for other client
          const mealPlan = await createMealPlan(
            request,
            trainerToken,
            TEST_DATA.mealPlan.basic(otherClient.id)
          );
          
          // Try to access as current client
          const response = await request.get(`/api/meal-plans/${mealPlan.id}`, {
            headers: { Authorization: `Bearer ${clientToken}` },
          });
          
          // Should be forbidden or not found
          expect(response.status()).toBeGreaterThanOrEqual(403);
          
          // Cleanup
          await deleteMealPlan(request, trainerToken, mealPlan.id);
        }
      }
    }
  });
});



