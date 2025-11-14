import { devices, expect } from '@playwright/test';
import { test, TEST_USERS } from '../fixtures/auth.fixture';

test.describe('Workout Plan V2 Flow', () => {
  test('trainer maintains single plan and client sees responsive layout', async ({
    request,
    trainerToken,
    trainerUser,
    clientUser,
    trainerPage,
    browser,
  }) => {
    const timestamp = Date.now();
    const exercisePayload = {
      name: `דחיקת כתף אוטומציה ${timestamp}`,
      description: 'תרגיל בדיקה אוטומטי לכתפיים',
      muscle_group: 'shoulders',
      equipment_needed: 'Dumbbells',
      instructions: 'שמור על מרפקים מעט לפני הגוף ודחוף כלפי מעלה.',
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      category: 'בדיקות',
    };

    const exerciseResponse = await request.post('/api/exercises/', {
      headers: {
        Authorization: `Bearer ${trainerToken}`,
      },
      data: exercisePayload,
    });

    expect(exerciseResponse.ok()).toBeTruthy();
    const exercise = await exerciseResponse.json();

    const exercise2Payload = {
      name: `לחיצת חזה בדיקה ${timestamp}`,
      description: 'תרגיל בדיקה נוסף לחזה',
      muscle_group: 'chest',
      equipment_needed: 'Machine',
      instructions: 'שמור על שליטה מלאה בתנועה.',
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      category: 'בדיקות',
    };

    const exercise2Response = await request.post('/api/exercises/', {
      headers: {
        Authorization: `Bearer ${trainerToken}`,
      },
      data: exercise2Payload,
    });

    expect(exercise2Response.ok()).toBeTruthy();
    const exercise2 = await exercise2Response.json();

    const planName = `תוכנית אוטומציה ${timestamp}`;
    const planResponse = await request.post('/api/v2/workouts/plans/complete', {
      headers: {
        Authorization: `Bearer ${trainerToken}`,
      },
      data: {
        client_id: clientUser.id,
        name: planName,
        description: 'תוכנית אימון לאימות זרימת עבודה',
        split_type: 'push_pull_legs',
        days_per_week: 3,
        duration_weeks: 4,
        notes: 'תוכנית שנוצרה על ידי בדיקות אוטומציה',
        workout_days: [
          {
            name: 'Push Day QA',
            day_type: 'push',
            order_index: 0,
            notes: 'התמקדות בלחיצות ודחיפות',
            estimated_duration: 55,
            exercises: [
              {
                exercise_id: exercise.id,
                order_index: 0,
                group_name: 'Superset QA',
                target_sets: 3,
                target_reps: '10-12',
                target_weight: 20,
                rest_seconds: 90,
                tempo: '2-1-2',
                notes: 'שמור על כתפיים לאחור',
                video_url: exercise.video_url,
              },
              {
                exercise_id: exercise2.id,
                order_index: 1,
                group_name: 'Superset QA',
                target_sets: 3,
                target_reps: '12-15',
                target_weight: 30,
                rest_seconds: 60,
                tempo: '2-0-2',
                notes: 'לדחוף דרך החזה',
                video_url: exercise2.video_url,
              },
            ],
          },
        ],
      },
    });

    if (!planResponse.ok()) {
      console.error('plan creation failed', planResponse.status(), await planResponse.text());
    }
    expect(planResponse.ok()).toBeTruthy();

    await trainerPage.goto(`/client/${clientUser.id}`);
    await expect(trainerPage.locator('[data-testid="workout-plan-card"]')).toHaveCount(1);
    await expect(trainerPage.locator('[data-testid="workout-plan-card"]')).toContainText(planName);
    await expect(trainerPage.locator('[data-testid="workout-plan-action"]')).toHaveText(
      /עדכן תוכנית אימון/,
    );

    const mobileContext = await browser.newContext(devices['Pixel 5']);
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto('/login');
    await mobilePage.fill('input#username', TEST_USERS.client.username);
    await mobilePage.fill('input#password', TEST_USERS.client.password);
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

    await mobilePage.goto('/training');
    await mobilePage.waitForSelector('[data-testid="training-day-tabs"]', { timeout: 15000 });

    await expect(
      mobilePage.locator('[data-testid="training-day-tabs"] button[role="tab"]'),
    ).toHaveCount(1);
    await expect(mobilePage.locator('[data-testid="training-exercise-card"]')).toHaveCount(2);
    await expect(mobilePage.locator('[data-testid="training-exercise-card"]')).toContainText(exercisePayload.name);
    await expect(mobilePage.locator('[data-testid="training-exercise-card"]')).toContainText(exercise2Payload.name);
    const groupLocator = mobilePage.locator(
      '[data-testid="exercise-group"][data-group-name="Superset QA"]',
    );
    await expect(groupLocator).toBeVisible();
    await expect(groupLocator.locator('[data-testid="training-exercise-card"]')).toHaveCount(2);

    await mobileContext.close();
  });
});


