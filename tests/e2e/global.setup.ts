import { test as setup } from '@playwright/test';

/**
 * Global setup test that runs before all other tests
 * Performs initial authentication and saves state
 */
setup('verify application is accessible', async ({ page }) => {
  // Navigate to the application
  await page.goto('/');
  
  // Should redirect to login page
  await page.waitForURL('**/login', { timeout: 5000 });
  
  console.log('✅ Application is accessible and routing works');
});


