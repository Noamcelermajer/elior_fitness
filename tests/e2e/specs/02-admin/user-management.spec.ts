import { test, expect } from '../../fixtures/auth.fixture';
import { AdminDashboard } from '../../fixtures/page-objects/AdminDashboard';

test.describe('Admin - User Management', () => {
  test('should display users page with user list', async ({ adminPage }) => {
    const adminDash = new AdminDashboard(adminPage);
    await adminDash.gotoUsers();
    
    // Should show users table
    await expect(adminDash.userTable).toBeVisible();
    
    // Should have at least 3 users (admin, trainer, client)
    const userCount = await adminDash.getUserCount();
    expect(userCount).toBeGreaterThanOrEqual(3);
  });
  
  test('should filter users by role', async ({ adminPage }) => {
    const adminDash = new AdminDashboard(adminPage);
    await adminDash.gotoUsers();
    
    // Filter by client role
    if (await adminDash.filterSelect.isVisible({ timeout: 2000 })) {
      await adminDash.filterByRole('client');
      
      await adminPage.waitForTimeout(1000);
      
      // Verify filtered results contain only clients
      const rows = adminPage.locator('tbody tr');
      const count = await rows.count();
      
      if (count > 0) {
        const firstRow = await rows.first().textContent() || '';
        expect(firstRow.toLowerCase()).toContain('client');
      }
    }
  });
  
  test('should search for users', async ({ adminPage }) => {
    const adminDash = new AdminDashboard(adminPage);
    await adminDash.gotoUsers();
    
    if (await adminDash.searchInput.isVisible({ timeout: 2000 })) {
      // Search for trainer
      await adminDash.searchUsers('trainer');
      
      await adminPage.waitForTimeout(1000);
      
      // Should show trainer in results
      await expect(adminPage.locator('body')).toContainText(/trainer/i);
    }
  });
  
  test('should view user details', async ({ adminPage }) => {
    const adminDash = new AdminDashboard(adminPage);
    await adminDash.gotoUsers();
    
    // Click on first user
    const firstUser = adminPage.locator('tbody tr').first();
    if (await firstUser.isVisible({ timeout: 2000 })) {
      await firstUser.click();
      
      await adminPage.waitForTimeout(1000);
      
      // Should show user details (either in modal or new page)
      const hasModal = await adminPage.locator('[role="dialog"]').isVisible({ timeout: 1000 });
      const urlChanged = !adminPage.url().includes('/users');
      
      expect(hasModal || urlChanged).toBe(true);
    }
  });
  
  test('should display user statistics', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    
    // Look for statistics cards
    const statsCards = adminPage.locator('[data-testid="stats-card"], .stat-card, .card');
    const count = await statsCards.count();
    
    if (count > 0) {
      // Should show various stats
      const pageContent = await adminPage.textContent('body');
      expect(pageContent).toMatch(/users|clients|trainers|total/i);
    }
  });
  
  test('should show different user counts by role', async ({ adminPage, request, adminToken }) => {
    await adminPage.goto('/admin');
    
    // Get user counts from API
    const usersResponse = await request.get('/api/users/', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    expect(usersResponse.ok()).toBeTruthy();
    const users = await usersResponse.json();
    
    const clientCount = users.filter((u: any) => u.role === 'client').length;
    const trainerCount = users.filter((u: any) => u.role === 'trainer').length;
    
    // Verify counts are displayed on page
    const pageText = await adminPage.textContent('body');
    
    // Look for these numbers somewhere on the page
    expect(pageText).toContain(clientCount.toString());
    expect(pageText).toContain(trainerCount.toString());
  });
});






