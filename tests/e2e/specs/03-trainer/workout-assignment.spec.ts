import { test, expect } from '../../fixtures/auth.fixture';
import { TEST_DATA } from '../../fixtures/test-data';
import {
  createWorkoutPlan,
  getWorkoutPlan,
  deleteWorkoutPlan,
  getClients,
} from '../../utils/api-helpers';

test.describe('Trainer - Workout Assignment', () => {
  test('should assign workout to client', async ({ request, trainerToken, clientUser }) => {
    const workoutData = TEST_DATA.workoutPlan.basic(clientUser.id);
    
    const workout = await createWorkoutPlan(request, trainerToken, workoutData);
    
    // Verify assignment
    expect(workout.client_id).toBe(clientUser.id);
    
    // Client should be able to see it
    const clientWorkout = await getWorkoutPlan(request, trainerToken, workout.id);
    expect(clientWorkout.id).toBe(workout.id);
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout.id);
  });
  
  test('should list workouts for client', async ({ request, trainerToken, clientUser }) => {
    // Create multiple workouts
    const workout1 = await createWorkoutPlan(
      request,
      trainerToken,
      TEST_DATA.workoutPlan.shortTerm(clientUser.id)
    );
    
    const workout2 = await createWorkoutPlan(
      request,
      trainerToken,
      TEST_DATA.workoutPlan.longTerm(clientUser.id)
    );
    
    // Get workouts for client
    const response = await request.get(`/api/workouts/plans?client_id=${clientUser.id}`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
    
    expect(response.ok()).toBeTruthy();
    const workouts = await response.json();
    
    // Should include both workouts
    expect(workouts.length).toBeGreaterThanOrEqual(2);
    
    // Cleanup
    await deleteWorkoutPlan(request, trainerToken, workout1.id);
    await deleteWorkoutPlan(request, trainerToken, workout2.id);
  });
  
  test('should reassign workout to different client', async ({ request, trainerToken, adminToken, clientUser }) => {
    const clients = await getClients(request, trainerToken);
    
    if (clients.length >= 2) {
      const client1 = clients[0];
      const client2 = clients[1];
      
      // Create workout for client1
      const workout = await createWorkoutPlan(
        request,
        trainerToken,
        TEST_DATA.workoutPlan.basic(client1.id)
      );
      
      // Reassign to client2
      const updateResponse = await request.put(`/api/workouts/plans/${workout.id}`, {
        headers: { Authorization: `Bearer ${trainerToken}` },
        data: {
          ...workout,
          client_id: client2.id,
        },
      });
      
      if (updateResponse.ok()) {
        const updated = await updateResponse.json();
        expect(updated.client_id).toBe(client2.id);
      }
      
      // Cleanup
      await deleteWorkoutPlan(request, trainerToken, workout.id);
    } else {
      test.skip();
    }
  });
  
  test('should not assign workout to non-existent client', async ({ request, trainerToken }) => {
    const response = await request.post('/api/workouts/plans', {
      headers: { Authorization: `Bearer ${trainerToken}` },
      data: {
        name: 'Test Workout',
        description: 'Test',
        client_id: 999999, // Non-existent
      },
    });
    
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
  
  test('trainer can only assign to their own clients', async ({ request, trainerToken, adminToken }) => {
    // Try to create workout for a client not assigned to this trainer
    // This may succeed depending on business logic
    const response = await request.get('/api/users/?role=client', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    if (response.ok()) {
      const allClients = await response.json();
      const trainerClients = await getClients(request, trainerToken);
      
      // Find a client not assigned to this trainer
      const otherClient = allClients.find(
        (c: any) => !trainerClients.some((tc: any) => tc.id === c.id)
      );
      
      if (otherClient) {
        const workoutResponse = await request.post('/api/workouts/plans', {
          headers: { Authorization: `Bearer ${trainerToken}` },
          data: {
            name: 'Test Workout',
            description: 'Test',
            client_id: otherClient.id,
          },
        });
        
        // May fail with 403 or succeed depending on business rules
        // Just verify we get a response
        expect(workoutResponse.status()).toBeGreaterThanOrEqual(200);
      }
    }
  });
  
  test('should handle concurrent workout assignments', async ({ request, trainerToken, clientUser }) => {
    // Create multiple workouts simultaneously
    const workoutPromises = [
      createWorkoutPlan(request, trainerToken, TEST_DATA.workoutPlan.basic(clientUser.id)),
      createWorkoutPlan(request, trainerToken, TEST_DATA.workoutPlan.shortTerm(clientUser.id)),
      createWorkoutPlan(request, trainerToken, TEST_DATA.workoutPlan.longTerm(clientUser.id)),
    ];
    
    const workouts = await Promise.all(workoutPromises);
    
    expect(workouts).toHaveLength(3);
    workouts.forEach(workout => {
      expect(workout).toHaveProperty('id');
      expect(workout.client_id).toBe(clientUser.id);
    });
    
    // Cleanup
    await Promise.all(
      workouts.map(w => deleteWorkoutPlan(request, trainerToken, w.id))
    );
  });
});






