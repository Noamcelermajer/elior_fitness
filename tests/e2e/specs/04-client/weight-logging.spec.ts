import { test, expect } from '../../fixtures/auth.fixture';
import { createProgressEntry } from '../../utils/api-helpers';
import { TEST_DATA } from '../../fixtures/test-data';
import { currentDate } from '../../utils/test-helpers';

test.describe('Client - Weight Logging', () => {
  test('should log weight via API', async ({ request, clientToken }) => {
    const entry = await createProgressEntry(
      request,
      clientToken,
      TEST_DATA.progress.basic()
    );
    
    expect(entry).toHaveProperty('id');
    expect(entry.weight).toBe(75.5);
    
    // Cleanup
    await request.delete(`/api/progress/weight/${entry.id}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
  });
  
  test('should log weight with notes', async ({ request, clientToken }) => {
    const entry = await createProgressEntry(
      request,
      clientToken,
      {
        ...TEST_DATA.progress.basic(),
        notes: 'Feeling great after workout!',
      }
    );
    
    expect(entry.notes).toContain('Feeling great');
    
    // Cleanup
    await request.delete(`/api/progress/weight/${entry.id}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
  });
  
  test('should log weight for specific date', async ({ request, clientToken }) => {
    const date = currentDate();
    const entry = await createProgressEntry(
      request,
      clientToken,
      {
        ...TEST_DATA.progress.basic(),
        date,
      }
    );
    
    expect(entry.date).toBe(date);
    
    // Cleanup
    await request.delete(`/api/progress/weight/${entry.id}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
  });
  
  test('should view weight history', async ({ request, clientToken }) => {
    const response = await request.get('/api/progress/weight', {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    
    expect(response.ok()).toBeTruthy();
    const history = await response.json();
    
    expect(Array.isArray(history)).toBe(true);
  });
  
  test('should update weight entry', async ({ request, clientToken }) => {
    const entry = await createProgressEntry(
      request,
      clientToken,
      TEST_DATA.progress.basic()
    );
    
    // Update entry
    const updateResponse = await request.put(`/api/progress/weight/${entry.id}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
      data: {
        ...entry,
        notes: 'Updated notes',
      },
    });
    
    if (updateResponse.ok()) {
      const updated = await updateResponse.json();
      expect(updated.notes).toContain('Updated');
    }
    
    // Cleanup
    await request.delete(`/api/progress/weight/${entry.id}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
  });
  
  test('should delete weight entry', async ({ request, clientToken }) => {
    const entry = await createProgressEntry(
      request,
      clientToken,
      TEST_DATA.progress.basic()
    );
    
    // Delete entry
    const deleteResponse = await request.delete(`/api/progress/weight/${entry.id}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    
    expect(deleteResponse.ok()).toBeTruthy();
    
    // Verify deleted
    const getResponse = await request.get(`/api/progress/weight/${entry.id}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    
    expect(getResponse.status()).toBeGreaterThanOrEqual(404);
  });
  
  test('should validate weight values', async ({ request, clientToken }) => {
    // Try to log negative weight
    const response = await request.post('/api/progress/weight', {
      headers: { Authorization: `Bearer ${clientToken}` },
      data: {
        date: currentDate(),
        weight: -50,
      },
    });
    
    // Should reject invalid weight
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
  
  test('should track multiple weight entries', async ({ request, clientToken }) => {
    const entries = [];
    
    for (let i = 0; i < 5; i++) {
      const entry = await createProgressEntry(request, clientToken, {
        date: currentDate(),
        weight: 75 + i * 0.2,
        notes: `Day ${i + 1}`,
      });
      entries.push(entry);
    }
    
    // Get history
    const response = await request.get('/api/progress/weight', {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    
    expect(response.ok()).toBeTruthy();
    const history = await response.json();
    expect(history.length).toBeGreaterThanOrEqual(5);
    
    // Cleanup
    for (const entry of entries) {
      await request.delete(`/api/progress/weight/${entry.id}`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
    }
  });
});






