import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Admin Dashboard
 */
export class AdminDashboard {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly usersLink: Locator;
  readonly systemLink: Locator;
  readonly createTrainerButton: Locator;
  readonly userTable: Locator;
  readonly searchInput: Locator;
  readonly filterSelect: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1, h2').first();
    this.usersLink = page.locator('a[href="/users"], a:has-text("Users")');
    this.systemLink = page.locator('a[href="/system"], a:has-text("System")');
    this.createTrainerButton = page.locator('button:has-text("Create Trainer"), a:has-text("Create Trainer")');
    this.userTable = page.locator('table');
    this.searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
    this.filterSelect = page.locator('select[name="role"], select:has-text("Filter")');
  }
  
  async goto() {
    await this.page.goto('/admin');
  }
  
  async gotoUsers() {
    await this.page.goto('/users');
  }
  
  async gotoSystem() {
    await this.page.goto('/system');
  }
  
  async searchUsers(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Wait for search to complete
  }
  
  async filterByRole(role: string) {
    await this.filterSelect.selectOption(role);
    await this.page.waitForTimeout(500);
  }
  
  async getUserCount(): Promise<number> {
    const rows = await this.userTable.locator('tbody tr').count();
    return rows;
  }
  
  async clickUser(username: string) {
    await this.page.locator(`tr:has-text("${username}")`).click();
  }
  
  async createTrainer() {
    await this.createTrainerButton.click();
  }
}



