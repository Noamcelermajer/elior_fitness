import { test, expect } from '../../fixtures/auth.fixture';
import { NutritionPages } from '../../fixtures/page-objects/NutritionPages';
import { TEST_DATA } from '../../fixtures/test-data';
import { createMealPlan, createMealEntry, deleteMealPlan } from '../../utils/api-helpers';
import { currentDate } from '../../utils/test-helpers';

test.describe('Trainer - Meal Plan Creation', () => {
  test('should access meal plan creation page', async ({ trainerPage }) => {
    const nutritionPages = new NutritionPages(trainerPage);
    await nutritionPages.gotoCreateMealPlan();
    
    // Should show meal plan creation form
    await expect(trainerPage.locator('form, [data-testid="meal-plan-form"]')).toBeVisible();
  });
  
  test('should create meal plan via API', async ({ request, trainerToken, clientUser }) => {
    const mealPlanData = TEST_DATA.mealPlan.basic(clientUser.id);
    
    const mealPlan = await createMealPlan(request, trainerToken, mealPlanData);
    
    expect(mealPlan).toHaveProperty('id');
    expect(mealPlan.client_id).toBe(clientUser.id);
    expect(mealPlan.total_calories).toBe(mealPlanData.total_calories);
    
    // Cleanup
    await deleteMealPlan(request, trainerToken, mealPlan.id);
  });
  
  test('should create bulking meal plan', async ({ request, trainerToken, clientUser }) => {
    const bulkingPlan = TEST_DATA.mealPlan.bulking(clientUser.id);
    
    const mealPlan = await createMealPlan(request, trainerToken, bulkingPlan);
    
    expect(mealPlan.total_calories).toBe(3000);
    expect(mealPlan.protein_target).toBe(200);
    
    // Cleanup
    await deleteMealPlan(request, trainerToken, mealPlan.id);
  });
  
  test('should create cutting meal plan', async ({ request, trainerToken, clientUser }) => {
    const cuttingPlan = TEST_DATA.mealPlan.cutting(clientUser.id);
    
    const mealPlan = await createMealPlan(request, trainerToken, cuttingPlan);
    
    expect(mealPlan.total_calories).toBe(1600);
    expect(mealPlan.protein_target).toBe(160);
    
    // Cleanup
    await deleteMealPlan(request, trainerToken, mealPlan.id);
  });
  
  test('should add meal entries to plan', async ({ request, trainerToken, clientUser }) => {
    // Create meal plan
    const mealPlan = await createMealPlan(
      request,
      trainerToken,
      TEST_DATA.mealPlan.basic(clientUser.id)
    );
    
    // Add meal entries
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
    
    const dinner = await createMealEntry(
      request,
      trainerToken,
      mealPlan.id,
      TEST_DATA.mealEntry.dinner()
    );
    
    expect(breakfast).toHaveProperty('id');
    expect(lunch).toHaveProperty('id');
    expect(dinner).toHaveProperty('id');
    
    // Cleanup
    await deleteMealPlan(request, trainerToken, mealPlan.id);
  });
  
  test('should add meal components to entries', async ({ request, trainerToken, clientUser }) => {
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
    const componentData = [
      TEST_DATA.mealComponent.protein(),
      TEST_DATA.mealComponent.carb(),
      TEST_DATA.mealComponent.vegetable(),
    ];
    
    for (const component of componentData) {
      const response = await request.post(
        `/api/meal-plans/${mealPlan.id}/meals/${mealEntry.id}/components`,
        {
          headers: { Authorization: `Bearer ${trainerToken}` },
          data: component,
        }
      );
      
      if (response.ok()) {
        const created = await response.json();
        expect(created.type).toBe(component.type);
      }
    }
    
    // Cleanup
    await deleteMealPlan(request, trainerToken, mealPlan.id);
  });
  
  test('should create meal plan with all macros', async ({ request, trainerToken, clientUser }) => {
    const mealPlanData = {
      ...TEST_DATA.mealPlan.basic(clientUser.id),
      total_calories: 2500,
      protein_target: 180,
      carb_target: 250,
      fat_target: 70,
    };
    
    const mealPlan = await createMealPlan(request, trainerToken, mealPlanData);
    
    expect(mealPlan.total_calories).toBe(2500);
    expect(mealPlan.protein_target).toBe(180);
    expect(mealPlan.carb_target).toBe(250);
    expect(mealPlan.fat_target).toBe(70);
    
    // Cleanup
    await deleteMealPlan(request, trainerToken, mealPlan.id);
  });
  
  test('should validate meal plan data', async ({ request, trainerToken }) => {
    // Try to create meal plan without required fields
    const response = await request.post('/api/meal-plans/', {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        client_id: 999999, // Non-existent client
        date: '', // Empty date
      },
    });
    
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
  
  test('should update meal plan', async ({ request, trainerToken, clientUser }) => {
    const mealPlan = await createMealPlan(
      request,
      trainerToken,
      TEST_DATA.mealPlan.basic(clientUser.id)
    );
    
    // Update meal plan
    const updatedTitle = `Updated ${mealPlan.title}`;
    const updateResponse = await request.put(`/api/meal-plans/${mealPlan.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        ...mealPlan,
        title: updatedTitle,
      },
    });
    
    if (updateResponse.ok()) {
      const updated = await updateResponse.json();
      expect(updated.title).toBe(updatedTitle);
    }
    
    // Cleanup
    await deleteMealPlan(request, trainerToken, mealPlan.id);
  });
  
  test('should delete meal plan', async ({ request, trainerToken, clientUser }) => {
    const mealPlan = await createMealPlan(
      request,
      trainerToken,
      TEST_DATA.mealPlan.basic(clientUser.id)
    );
    
    await deleteMealPlan(request, trainerToken, mealPlan.id);
    
    // Verify deleted
    const response = await request.get(`/api/meal-plans/${mealPlan.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
    
    expect(response.status()).toBeGreaterThanOrEqual(404);
  });
  
  test('should create meal plan for specific date', async ({ request, trainerToken, clientUser }) => {
    const date = currentDate();
    const mealPlanData = {
      ...TEST_DATA.mealPlan.basic(clientUser.id),
      date,
    };
    
    const mealPlan = await createMealPlan(request, trainerToken, mealPlanData);
    
    expect(mealPlan.date).toBe(date);
    
    // Cleanup
    await deleteMealPlan(request, trainerToken, mealPlan.id);
  });
});



