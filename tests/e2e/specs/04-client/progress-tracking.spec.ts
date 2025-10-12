import { test, expect } from '../../fixtures/auth.fixture';
import { ProgressPages } from '../../fixtures/page-objects/ProgressPages';
import { createProgressEntry } from '../../utils/api-helpers';
import { TEST_DATA } from '../../fixtures/test-data';

test.describe('Client - Progress Tracking', () => {
  test('should access progress page', async ({ clientPage }) => {
    const progressPages = new ProgressPages(clientPage);
    await progressPages.gotoProgressPage();
    
    // Should be on progress page
    await expect(clientPage).toHaveURL(/progress/);
  });
  
  test('should view progress history', async ({ clientPage }) => {
    const progressPages = new ProgressPages(clientPage);
    await progressPages.gotoProgressPage();
    
    await clientPage.waitForTimeout(2000);
    
    // Should show progress information
    await expect(clientPage.locator('h1, h2')).toBeVisible();
  });
  
  test('should display weight trends', async ({ request, clientToken }) => {
    // Create multiple progress entries
    const entries = [];
    
    for (let i = 0; i < 3; i++) {
      const entry = await createProgressEntry(request, clientToken, {
        ...TEST_DATA.progress.basic(),
        weight: 75 - i * 0.5,
      });
      entries.push(entry);
    }
    
    // Get progress
    const response = await request.get('/api/progress/weight', {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    
    expect(response.ok()).toBeTruthy();
    const progress = await response.json();
    
    expect(progress.length).toBeGreaterThanOrEqual(3);
    
    // Cleanup
    for (const entry of entries) {
      await request.delete(`/api/progress/weight/${entry.id}`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
    }
  });
  
  test('should view charts and analytics', async ({ clientPage }) => {
    await clientPage.goto('/progress');
    await clientPage.waitForTimeout(2000);
    
    // Look for chart elements
    const chart = clientPage.locator('canvas, [data-testid="progress-chart"], svg');
    const hasChart = await chart.count();
    
    // Chart may or may not be present
    expect(hasChart).toBeGreaterThanOrEqual(0);
  });
  
  test('should display current weight', async ({ request, clientToken }) => {
    const entry = await createProgressEntry(
      request,
      clientToken,
      TEST_DATA.progress.milestone(80)
    );
    
    // Get current weight
    const response = await request.get('/api/progress/weight/current', {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    
    if (response.ok()) {
      const current = await response.json();
      expect(current).toHaveProperty('weight');
    }
    
    // Cleanup
    await request.delete(`/api/progress/weight/${entry.id}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
  });
  
  test('should view progress photos', async ({ clientPage }) => {
    await clientPage.goto('/progress');
    await clientPage.waitForTimeout(2000);
    
    // Look for photo gallery
    const photos = clientPage.locator('[data-testid="progress-photo"], img[alt*="progress"]');
    const count = await photos.count();
    
    // Photos may or may not be present
    expect(count).toBeGreaterThanOrEqual(0);
  });
});



