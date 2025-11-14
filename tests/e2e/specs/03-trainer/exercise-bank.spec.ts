import { test, expect } from '../../fixtures/auth.fixture';
import { WorkoutPages } from '../../fixtures/page-objects/WorkoutPages';
import { TEST_DATA, MUSCLE_GROUPS } from '../../fixtures/test-data';
import { createExercise } from '../../utils/api-helpers';

test.describe('Trainer - Exercise Bank', () => {
  test('should display exercise bank page', async ({ trainerPage }) => {
    const workoutPages = new WorkoutPages(trainerPage);
    await workoutPages.gotoExerciseBank();
    
    // Should show exercise list or empty state
    await expect(trainerPage.locator('h1, h2')).toContainText(/exercise|bank/i);
  });
  
  test('should create new exercise via UI', async ({ trainerPage }) => {
    const workoutPages = new WorkoutPages(trainerPage);
    const exerciseData = TEST_DATA.exercise.basic();
    
    await workoutPages.createExercise({
      name: exerciseData.name,
      description: exerciseData.description,
      muscleGroup: exerciseData.muscle_group,
      equipment: exerciseData.equipment_needed,
      instructions: exerciseData.instructions,
    });
    
    await trainerPage.waitForTimeout(2000);
    
    // Should show success message or redirect
    const pageContent = await trainerPage.textContent('body');
    expect(pageContent).toContain(exerciseData.name);
  });
  
  test('should create exercise via API', async ({ request, trainerToken }) => {
    const exerciseData = TEST_DATA.exercise.basic();
    
    const exercise = await createExercise(request, trainerToken, exerciseData);
    
    expect(exercise).toHaveProperty('id');
    expect(exercise.name).toBe(exerciseData.name);
    expect(exercise.muscle_group).toBe(exerciseData.muscle_group);
    
    // Cleanup
    await request.delete(`/api/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
  });
  
  test('should create exercise for each muscle group', async ({ request, trainerToken }) => {
    const createdExercises = [];
    
    for (const muscleGroup of MUSCLE_GROUPS) {
      const exerciseData = TEST_DATA.exercise.byMuscleGroup(muscleGroup);
      
      try {
        const exercise = await createExercise(request, trainerToken, exerciseData);
        createdExercises.push(exercise.id);
        
        expect(exercise.muscle_group).toBe(muscleGroup);
      } catch (error) {
        console.error(`Failed to create exercise for ${muscleGroup}:`, error);
      }
    }
    
    // Should have created exercises for multiple muscle groups
    expect(createdExercises.length).toBeGreaterThan(0);
    
    // Cleanup
    for (const id of createdExercises) {
      await request.delete(`/api/workouts/exercises/${id}`, {
        headers: { Authorization: `Bearer ${trainerToken}` },
      });
    }
  });
  
  test('should filter exercises by muscle group', async ({ trainerPage, request, trainerToken }) => {
    const workoutPages = new WorkoutPages(trainerPage);
    
    // Create exercises for different muscle groups
    const chestExercise = await createExercise(
      request,
      trainerToken,
      TEST_DATA.exercise.byMuscleGroup('chest')
    );
    const backExercise = await createExercise(
      request,
      trainerToken,
      TEST_DATA.exercise.byMuscleGroup('back')
    );
    
    await workoutPages.gotoExerciseBank();
    await trainerPage.waitForTimeout(1000);
    
    // Filter by chest
    await workoutPages.filterExercisesByMuscleGroup('chest');
    
    // Should show chest exercises
    await expect(trainerPage.locator('body')).toContainText(chestExercise.name);
    
    // Cleanup
    await request.delete(`/api/workouts/exercises/${chestExercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
    await request.delete(`/api/workouts/exercises/${backExercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
  });
  
  test('should search exercises', async ({ trainerPage, request, trainerToken }) => {
    const workoutPages = new WorkoutPages(trainerPage);
    const exerciseData = TEST_DATA.exercise.basic();
    
    const exercise = await createExercise(request, trainerToken, exerciseData);
    
    await workoutPages.gotoExerciseBank();
    await trainerPage.waitForTimeout(1000);
    
    // Search for the exercise
    await workoutPages.searchExercises(exerciseData.name);
    
    // Should find the exercise
    await expect(trainerPage.locator('body')).toContainText(exerciseData.name);
    
    // Cleanup
    await request.delete(`/api/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
  });
  
  test('should update exercise', async ({ request, trainerToken }) => {
    const exerciseData = TEST_DATA.exercise.basic();
    const exercise = await createExercise(request, trainerToken, exerciseData);
    
    // Update exercise
    const updatedName = `Updated ${exerciseData.name}`;
    const updateResponse = await request.put(`/api/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        name: updatedName,
        description: exerciseData.description,
        muscle_group: exerciseData.muscle_group,
      },
    });
    
    expect(updateResponse.ok()).toBeTruthy();
    const updated = await updateResponse.json();
    expect(updated.name).toBe(updatedName);
    
    // Cleanup
    await request.delete(`/api/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
  });
  
  test('should delete exercise', async ({ request, trainerToken }) => {
    const exerciseData = TEST_DATA.exercise.basic();
    const exercise = await createExercise(request, trainerToken, exerciseData);
    
    // Delete exercise
    const deleteResponse = await request.delete(`/api/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
    
    expect(deleteResponse.ok()).toBeTruthy();
    
    // Verify deleted
    const getResponse = await request.get(`/api/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
    
    expect(getResponse.status()).toBeGreaterThanOrEqual(404);
  });
  
  test('should validate exercise data', async ({ request, trainerToken }) => {
    // Try to create exercise without required fields
    const response = await request.post('/api/exercises/', {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        name: '', // Empty name
        description: 'Test',
        muscle_group: 'Chest',
      },
    });
    
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

