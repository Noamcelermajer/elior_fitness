import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Trainer Dashboard
 */
export class TrainerDashboard {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly clientsLink: Locator;
  readonly exercisesLink: Locator;
  readonly createWorkoutButton: Locator;
  readonly createMealPlanButton: Locator;
  readonly createExerciseButton: Locator;
  readonly clientList: Locator;
  readonly notificationBell: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1, h2').first();
    this.clientsLink = page.locator('a[href="/clients"], a:has-text("Clients")');
    this.exercisesLink = page.locator('a[href="/exercises"], a:has-text("Exercise Bank")');
    this.createWorkoutButton = page.locator('button:has-text("Create Workout"), a[href="/create-workout"]');
    this.createMealPlanButton = page.locator('button:has-text("Create Meal Plan"), a[href="/create-meal-plan"]');
    this.createExerciseButton = page.locator('button:has-text("Create Exercise"), a[href="/create-exercise"]');
    this.clientList = page.locator('[data-testid="client-list"], .client-list');
    this.notificationBell = page.locator('[data-testid="notification-bell"], button[aria-label*="notification"]');
  }
  
  async goto() {
    await this.page.goto('/trainer-dashboard');
  }
  
  async gotoClients() {
    await this.page.goto('/clients');
  }
  
  async gotoExercises() {
    await this.page.goto('/exercises');
  }
  
  async clickClient(clientName: string) {
    await this.page.locator(`[data-testid="client-card"]:has-text("${clientName}")`).click();
  }
  
  async createWorkout() {
    await this.createWorkoutButton.click();
  }
  
  async createMealPlan() {
    await this.createMealPlanButton.click();
  }
  
  async createExercise() {
    await this.createExerciseButton.click();
  }
  
  async getNotificationCount(): Promise<number> {
    const badge = this.notificationBell.locator('.badge, [data-testid="notification-count"]');
    const text = await badge.textContent();
    return parseInt(text || '0');
  }
  
  async openNotifications() {
    await this.notificationBell.click();
  }
}


