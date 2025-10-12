import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Nutrition-related pages
 */
export class NutritionPages {
  readonly page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  // Meal Plan Creation Page
  async gotoCreateMealPlan() {
    await this.page.goto('/create-meal-plan');
  }
  
  async createMealPlan(data: {
    clientId?: string;
    date: string;
    title: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    notes?: string;
  }) {
    await this.gotoCreateMealPlan();
    
    if (data.clientId) {
      await this.page.selectOption('select[name="client_id"]', data.clientId);
    }
    
    await this.page.fill('input[name="date"]', data.date);
    await this.page.fill('input[name="title"]', data.title);
    
    if (data.calories) {
      await this.page.fill('input[name="total_calories"]', data.calories.toString());
    }
    
    if (data.protein) {
      await this.page.fill('input[name="protein_target"]', data.protein.toString());
    }
    
    if (data.carbs) {
      await this.page.fill('input[name="carb_target"]', data.carbs.toString());
    }
    
    if (data.fats) {
      await this.page.fill('input[name="fat_target"]', data.fats.toString());
    }
    
    if (data.notes) {
      await this.page.fill('textarea[name="notes"]', data.notes);
    }
    
    await this.page.click('button[type="submit"]:has-text("Create")');
    await this.page.waitForTimeout(1000);
  }
  
  async addMealEntry(mealName: string, orderIndex: number) {
    await this.page.click('button:has-text("Add Meal")');
    await this.page.fill('input[name="meal_name"]', mealName);
    await this.page.fill('input[name="order_index"]', orderIndex.toString());
    await this.page.click('button:has-text("Save Meal")');
    await this.page.waitForTimeout(500);
  }
  
  async addMealComponent(
    mealIndex: number,
    component: {
      type: string;
      description: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      optional?: boolean;
    }
  ) {
    const meal = this.page.locator('[data-testid="meal-entry"]').nth(mealIndex);
    await meal.locator('button:has-text("Add Component")').click();
    
    await this.page.selectOption('select[name="component_type"]', component.type);
    await this.page.fill('input[name="description"]', component.description);
    
    if (component.calories !== undefined) {
      await this.page.fill('input[name="calories"]', component.calories.toString());
    }
    
    if (component.protein !== undefined) {
      await this.page.fill('input[name="protein"]', component.protein.toString());
    }
    
    if (component.carbs !== undefined) {
      await this.page.fill('input[name="carbs"]', component.carbs.toString());
    }
    
    if (component.fat !== undefined) {
      await this.page.fill('input[name="fat"]', component.fat.toString());
    }
    
    if (component.optional) {
      await this.page.check('input[name="is_optional"]');
    }
    
    await this.page.click('button:has-text("Add Component")');
    await this.page.waitForTimeout(500);
  }
  
  // Meals Page (Client view)
  async gotoMealsPage() {
    await this.page.goto('/meals');
  }
  
  async getTodaysMealPlan(): Promise<boolean> {
    return await this.page.locator('[data-testid="meal-plan"]').isVisible();
  }
  
  async getMealCount(): Promise<number> {
    return await this.page.locator('[data-testid="meal-entry"]').count();
  }
  
  async uploadMealPhoto(mealName: string, filePath: string) {
    const meal = this.page.locator(`[data-testid="meal-entry"]:has-text("${mealName}")`);
    await meal.locator('button:has-text("Upload Photo")').click();
    
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    await this.page.waitForTimeout(1000); // Wait for upload
  }
  
  async getMealUploadStatus(mealName: string): Promise<string> {
    const meal = this.page.locator(`[data-testid="meal-entry"]:has-text("${mealName}")`);
    const status = await meal.locator('[data-testid="upload-status"]').textContent();
    return status || '';
  }
  
  async viewMealDetails(mealName: string) {
    await this.page.locator(`[data-testid="meal-entry"]:has-text("${mealName}")`).click();
  }
  
  async getMacros(): Promise<{ calories: number; protein: number; carbs: number; fat: number }> {
    const caloriesText = await this.page.locator('[data-testid="total-calories"]').textContent() || '0';
    const proteinText = await this.page.locator('[data-testid="total-protein"]').textContent() || '0';
    const carbsText = await this.page.locator('[data-testid="total-carbs"]').textContent() || '0';
    const fatText = await this.page.locator('[data-testid="total-fat"]').textContent() || '0';
    
    return {
      calories: parseInt(caloriesText.replace(/\D/g, '')),
      protein: parseInt(proteinText.replace(/\D/g, '')),
      carbs: parseInt(carbsText.replace(/\D/g, '')),
      fat: parseInt(fatText.replace(/\D/g, '')),
    };
  }
  
  // Trainer view - approve/reject meals
  async approveMealUpload(clientName: string, mealName: string) {
    await this.page.locator(`[data-testid="upload-${clientName}"]:has-text("${mealName}")`).click();
    await this.page.click('button:has-text("Approve")');
    await this.page.waitForTimeout(500);
  }
  
  async rejectMealUpload(clientName: string, mealName: string, reason: string) {
    await this.page.locator(`[data-testid="upload-${clientName}"]:has-text("${mealName}")`).click();
    await this.page.click('button:has-text("Reject")');
    await this.page.fill('textarea[name="rejection_reason"]', reason);
    await this.page.click('button:has-text("Submit")');
    await this.page.waitForTimeout(500);
  }
}



