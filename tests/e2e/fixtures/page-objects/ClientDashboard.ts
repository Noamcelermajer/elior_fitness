import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Client Dashboard
 */
export class ClientDashboard {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly trainingLink: Locator;
  readonly mealsLink: Locator;
  readonly progressLink: Locator;
  readonly todayWorkout: Locator;
  readonly todayMeals: Locator;
  readonly weightDisplay: Locator;
  readonly logWeightButton: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1, h2').first();
    this.trainingLink = page.locator('a[href="/training"], a:has-text("Training")');
    this.mealsLink = page.locator('a[href="/meals"], a:has-text("Meals")');
    this.progressLink = page.locator('a[href="/progress"], a:has-text("Progress")');
    this.todayWorkout = page.locator('[data-testid="today-workout"]');
    this.todayMeals = page.locator('[data-testid="today-meals"]');
    this.weightDisplay = page.locator('[data-testid="current-weight"]');
    this.logWeightButton = page.locator('button:has-text("Log Weight")');
  }
  
  async goto() {
    await this.page.goto('/');
  }
  
  async gotoTraining() {
    await this.page.goto('/training');
  }
  
  async gotoMeals() {
    await this.page.goto('/meals');
  }
  
  async gotoProgress() {
    await this.page.goto('/progress');
  }
  
  async logWeight() {
    await this.logWeightButton.click();
  }
  
  async getCurrentWeight(): Promise<string> {
    return await this.weightDisplay.textContent() || '';
  }
  
  async hasWorkoutToday(): Promise<boolean> {
    return await this.todayWorkout.isVisible();
  }
  
  async hasMealsToday(): Promise<boolean> {
    return await this.todayMeals.isVisible();
  }
}






