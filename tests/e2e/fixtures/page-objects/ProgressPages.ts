import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Progress-related pages
 */
export class ProgressPages {
  readonly page: Page;
  readonly progressChart: Locator;
  readonly weightHistory: Locator;
  readonly logWeightButton: Locator;
  readonly uploadPhotoButton: Locator;
  readonly currentWeight: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.progressChart = page.locator('[data-testid="progress-chart"], canvas');
    this.weightHistory = page.locator('[data-testid="weight-history"]');
    this.logWeightButton = page.locator('button:has-text("Log Weight")');
    this.uploadPhotoButton = page.locator('button:has-text("Upload Photo")');
    this.currentWeight = page.locator('[data-testid="current-weight"]');
  }
  
  async gotoProgressPage() {
    await this.page.goto('/progress');
  }
  
  async logWeight(weight: number, notes?: string, photoPath?: string) {
    await this.logWeightButton.click();
    
    await this.page.fill('input[name="weight"]', weight.toString());
    
    if (notes) {
      await this.page.fill('textarea[name="notes"]', notes);
    }
    
    if (photoPath) {
      const fileInput = this.page.locator('input[type="file"]');
      await fileInput.setInputFiles(photoPath);
    }
    
    await this.page.click('button[type="submit"]:has-text("Save")');
    await this.page.waitForTimeout(1000);
  }
  
  async getCurrentWeight(): Promise<number> {
    const text = await this.currentWeight.textContent() || '0';
    return parseFloat(text.replace(/[^\d.]/g, ''));
  }
  
  async getWeightEntryCount(): Promise<number> {
    return await this.page.locator('[data-testid="weight-entry"]').count();
  }
  
  async hasProgressPhotos(): Promise<boolean> {
    return await this.page.locator('[data-testid="progress-photo"]').count() > 0;
  }
  
  async viewWeightHistory() {
    await this.page.click('button:has-text("View History")');
  }
  
  async deleteWeightEntry(date: string) {
    const entry = this.page.locator(`[data-testid="weight-entry"]:has-text("${date}")`);
    await entry.locator('button[aria-label="Delete"]').click();
    await this.page.click('button:has-text("Confirm")');
    await this.page.waitForTimeout(500);
  }
  
  async filterByDateRange(startDate: string, endDate: string) {
    await this.page.fill('input[name="start_date"]', startDate);
    await this.page.fill('input[name="end_date"]', endDate);
    await this.page.click('button:has-text("Filter")');
    await this.page.waitForTimeout(500);
  }
  
  async viewProgressPhoto(index: number) {
    await this.page.locator('[data-testid="progress-photo"]').nth(index).click();
  }
  
  async comparePhotos(date1: string, date2: string) {
    await this.page.locator(`[data-testid="photo-${date1}"]`).click({ modifiers: ['Control'] });
    await this.page.locator(`[data-testid="photo-${date2}"]`).click({ modifiers: ['Control'] });
    await this.page.click('button:has-text("Compare")');
  }
  
  async exportData() {
    await this.page.click('button:has-text("Export")');
    await this.page.waitForTimeout(1000);
  }
  
  // Trainer view - client progress
  async viewClientProgress(clientId: number) {
    await this.page.goto(`/client/${clientId}/progress`);
  }
  
  async getWeightTrend(): Promise<'up' | 'down' | 'stable'> {
    const trendElement = this.page.locator('[data-testid="weight-trend"]');
    const classes = await trendElement.getAttribute('class') || '';
    
    if (classes.includes('trend-up')) return 'up';
    if (classes.includes('trend-down')) return 'down';
    return 'stable';
  }
}



