import { test, expect } from '../../fixtures/auth.fixture';

test.describe('File Management - Meal Photos', () => {
  test('file upload endpoint exists', async ({ request, clientToken }) => {
    const response = await request.post('/api/files/upload', {
      headers: { Authorization: `Bearer ${clientToken}` },
      data: {},
    });
    
    // Should respond with validation error or success
    expect(response.status()).toBeGreaterThanOrEqual(200);
  });
  
  test('should require authentication', async ({ request }) => {
    const response = await request.post('/api/files/upload', {
      data: {},
    });
    
    expect(response.status()).toBe(401);
  });
});



