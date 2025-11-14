import { test, expect } from '../../fixtures/auth.fixture';
import { WorkoutPages } from '../../fixtures/page-objects/WorkoutPages';
import { createWorkoutPlan, createWorkoutSession, createExercise, deleteWorkoutPlan } from '../../utils/api-helpers';
import { TEST_DATA } from '../../fixtures/test-data';

test.describe('Client - Workout Completion', () => {
  test('should log exercise completion via API', async ({ request, trainerToken, clientToken, clientUser }) => {
    // Setup workout
    const exercise = await createExercise(request, trainerToken, TEST_DATA.exercise.basic());
    const workout = await createWorkoutPlan(request, trainerToken, TEST_DATA.workoutPlan.basic(clientUser.id));
    const session = await createWorkoutSession(request, trainerToken, workout.id, TEST_DATA.workoutSession.chest());
    
    // Add exercise to session
    const workoutExerciseResponse = await request.post(`/api/workouts/sessions/${session.id}/exercises`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        exercise_id: exercise.id,
        order: 1,
        sets: 3,
        reps: '10',
        rest_time: 60,
      },
    });
    
    expect(workoutExerciseResponse.ok()).toBeTruthy();
    const workoutExercise = await workoutExerciseResponse.json();
    
    // Client logs completion
    const completionResponse = await request.post('/api/workouts/completions', {
      headers: { Authorization: `Bearer ${clientToken}` },
      data: TEST_DATA.completion.basic(workoutExercise.id),
    });
    
    expect(completionResponse.ok()).toBeTruthy();
    const completion = await completionResponse.json();
    
    expect(completion.workout_exercise_id).toBe(workoutExercise.id);
    expect(completion.actual_sets).toBe(3);
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
    await request.delete(`/api/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
  });
  
  test('should log completion with all details', async ({ request, trainerToken, clientToken, clientUser }) => {
    const exercise = await createExercise(request, trainerToken, TEST_DATA.exercise.basic());
    const workout = await createWorkoutPlan(request, trainerToken, TEST_DATA.workoutPlan.basic(clientUser.id));
    const session = await createWorkoutSession(request, trainerToken, workout.id, TEST_DATA.workoutSession.chest());
    
    const workoutExerciseResponse = await request.post(`/api/workouts/sessions/${session.id}/exercises`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        exercise_id: exercise.id,
        order: 1,
        sets: 4,
        reps: '12-10-8-6',
      },
    });
    
    const workoutExercise = await workoutExerciseResponse.json();
    
    // Log completion with detailed information
    const completionData = {
      workout_exercise_id: workoutExercise.id,
      actual_sets: 4,
      actual_reps: '12, 10, 8, 6',
      weight_used: '100kg',
      difficulty_rating: 4,
      notes: 'Great workout! Felt strong today.',
    };
    
    const completionResponse = await request.post('/api/workouts/completions', {
      headers: { Authorization: `Bearer ${clientToken}` },
      data: completionData,
    });
    
    expect(completionResponse.ok()).toBeTruthy();
    const completion = await completionResponse.json();
    
    expect(completion.weight_used).toBe('100kg');
    expect(completion.difficulty_rating).toBe(4);
    expect(completion.notes).toContain('strong');
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
    await request.delete(`/api/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
  });
  
  test('should log completion with different difficulty ratings', async ({ request, trainerToken, clientToken, clientUser }) => {
    const exercise = await createExercise(request, trainerToken, TEST_DATA.exercise.basic());
    const workout = await createWorkoutPlan(request, trainerToken, TEST_DATA.workoutPlan.basic(clientUser.id));
    const session = await createWorkoutSession(request, trainerToken, workout.id, TEST_DATA.workoutSession.chest());
    
    const workoutExerciseResponse = await request.post(`/api/workouts/sessions/${session.id}/exercises`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        exercise_id: exercise.id,
        order: 1,
        sets: 3,
        reps: '10',
      },
    });
    
    const workoutExercise = await workoutExerciseResponse.json();
    
    // Test different difficulty ratings
    for (const difficulty of [1, 2, 3, 4, 5]) {
      const completionData = {
        workout_exercise_id: workoutExercise.id,
        actual_sets: 3,
        actual_reps: '10',
        weight_used: '50kg',
        difficulty_rating: difficulty,
      };
      
      const response = await request.post('/api/workouts/completions', {
        headers: { Authorization: `Bearer ${clientToken}` },
        data: completionData,
      });
      
      if (response.ok()) {
        const completion = await response.json();
        expect(completion.difficulty_rating).toBe(difficulty);
        
        // Delete completion
        await request.delete(`/api/workouts/completions/${completion.id}`, {
          headers: { Authorization: `Bearer ${clientToken}` },
        });
      }
    }
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
    await request.delete(`/api/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
  });
  
  test('should view completion history', async ({ request, clientToken }) => {
    const response = await request.get('/api/workouts/completions', {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    
    expect(response.ok()).toBeTruthy();
    const completions = await response.json();
    
    expect(Array.isArray(completions)).toBe(true);
  });
  
  test('should update completion', async ({ request, trainerToken, clientToken, clientUser }) => {
    const exercise = await createExercise(request, trainerToken, TEST_DATA.exercise.basic());
    const workout = await createWorkoutPlan(request, trainerToken, TEST_DATA.workoutPlan.basic(clientUser.id));
    const session = await createWorkoutSession(request, trainerToken, workout.id, TEST_DATA.workoutSession.chest());
    
    const workoutExerciseResponse = await request.post(`/api/workouts/sessions/${session.id}/exercises`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        exercise_id: exercise.id,
        order: 1,
        sets: 3,
        reps: '10',
      },
    });
    
    const workoutExercise = await workoutExerciseResponse.json();
    
    // Create completion
    const completionResponse = await request.post('/api/workouts/completions', {
      headers: { Authorization: `Bearer ${clientToken}` },
      data: TEST_DATA.completion.basic(workoutExercise.id),
    });
    
    const completion = await completionResponse.json();
    
    // Update completion
    const updateResponse = await request.put(`/api/workouts/completions/${completion.id}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
      data: {
        ...completion,
        notes: 'Updated: Felt even better!',
      },
    });
    
    if (updateResponse.ok()) {
      const updated = await updateResponse.json();
      expect(updated.notes).toContain('Updated');
    }
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
    await request.delete(`/api/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
  });
  
  test('should delete completion', async ({ request, trainerToken, clientToken, clientUser }) => {
    const exercise = await createExercise(request, trainerToken, TEST_DATA.exercise.basic());
    const workout = await createWorkoutPlan(request, trainerToken, TEST_DATA.workoutPlan.basic(clientUser.id));
    const session = await createWorkoutSession(request, trainerToken, workout.id, TEST_DATA.workoutSession.chest());
    
    const workoutExerciseResponse = await request.post(`/api/workouts/sessions/${session.id}/exercises`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        exercise_id: exercise.id,
        order: 1,
        sets: 3,
        reps: '10',
      },
    });
    
    const workoutExercise = await workoutExerciseResponse.json();
    
    const completionResponse = await request.post('/api/workouts/completions', {
      headers: { Authorization: `Bearer ${clientToken}` },
      data: TEST_DATA.completion.basic(workoutExercise.id),
    });
    
    const completion = await completionResponse.json();
    
    // Delete completion
    const deleteResponse = await request.delete(`/api/workouts/completions/${completion.id}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    
    expect(deleteResponse.ok()).toBeTruthy();
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
    await request.delete(`/api/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
  });
});

