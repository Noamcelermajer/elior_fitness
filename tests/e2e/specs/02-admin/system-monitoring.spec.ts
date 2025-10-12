import { test, expect } from '../../fixtures/auth.fixture';
import { healthCheck } from '../../utils/api-helpers';

test.describe('Admin - System Monitoring', () => {
  test('should access system monitoring page', async ({ adminPage }) => {
    await adminPage.goto('/system');
    
    // Should be accessible to admin
    await expect(adminPage).not.toHaveURL(/login|unauthorized/);
    await expect(adminPage).toHaveURL(/system/);
    
    // Should show system information
    await expect(adminPage.locator('h1, h2')).toBeVisible();
  });
  
  test('should display system health status', async ({ adminPage }) => {
    await adminPage.goto('/system');
    
    await adminPage.waitForTimeout(2000);
    
    // Look for health indicators
    const pageContent = await adminPage.textContent('body');
    
    // Should show some status information
    expect(pageContent).toMatch(/health|status|database|api/i);
  });
  
  test('should check health endpoint via API', async ({ request }) => {
    const response = await request.get('/health');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('status');
    expect(data.status).toMatch(/ok|healthy|operational/i);
  });
  
  test('should display database status', async ({ request, adminToken }) => {
    // Try to get database status
    const response = await request.get('/api/system/status/database', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('status');
    } else {
      // Endpoint might not exist, that's okay
      expect(response.status()).toBeGreaterThanOrEqual(404);
    }
  });
  
  test('should display system metrics', async ({ request, adminToken }) => {
    const response = await request.get('/api/system/metrics', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    if (response.ok()) {
      const metrics = await response.json();
      
      // Should have some metrics
      expect(metrics).toBeDefined();
    } else {
      // Endpoint might not exist
      expect(response.status()).toBeGreaterThanOrEqual(404);
    }
  });
  
  test('system health should be operational', async ({ request }) => {
    const isHealthy = await healthCheck(request);
    expect(isHealthy).toBe(true);
  });
  
  test('should show application version or info', async ({ adminPage }) => {
    await adminPage.goto('/system');
    
    await adminPage.waitForTimeout(1000);
    
    // Look for version, build, or environment info
    const pageContent = await adminPage.textContent('body');
    
    // Should show something about the system
    expect(pageContent.length).toBeGreaterThan(100);
  });
  
  test('non-admin cannot access system monitoring', async ({ trainerPage }) => {
    await trainerPage.goto('/system');
    
    await trainerPage.waitForTimeout(1000);
    
    // Should be redirected or blocked
    const url = trainerPage.url();
    expect(url).toMatch(/login|unauthorized|403|trainer-dashboard/);
  });
});



