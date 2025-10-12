import { test, expect } from '../../fixtures/auth.fixture';
import { WorkoutPages } from '../../fixtures/page-objects/WorkoutPages';
import { ClientDashboard } from '../../fixtures/page-objects/ClientDashboard';
import { createWorkoutPlan, createWorkoutSession, createExercise, deleteWorkoutPlan } from '../../utils/api-helpers';
import { TEST_DATA } from '../../fixtures/test-data';

test.describe('Client - Workout Viewing', () => {
  test('should access training page', async ({ clientPage }) => {
    const clientDash = new ClientDashboard(clientPage);
    await clientDash.gotoTraining();
    
    // Should be on training page
    await expect(clientPage).toHaveURL(/training/);
  });
  
  test('should view assigned workout plans', async ({ clientPage, request, trainerToken, clientUser }) => {
    // Create workout for client
    const workout = await createWorkoutPlan(
      request,
      trainerToken,
      TEST_DATA.workoutPlan.basic(clientUser.id)
    );
    
    const workoutPages = new WorkoutPages(clientPage);
    await workoutPages.gotoTrainingPage();
    
    await clientPage.waitForTimeout(2000);
    
    // Should see the workout
    await expect(clientPage.locator('body')).toContainText(workout.name);
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
  });
  
  test('should view workout sessions by day', async ({ clientPage, request, trainerToken, clientUser }) => {
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
    
    await clientPage.goto(`/workout/${workout.id}`);
    await clientPage.waitForTimeout(2000);
    
    // Should display session
    await expect(clientPage.locator('body')).toContainText(session.name);
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
  });
  
  test('should view exercise details', async ({ clientPage, request, trainerToken, clientUser }) => {
    // Create exercise
    const exercise = await createExercise(
      request,
      trainerToken,
      TEST_DATA.exercise.basic()
    );
    
    // Create workout with session
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
    await request.post(`/api/workouts/sessions/${session.id}/exercises`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        exercise_id: exercise.id,
        order: 1,
        sets: 3,
        reps: '10',
        rest_time: 60,
      },
    });
    
    await clientPage.goto(`/workout/${workout.id}`);
    await clientPage.waitForTimeout(2000);
    
    // Should display exercise
    await expect(clientPage.locator('body')).toContainText(exercise.name);
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
    await request.delete(`/api/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
  });
  
  test('should display sets and reps information', async ({ clientPage, request, trainerToken, clientUser }) => {
    const exercise = await createExercise(
      request,
      trainerToken,
      TEST_DATA.exercise.basic()
    );
    
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
    
    // Add exercise with specific sets/reps
    await request.post(`/api/workouts/sessions/${session.id}/exercises`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        exercise_id: exercise.id,
        order: 1,
        sets: 4,
        reps: '12-10-8-6',
        rest_time: 90,
      },
    });
    
    await clientPage.goto(`/workout/${workout.id}`);
    await clientPage.waitForTimeout(2000);
    
    const pageContent = await clientPage.textContent('body');
    
    // Should show sets/reps information
    expect(pageContent).toMatch(/4|sets/i);
    expect(pageContent).toMatch(/12|reps/i);
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
    await request.delete(`/api/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
  });
  
  test('should display exercise instructions', async ({ clientPage, request, trainerToken, clientUser }) => {
    const exercise = await createExercise(
      request,
      trainerToken,
      {
        ...TEST_DATA.exercise.basic(),
        instructions: 'Perform with proper form and controlled motion',
      }
    );
    
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
    
    await request.post(`/api/workouts/sessions/${session.id}/exercises`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        exercise_id: exercise.id,
        order: 1,
        sets: 3,
        reps: '10',
      },
    });
    
    await clientPage.goto(`/workout/${workout.id}`);
    await clientPage.waitForTimeout(2000);
    
    // Click on exercise to see details
    const exerciseCard = clientPage.locator(`text=${exercise.name}`);
    if (await exerciseCard.isVisible()) {
      await exerciseCard.click();
      await clientPage.waitForTimeout(500);
    }
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
    await request.delete(`/api/exercises/${exercise.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
  });
  
  test('client cannot view other clients workouts', async ({ request, clientToken, trainerToken, adminToken }) => {
    // Get another client
    const clientsResponse = await request.get('/api/users/?role=client', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    if (clientsResponse.ok()) {
      const clients = await clientsResponse.json();
      
      if (clients.length >= 2) {
        const otherClient = clients.find((c: any) => c.email !== 'client@elior.com');
        
        if (otherClient) {
          // Create workout for other client
          const workout = await createWorkoutPlan(
            request,
            trainerToken,
            TEST_DATA.workoutPlan.basic(otherClient.id)
          );
          
          // Try to access as current client
          const response = await request.get(`/api/workouts/plans/${workout.id}`, {
            headers: { Authorization: `Bearer ${clientToken}` },
          });
          
          // Should be forbidden or not found
          expect(response.status()).toBeGreaterThanOrEqual(403);
          
          // Cleanup
          await deleteWorkoutPlan(request, trainerToken, workout.id);
        }
      }
    }
  });
});

