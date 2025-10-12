import { test, expect } from '../../fixtures/auth.fixture';
import { randomEmail, randomString } from '../../utils/test-helpers';

test.describe('Admin - Trainer Creation', () => {
  test('should access trainer creation form', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    
    // Look for create trainer button or link
    const createButton = adminPage.locator(
      'button:has-text("Create Trainer"), a[href*="create-trainer"], a:has-text("New Trainer")'
    );
    
    if (await createButton.isVisible({ timeout: 3000 })) {
      await createButton.click();
      await adminPage.waitForTimeout(1000);
      
      // Should show trainer creation form
      await expect(adminPage.locator('form, [data-testid="trainer-form"]')).toBeVisible();
    } else {
      // Try navigating directly
      await adminPage.goto('/secret-users');
      await adminPage.waitForTimeout(1000);
      
      // Should be accessible to admin
      await expect(adminPage).not.toHaveURL(/login|unauthorized/);
    }
  });
  
  test('should create new trainer via API', async ({ request, adminToken }) => {
    const trainerData = {
      username: `trainer_${randomString()}`,
      email: randomEmail(),
      password: 'Test123!@#',
      full_name: `Test Trainer ${randomString(4)}`,
      role: 'trainer',
    };
    
    const response = await request.post('/api/auth/register/trainer', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: trainerData,
    });
    
    expect(response.status()).toBeLessThanOrEqual(201);
    
    if (response.ok()) {
      const trainer = await response.json();
      expect(trainer.role).toBe('trainer');
      expect(trainer.email).toBe(trainerData.email);
      
      // Cleanup: delete trainer
      await request.delete(`/api/users/${trainer.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  });
  
  test('should validate trainer creation data', async ({ request, adminToken }) => {
    // Try to create trainer with invalid email
    const response = await request.post('/api/auth/register/trainer', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        username: `trainer_${randomString()}`,
        email: 'invalid-email',
        password: 'Test123!@#',
        full_name: 'Test Trainer',
        role: 'trainer',
      },
    });
    
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
  
  test('should prevent duplicate trainer email', async ({ request, adminToken }) => {
    const email = randomEmail();
    
    // Create first trainer
    const trainerData = {
      username: `trainer_${randomString()}`,
      email,
      password: 'Test123!@#',
      full_name: 'Test Trainer 1',
      role: 'trainer',
    };
    
    const response1 = await request.post('/api/auth/register/trainer', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: trainerData,
    });
    
    let trainerId: number | null = null;
    
    if (response1.ok()) {
      const trainer = await response1.json();
      trainerId = trainer.id;
      
      // Try to create another trainer with same email
      const response2 = await request.post('/api/auth/register/trainer', {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          ...trainerData,
          username: `trainer_${randomString()}`,
        },
      });
      
      expect(response2.status()).toBeGreaterThanOrEqual(400);
      
      // Cleanup
      await request.delete(`/api/users/${trainerId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  });
  
  test('should list all trainers', async ({ request, adminToken }) => {
    const response = await request.get('/api/users/?role=trainer', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    expect(response.ok()).toBeTruthy();
    const trainers = await response.json();
    
    // Should have at least the default trainer
    expect(Array.isArray(trainers)).toBe(true);
    expect(trainers.length).toBeGreaterThanOrEqual(1);
    
    // All should have trainer role
    trainers.forEach((trainer: any) => {
      expect(trainer.role).toBe('trainer');
    });
  });
});



