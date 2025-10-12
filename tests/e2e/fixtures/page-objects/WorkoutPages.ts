import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Workout-related pages
 */
export class WorkoutPages {
  readonly page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  // Exercise Bank Page
  async gotoExerciseBank() {
    await this.page.goto('/exercises');
  }
  
  async createExercise(data: {
    name: string;
    description: string;
    muscleGroup: string;
    equipment?: string;
    instructions?: string;
  }) {
    await this.page.goto('/create-exercise');
    await this.page.waitForSelector('input#name');
    
    await this.page.fill('input#name', data.name);
    await this.page.fill('textarea#description', data.description);
    
    // Click the Select trigger to open dropdown
    await this.page.click('[id="muscle_group"] button');
    await this.page.waitForTimeout(300);
    // Click the option
    await this.page.click(`[role="option"]:has-text("${data.muscleGroup}")`);
    
    if (data.equipment) {
      await this.page.click('[id="equipment"] button');
      await this.page.waitForTimeout(300);
      await this.page.click(`[role="option"]:has-text("${data.equipment}")`);
    }
    
    if (data.instructions) {
      await this.page.fill('textarea#instructions', data.instructions);
    }
    
    await this.page.click('button[type="submit"]:has-text("Create Exercise")');
    await this.page.waitForTimeout(2000);
  }
  
  async filterExercisesByMuscleGroup(muscleGroup: string) {
    await this.page.selectOption('select[name="muscle_group_filter"]', muscleGroup);
    await this.page.waitForTimeout(500);
  }
  
  async searchExercises(query: string) {
    await this.page.fill('input[type="search"], input[placeholder*="Search"]', query);
    await this.page.waitForTimeout(500);
  }
  
  async getExerciseCount(): Promise<number> {
    const exercises = await this.page.locator('[data-testid="exercise-card"], .exercise-item').count();
    return exercises;
  }
  
  async clickExercise(exerciseName: string) {
    await this.page.locator(`[data-testid="exercise-card"]:has-text("${exerciseName}")`).click();
  }
  
  // Workout Creation Page
  async gotoCreateWorkout() {
    await this.page.goto('/create-workout');
  }
  
  async createWorkoutPlan(data: {
    name: string;
    description: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    await this.gotoCreateWorkout();
    
    await this.page.fill('input[name="name"]', data.name);
    await this.page.fill('textarea[name="description"]', data.description);
    
    if (data.clientId) {
      await this.page.selectOption('select[name="client_id"]', data.clientId);
    }
    
    if (data.startDate) {
      await this.page.fill('input[name="start_date"]', data.startDate);
    }
    
    if (data.endDate) {
      await this.page.fill('input[name="end_date"]', data.endDate);
    }
    
    await this.page.click('button[type="submit"]:has-text("Create")');
    await this.page.waitForTimeout(1000);
  }
  
  async addSession(name: string, dayOfWeek: number) {
    await this.page.click('button:has-text("Add Session")');
    await this.page.fill('input[name="session_name"]', name);
    await this.page.selectOption('select[name="day_of_week"]', dayOfWeek.toString());
    await this.page.click('button:has-text("Save Session")');
    await this.page.waitForTimeout(500);
  }
  
  async addExerciseToSession(sessionIndex: number, exerciseName: string, sets: number, reps: string) {
    // Find the session and add exercise
    const session = this.page.locator('[data-testid="workout-session"]').nth(sessionIndex);
    await session.locator('button:has-text("Add Exercise")').click();
    
    // Select exercise from dropdown or modal
    await this.page.locator('input[name="exercise_search"]').fill(exerciseName);
    await this.page.locator(`[data-testid="exercise-option"]:has-text("${exerciseName}")`).click();
    
    // Fill exercise details
    await this.page.fill('input[name="sets"]', sets.toString());
    await this.page.fill('input[name="reps"]', reps);
    
    await this.page.click('button:has-text("Add")');
    await this.page.waitForTimeout(500);
  }
  
  // Workout Detail Page
  async gotoWorkoutDetail(workoutId: number) {
    await this.page.goto(`/workout/${workoutId}`);
  }
  
  async getWorkoutName(): Promise<string> {
    return await this.page.locator('h1, [data-testid="workout-name"]').textContent() || '';
  }
  
  async getSessionCount(): Promise<number> {
    return await this.page.locator('[data-testid="workout-session"]').count();
  }
  
  async completeExercise(exerciseName: string, data: {
    sets: number;
    reps: string;
    weight: string;
    difficulty: number;
    notes?: string;
  }) {
    const exercise = this.page.locator(`[data-testid="exercise-item"]:has-text("${exerciseName}")`);
    await exercise.locator('button:has-text("Log")').click();
    
    await this.page.fill('input[name="actual_sets"]', data.sets.toString());
    await this.page.fill('input[name="actual_reps"]', data.reps);
    await this.page.fill('input[name="weight_used"]', data.weight);
    await this.page.click(`button[data-difficulty="${data.difficulty}"]`);
    
    if (data.notes) {
      await this.page.fill('textarea[name="notes"]', data.notes);
    }
    
    await this.page.click('button[type="submit"]:has-text("Save")');
    await this.page.waitForTimeout(500);
  }
  
  // Training Page (Client view)
  async gotoTrainingPage() {
    await this.page.goto('/training');
  }
  
  async getActiveWorkouts(): Promise<number> {
    return await this.page.locator('[data-testid="workout-card"]').count();
  }
  
  async openWorkout(workoutName: string) {
    await this.page.locator(`[data-testid="workout-card"]:has-text("${workoutName}")`).click();
  }
}

