import { test as base, Page } from '@playwright/test';
import { loginApi, getCurrentUser, UserInfo } from '../utils/api-helpers';

/**
 * Test credentials for different user roles
 */
export const TEST_USERS = {
  admin: {
    username: 'admin@elior.com',
    password: 'admin123',
    role: 'admin' as const,
  },
  trainer: {
    username: 'trainer@elior.com',
    password: 'trainer123',
    role: 'trainer' as const,
  },
  client: {
    username: 'client@elior.com',
    password: 'client123',
    role: 'client' as const,
  },
};

/**
 * Extended fixtures with authentication helpers
 */
type AuthFixtures = {
  adminPage: Page;
  trainerPage: Page;
  clientPage: Page;
  adminToken: string;
  trainerToken: string;
  clientToken: string;
  adminUser: UserInfo;
  trainerUser: UserInfo;
  clientUser: UserInfo;
};

/**
 * Login via UI
 */
async function loginUI(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.waitForSelector('input#username', { timeout: 10000 });
  await page.fill('input#username', username);
  await page.fill('input#password', password);
  await page.click('button[type="submit"]:has-text("Sign In")');
  
  // Wait for successful login (redirect away from login page)
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 5000 });
}

/**
 * Extend base test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  // Admin token via API
  adminToken: async ({ request }, use) => {
    const token = await loginApi(request, TEST_USERS.admin.username, TEST_USERS.admin.password);
    await use(token);
  },
  
  // Trainer token via API
  trainerToken: async ({ request }, use) => {
    const token = await loginApi(request, TEST_USERS.trainer.username, TEST_USERS.trainer.password);
    await use(token);
  },
  
  // Client token via API
  clientToken: async ({ request }, use) => {
    const token = await loginApi(request, TEST_USERS.client.username, TEST_USERS.client.password);
    await use(token);
  },
  
  // Admin user info
  adminUser: async ({ request, adminToken }, use) => {
    const user = await getCurrentUser(request, adminToken);
    await use(user);
  },
  
  // Trainer user info
  trainerUser: async ({ request, trainerToken }, use) => {
    const user = await getCurrentUser(request, trainerToken);
    await use(user);
  },
  
  // Client user info
  clientUser: async ({ request, clientToken }, use) => {
    const user = await getCurrentUser(request, clientToken);
    await use(user);
  },
  
  // Admin page (logged in via UI)
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginUI(page, TEST_USERS.admin.username, TEST_USERS.admin.password);
    await use(page);
    await context.close();
  },
  
  // Trainer page (logged in via UI)
  trainerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginUI(page, TEST_USERS.trainer.username, TEST_USERS.trainer.password);
    await use(page);
    await context.close();
  },
  
  // Client page (logged in via UI)
  clientPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginUI(page, TEST_USERS.client.username, TEST_USERS.client.password);
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';

