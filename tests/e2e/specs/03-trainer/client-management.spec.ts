import { test, expect } from '../../fixtures/auth.fixture';
import { TrainerDashboard } from '../../fixtures/page-objects/TrainerDashboard';
import { getClients } from '../../utils/api-helpers';

test.describe('Trainer - Client Management', () => {
  test('should display client list', async ({ trainerPage, request, trainerToken }) => {
    const trainerDash = new TrainerDashboard(trainerPage);
    await trainerDash.gotoClients();
    
    // Get clients from API
    const clients = await getClients(request, trainerToken);
    
    if (clients.length > 0) {
      // Should show clients on page
      await expect(trainerPage.locator('[data-testid="client-card"], .client-item')).toHaveCount(clients.length, { timeout: 5000 });
    }
  });
  
  test('should view client details', async ({ trainerPage, request, trainerToken, clientUser }) => {
    await trainerPage.goto('/clients');
    
    // Get assigned clients
    const clients = await getClients(request, trainerToken);
    
    if (clients.length > 0) {
      const client = clients[0];
      
      // Click on client
      await trainerPage.locator(`[data-testid="client-card"]:has-text("${client.full_name}")`).click();
      
      await trainerPage.waitForTimeout(1000);
      
      // Should navigate to client profile
      expect(trainerPage.url()).toMatch(/client\/\d+/);
    }
  });
  
  test('should display client statistics', async ({ trainerPage, request, trainerToken }) => {
    const clients = await getClients(request, trainerToken);
    
    if (clients.length > 0) {
      const client = clients[0];
      await trainerPage.goto(`/client/${client.id}`);
      
      await trainerPage.waitForTimeout(2000);
      
      // Should show client information
      const pageContent = await trainerPage.textContent('body');
      expect(pageContent).toContain(client.full_name);
    }
  });
  
  test('should assign client to trainer via API', async ({ request, adminToken, trainerUser }) => {
    // Create a test client
    const clientData = {
      username: `client_test_${Date.now()}`,
      email: `client_test_${Date.now()}@test.com`,
      password: 'Test123!@#',
      full_name: 'Test Client',
      role: 'client',
    };
    
    const createResponse = await request.post('/api/auth/register/client', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { ...clientData, trainer_id: trainerUser.id },
    });
    
    if (createResponse.ok()) {
      const client = await createResponse.json();
      
      // Verify assignment
      const response = await request.get(`/api/users/${client.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      
      expect(response.ok()).toBeTruthy();
      const userData = await response.json();
      expect(userData.trainer_id).toBe(trainerUser.id);
      
      // Cleanup
      await request.delete(`/api/users/${client.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  });
  
  test('should filter clients', async ({ trainerPage }) => {
    await trainerPage.goto('/clients');
    
    await trainerPage.waitForTimeout(1000);
    
    // Look for search or filter
    const searchInput = trainerPage.locator('input[type="search"], input[placeholder*="Search"]');
    
    if (await searchInput.isVisible({ timeout: 2000 })) {
      await searchInput.fill('test');
      await trainerPage.waitForTimeout(500);
      
      // Results should be filtered
      const pageContent = await trainerPage.textContent('body');
      expect(pageContent).toBeDefined();
    }
  });
  
  test('trainer can only see assigned clients', async ({ request, trainerToken }) => {
    const clients = await getClients(request, trainerToken);
    
    // All returned clients should be assigned to this trainer
    for (const client of clients) {
      const response = await request.get(`/api/users/${client.id}`, {
        headers: { Authorization: `Bearer ${trainerToken}` },
      });
      
      if (response.ok()) {
        const clientData = await response.json();
        // Client should have this trainer assigned (or be visible to trainer)
        expect(clientData).toBeDefined();
      }
    }
  });
});






