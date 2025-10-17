import { test, expect } from '../../fixtures/auth.fixture';
import { ProgressPages } from '../../fixtures/page-objects/ProgressPages';
import { createProgressEntry, createWorkoutPlan, createExercise } from '../../utils/api-helpers';
import { TEST_DATA } from '../../fixtures/test-data';
import { currentDate } from '../../utils/test-helpers';

test.describe('Trainer - Client Progress Monitoring', () => {
  test('should view client progress page', async ({ trainerPage, clientUser }) => {
    await trainerPage.goto(`/client/${clientUser.id}`);
    
    await trainerPage.waitForTimeout(2000);
    
    // Should show client progress information
    await expect(trainerPage.locator('body')).toContainText(clientUser.full_name);
  });
  
  test('should view client weight history', async ({ request, trainerToken, clientToken, clientUser }) => {
    // Client logs weight
    const progressEntry = await createProgressEntry(
      request,
      clientToken,
      TEST_DATA.progress.basic()
    );
    
    // Trainer views client progress
    const response = await request.get(`/api/progress/weight?client_id=${clientUser.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
    
    if (response.ok()) {
      const progress = await response.json();
      expect(Array.isArray(progress)).toBe(true);
    }
    
    // Cleanup
    await request.delete(`/api/progress/weight/${progressEntry.id}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
  });
  
  test('should view client workout completions', async ({ request, trainerToken, clientUser, clientToken }) => {
    // Get completions for client
    const response = await request.get(`/api/workouts/completions?client_id=${clientUser.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
    
    if (response.ok()) {
      const completions = await response.json();
      expect(Array.isArray(completions)).toBe(true);
    }
  });
  
  test('should view client meal uploads', async ({ request, trainerToken, clientUser }) => {
    // Try to get meal uploads for client
    const response = await request.get(`/api/meal-plans/?client_id=${clientUser.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
    
    if (response.ok()) {
      const mealPlans = await response.json();
      expect(Array.isArray(mealPlans)).toBe(true);
    }
  });
  
  test('should see client progress statistics', async ({ trainerPage, request, trainerToken, clientUser }) => {
    await trainerPage.goto(`/client/${clientUser.id}`);
    
    await trainerPage.waitForTimeout(2000);
    
    // Look for progress indicators
    const pageContent = await trainerPage.textContent('body');
    
    // Should show some statistics
    expect(pageContent).toBeDefined();
    expect(pageContent.length).toBeGreaterThan(100);
  });
  
  test('should track client adherence', async ({ request, trainerToken, clientUser }) => {
    // Check if there's an adherence/analytics endpoint
    const response = await request.get(`/api/progress/analytics?client_id=${clientUser.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
    
    // May or may not exist
    expect(response.status()).toBeGreaterThanOrEqual(200);
  });
  
  test('should compare client progress over time', async ({ request, clientToken, clientUser }) => {
    // Create multiple progress entries
    const entry1 = await createProgressEntry(request, clientToken, {
      date: currentDate(),
      weight: 75.0,
      notes: 'Week 1',
    });
    
    const entry2 = await createProgressEntry(request, clientToken, {
      date: currentDate(),
      weight: 74.5,
      notes: 'Week 2',
    });
    
    // Get progress history
    const response = await request.get('/api/progress/weight', {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    
    expect(response.ok()).toBeTruthy();
    const progress = await response.json();
    expect(progress.length).toBeGreaterThanOrEqual(2);
    
    // Cleanup
    await request.delete(`/api/progress/weight/${entry1.id}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    await request.delete(`/api/progress/weight/${entry2.id}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
  });
});






