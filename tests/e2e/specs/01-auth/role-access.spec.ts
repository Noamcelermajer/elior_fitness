import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Role-Based Access Control', () => {
  test('admin can access admin pages', async ({ adminPage }) => {
    // Admin dashboard
    await adminPage.goto('/admin');
    await expect(adminPage).not.toHaveURL(/login/);
    await expect(adminPage).toHaveURL(/admin/);
    
    // Users page
    await adminPage.goto('/users');
    await expect(adminPage).not.toHaveURL(/login/);
    await expect(adminPage).toHaveURL(/users/);
    
    // System page
    await adminPage.goto('/system');
    await expect(adminPage).not.toHaveURL(/login/);
    await expect(adminPage).toHaveURL(/system/);
  });
  
  test('trainer can access trainer pages', async ({ trainerPage }) => {
    // Trainer dashboard
    await trainerPage.goto('/trainer-dashboard');
    await expect(trainerPage).not.toHaveURL(/login/);
    
    // Clients page
    await trainerPage.goto('/clients');
    await expect(trainerPage).not.toHaveURL(/login/);
    
    // Exercise bank
    await trainerPage.goto('/exercises');
    await expect(trainerPage).not.toHaveURL(/login/);
    
    // Create workout
    await trainerPage.goto('/create-workout');
    await expect(trainerPage).not.toHaveURL(/login/);
    
    // Create meal plan
    await trainerPage.goto('/create-meal-plan');
    await expect(trainerPage).not.toHaveURL(/login/);
  });
  
  test('client can access client pages', async ({ clientPage }) => {
    // Home/Dashboard
    await clientPage.goto('/');
    await expect(clientPage).not.toHaveURL(/login/);
    
    // Training page
    await clientPage.goto('/training');
    await expect(clientPage).not.toHaveURL(/login/);
    
    // Meals page
    await clientPage.goto('/meals');
    await expect(clientPage).not.toHaveURL(/login/);
    
    // Progress page
    await clientPage.goto('/progress');
    await expect(clientPage).not.toHaveURL(/login/);
  });
  
  test('trainer cannot access admin pages', async ({ trainerPage }) => {
    await trainerPage.goto('/admin');
    
    // Should redirect to login or show error
    await trainerPage.waitForTimeout(1000);
    const url = trainerPage.url();
    expect(url).toMatch(/login|unauthorized|403|trainer-dashboard/);
  });
  
  test('client cannot access admin pages', async ({ clientPage }) => {
    await clientPage.goto('/admin');
    
    await clientPage.waitForTimeout(1000);
    const url = clientPage.url();
    expect(url).toMatch(/login|unauthorized|403|\/$/);
  });
  
  test('client cannot access trainer pages', async ({ clientPage }) => {
    // Try to access trainer-only pages
    await clientPage.goto('/create-workout');
    await clientPage.waitForTimeout(1000);
    let url = clientPage.url();
    expect(url).toMatch(/login|unauthorized|403|\/$/);
    
    await clientPage.goto('/create-meal-plan');
    await clientPage.waitForTimeout(1000);
    url = clientPage.url();
    expect(url).toMatch(/login|unauthorized|403|\/$/);
    
    await clientPage.goto('/create-exercise');
    await clientPage.waitForTimeout(1000);
    url = clientPage.url();
    expect(url).toMatch(/login|unauthorized|403|\/$/);
  });
  
  test('unauthenticated user cannot access protected routes', async ({ page }) => {
    const protectedRoutes = [
      '/',
      '/admin',
      '/trainer-dashboard',
      '/clients',
      '/exercises',
      '/training',
      '/meals',
      '/progress',
      '/create-workout',
      '/create-meal-plan',
    ];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/login/);
    }
  });
  
  test('API calls require authentication', async ({ request }) => {
    // Try to access API without token
    const response = await request.get('/api/users/');
    expect(response.status()).toBe(401);
  });
  
  test('API calls with invalid token should fail', async ({ request }) => {
    const response = await request.get('/api/users/', {
      headers: {
        Authorization: 'Bearer invalid_token_12345',
      },
    });
    expect(response.status()).toBe(401);
  });
  
  test('API calls respect role permissions', async ({ request, clientToken, trainerToken, adminToken }) => {
    // Client cannot create exercises
    let response = await request.post('/api/exercises/', {
      headers: { Authorization: `Bearer ${clientToken}` },
      data: {
        name: 'Test Exercise',
        description: 'Test',
        muscle_group: 'Chest',
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(403); // 403 or 401
    
    // Trainer can create exercises
    response = await request.post('/api/exercises/', {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        name: 'Test Exercise',
        description: 'Test',
        muscle_group: 'Chest',
      },
    });
    expect(response.status()).toBeLessThanOrEqual(201);
    
    // Cleanup
    if (response.ok()) {
      const exercise = await response.json();
      await request.delete(`/api/exercises/${exercise.id}`, {
        headers: { Authorization: `Bearer ${trainerToken}` },
      });
    }
  });
});

