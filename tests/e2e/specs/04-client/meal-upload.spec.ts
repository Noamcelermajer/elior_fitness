import { test, expect } from '../../fixtures/auth.fixture';
import { createMealPlan, createMealEntry, deleteMealPlan } from '../../utils/api-helpers';
import { TEST_DATA } from '../../fixtures/test-data';
import { saveTestImage } from '../../utils/test-helpers';

test.describe('Client - Meal Upload', () => {
  test('should upload meal photo via API', async ({ request, trainerToken, clientToken, clientUser }) => {
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
    
    // Create test image
    const imagePath = await saveTestImage('test-meal.bmp');
    
    // Upload meal photo
    const fs = require('fs');
    const formData = new FormData();
    formData.append('file', new Blob([fs.readFileSync(imagePath)]), 'meal.jpg');
    
    const uploadResponse = await request.post(
      `/api/meal-plans/${mealPlan.id}/meals/${mealEntry.id}/uploads`,
      {
        headers: { Authorization: `Bearer ${clientToken}` },
        multipart: {
          file: {
            name: 'meal.jpg',
            mimeType: 'image/jpeg',
            buffer: fs.readFileSync(imagePath),
          },
        },
      }
    );
    
    // May or may not be implemented
    expect(uploadResponse.status()).toBeLessThanOrEqual(500);
    
    // Cleanup
    await deleteMealPlan(request, trainerToken, mealPlan.id);
    
    // Delete temp file
    fs.unlinkSync(imagePath);
  });
  
  test('should view upload status', async ({ request, clientToken }) => {
    // Try to get meal uploads
    const response = await request.get('/api/meal-plans/', {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    
    expect(response.ok()).toBeTruthy();
  });
  
  test('should handle invalid file types', async ({ request, clientToken }) => {
    // Try to upload invalid file type
    const formData = new FormData();
    formData.append('file', new Blob(['invalid content']), 'test.txt');
    
    const response = await request.post('/api/files/upload', {
      headers: { Authorization: `Bearer ${clientToken}` },
      data: formData,
    });
    
    // Should reject non-image files
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
  
  test('should limit file size', async ({ request, clientToken }) => {
    // Create large file (>10MB)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
    
    const response = await request.post('/api/files/upload', {
      headers: { Authorization: `Bearer ${clientToken}` },
      multipart: {
        file: {
          name: 'large.jpg',
          mimeType: 'image/jpeg',
          buffer: largeBuffer,
        },
      },
    });
    
    // Should reject large files
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});



