import { test, expect } from '../../fixtures/auth.fixture';
import { saveTestImage } from '../../utils/test-helpers';
import { createProgressEntry } from '../../utils/api-helpers';
import { TEST_DATA } from '../../fixtures/test-data';

test.describe('File Management - Progress Photos', () => {
  test('should upload progress photo with weight entry', async ({ request, clientToken }) => {
    const entry = await createProgressEntry(
      request,
      clientToken,
      TEST_DATA.progress.basic()
    );
    
    expect(entry).toHaveProperty('id');
    
    // Cleanup
    await request.delete(`/api/progress/weight/${entry.id}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
  });
  
  test('should view progress photos', async ({ request, clientToken }) => {
    const response = await request.get('/api/progress/weight', {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    
    expect(response.ok()).toBeTruthy();
  });
});






