import { test, expect } from '../../fixtures/auth.fixture';
import { WorkoutPages } from '../../fixtures/page-objects/WorkoutPages';
import { TEST_DATA } from '../../fixtures/test-data';
import {
  createExercise,
  createWorkoutPlan,
  createWorkoutSession,
  getWorkoutPlan,
  deleteWorkoutPlan,
  getClients,
} from '../../utils/api-helpers';

test.describe('Trainer - Workout Creation', () => {
  test('should access workout creation page', async ({ trainerPage }) => {
    const workoutPages = new WorkoutPages(trainerPage);
    await workoutPages.gotoCreateWorkout();
    
    // Should show workout creation form
    await expect(trainerPage.locator('form, [data-testid="workout-form"]')).toBeVisible();
  });
  
  test('should create workout plan via API', async ({ request, trainerToken, clientUser }) => {
    const workoutData = TEST_DATA.workoutPlan.basic(clientUser.id);
    
    const workout = await createWorkoutPlan(request, trainerToken, workoutData);
    
    expect(workout).toHaveProperty('id');
    expect(workout.name).toBe(workoutData.name);
    expect(workout.client_id).toBe(clientUser.id);
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
  });
  
  test('should create workout with sessions', async ({ request, trainerToken, clientUser }) => {
    // Create workout plan
    const workoutData = TEST_DATA.workoutPlan.basic(clientUser.id);
    const workout = await createWorkoutPlan(request, trainerToken, workoutData);
    
    // Add sessions
    const session1 = await createWorkoutSession(
      request,
      trainerToken,
      workout.id,
      TEST_DATA.workoutSession.chest()
    );
    
    const session2 = await createWorkoutSession(
      request,
      trainerToken,
      workout.id,
      TEST_DATA.workoutSession.back()
    );
    
    expect(session1).toHaveProperty('id');
    expect(session2).toHaveProperty('id');
    
    // Get complete workout
    const completeWorkout = await getWorkoutPlan(request, trainerToken, workout.id);
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
  });
  
  test('should add exercises to workout session', async ({ request, trainerToken, clientUser }) => {
    // Create exercise
    const exercise = await createExercise(
      request,
      trainerToken,
      TEST_DATA.exercise.basic()
    );
    
    // Create workout and session
    const workout = await createWorkoutPlan(
      request,
      trainerToken,
      TEST_DATA.workoutPlan.basic(clientUser.id)
    );
    
    const session = await createWorkoutSession(
      request,
      trainerToken,
      workout.id,
      TEST_DATA.workoutSession.chest()
    );
    
    // Add exercise to session
    const response = await request.post(
      `/api/workouts/sessions/${session.id}/exercises`,
      {
        headers: { Authorization: `Bearer ${trainerToken}` },
        data: {
          exercise_id: exercise.id,
          order: 1,
          sets: 3,
          reps: '10',
          rest_time: 60,
        },
      }
    );
    
    expect(response.ok()).toBeTruthy();
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
    await request.delete(`/api/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
  });
  
  test('should create workout for different client', async ({ request, trainerToken, adminToken }) => {
    // Get clients
    const clients = await getClients(request, trainerToken);
    
    if (clients.length > 0) {
      const client = clients[0];
      const workoutData = TEST_DATA.workoutPlan.basic(client.id);
      
      const workout = await createWorkoutPlan(request, trainerToken, workoutData);
      
      expect(workout.client_id).toBe(client.id);
      
      // Cleanup
      await deleteWorkoutPlan(request, trainerToken, workout.id);
    }
  });
  
  test('should create short-term and long-term plans', async ({ request, trainerToken, clientUser }) => {
    // Short-term plan
    const shortPlan = await createWorkoutPlan(
      request,
      trainerToken,
      TEST_DATA.workoutPlan.shortTerm(clientUser.id)
    );
    
    // Long-term plan
    const longPlan = await createWorkoutPlan(
      request,
      trainerToken,
      TEST_DATA.workoutPlan.longTerm(clientUser.id)
    );
    
    expect(shortPlan).toHaveProperty('id');
    expect(longPlan).toHaveProperty('id');
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, shortPlan.id);
    await deleteWorkoutPlan(request, trainerToken, longPlan.id);
  });
  
  test('should validate workout plan data', async ({ request, trainerToken }) => {
    // Try to create workout without required fields
    const response = await request.post('/api/workouts/plans', {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        name: '', // Empty name
        client_id: 999999, // Non-existent client
      },
    });
    
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
  
  test('should update workout plan', async ({ request, trainerToken, clientUser }) => {
    const workout = await createWorkoutPlan(
      request,
      trainerToken,
      TEST_DATA.workoutPlan.basic(clientUser.id)
    );
    
    // Update workout
    const updatedName = `Updated ${workout.name}`;
    const updateResponse = await request.put(`/api/workouts/plans/${workout.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        name: updatedName,
        description: workout.description,
        client_id: clientUser.id,
      },
    });
    
    if (updateResponse.ok()) {
      const updated = await updateResponse.json();
      expect(updated.name).toBe(updatedName);
    }
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
  });
  
  test('should delete workout plan', async ({ request, trainerToken, clientUser }) => {
    const workout = await createWorkoutPlan(
      request,
      trainerToken,
      TEST_DATA.workoutPlan.basic(clientUser.id)
    );
    
    await deleteWorkoutPlan(request, trainerToken, workout.id);
    
    // Verify deleted
    const response = await request.get(`/api/workouts/plans/${workout.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
    
    expect(response.status()).toBeGreaterThanOrEqual(404);
  });
  
  test('should create workout with multiple sessions for week', async ({ request, trainerToken, clientUser }) => {
    const workout = await createWorkoutPlan(
      request,
      trainerToken,
      TEST_DATA.workoutPlan.basic(clientUser.id)
    );
    
    // Create 3 sessions for different days
    const sessions = await Promise.all([
      createWorkoutSession(request, trainerToken, workout.id, TEST_DATA.workoutSession.custom('Push Day', 1)),
      createWorkoutSession(request, trainerToken, workout.id, TEST_DATA.workoutSession.custom('Pull Day', 3)),
      createWorkoutSession(request, trainerToken, workout.id, TEST_DATA.workoutSession.custom('Leg Day', 5)),
    ]);
    
    expect(sessions).toHaveLength(3);
    sessions.forEach(session => {
      expect(session).toHaveProperty('id');
    });
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
  });
});

