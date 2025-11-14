import { randomString, currentDate, futureDate } from '../utils/test-helpers';

/**
 * Test data factory for creating consistent test data
 */

export const TEST_DATA = {
  /**
   * Exercise test data
   */
  exercise: {
    basic: () => ({
      name: `Test Exercise ${randomString()}`,
      description: 'A test exercise for automated testing',
      muscle_group: 'Chest',
      equipment_needed: 'Dumbbells',
      instructions: 'Perform the exercise with proper form',
    }),
    
    byMuscleGroup: (muscleGroup: string) => ({
      name: `${muscleGroup} Exercise ${randomString()}`,
      description: `Test exercise targeting ${muscleGroup}`,
      muscle_group: muscleGroup,
      equipment_needed: 'None (Bodyweight)',
      instructions: 'Focus on the target muscle group',
    }),
    
    withVideo: () => ({
      name: `Video Exercise ${randomString()}`,
      description: 'Exercise with video demonstration',
      muscle_group: 'Back',
      equipment_needed: 'Barbell',
      instructions: 'Follow the video for proper form',
      video_url: 'https://example.com/video.mp4',
    }),
  },
  
  /**
   * Workout plan test data
   */
  workoutPlan: {
    basic: (clientId: number) => ({
      name: `Test Workout Plan ${randomString()}`,
      description: 'A comprehensive workout plan for testing',
      client_id: clientId,
      start_date: currentDate(),
      end_date: futureDate(30),
    }),
    
    shortTerm: (clientId: number) => ({
      name: `Short Plan ${randomString()}`,
      description: '1-week workout plan',
      client_id: clientId,
      start_date: currentDate(),
      end_date: futureDate(7),
    }),
    
    longTerm: (clientId: number) => ({
      name: `Long Term Plan ${randomString()}`,
      description: '3-month training program',
      client_id: clientId,
      start_date: currentDate(),
      end_date: futureDate(90),
    }),
  },
  
  /**
   * Workout session test data
   */
  workoutSession: {
    chest: () => ({
      name: 'Chest Day',
      day_of_week: 1, // Monday
      notes: 'Focus on upper chest development',
    }),
    
    back: () => ({
      name: 'Back Day',
      day_of_week: 3, // Wednesday
      notes: 'Heavy pulling movements',
    }),
    
    legs: () => ({
      name: 'Leg Day',
      day_of_week: 5, // Friday
      notes: 'Full leg workout',
    }),
    
    custom: (name: string, dayOfWeek: number) => ({
      name,
      day_of_week: dayOfWeek,
      notes: `Custom session: ${name}`,
    }),
  },
  
  /**
   * Meal plan test data
   */
  mealPlan: {
    basic: (clientId: number) => ({
      client_id: clientId,
      date: currentDate(),
      title: `Meal Plan ${randomString()}`,
      total_calories: 2000,
      protein_target: 150,
      carb_target: 200,
      fat_target: 60,
      notes: 'Balanced nutrition plan',
    }),
    
    bulking: (clientId: number) => ({
      client_id: clientId,
      date: currentDate(),
      title: `Bulking Plan ${randomString()}`,
      total_calories: 3000,
      protein_target: 200,
      carb_target: 350,
      fat_target: 80,
      notes: 'High-calorie plan for muscle gain',
    }),
    
    cutting: (clientId: number) => ({
      client_id: clientId,
      date: currentDate(),
      title: `Cutting Plan ${randomString()}`,
      total_calories: 1600,
      protein_target: 160,
      carb_target: 120,
      fat_target: 45,
      notes: 'Calorie deficit for fat loss',
    }),
  },
  
  /**
   * Meal entry test data
   */
  mealEntry: {
    breakfast: (orderIndex = 0) => ({
      name: 'Breakfast',
      order_index: orderIndex,
      notes: 'First meal of the day',
    }),
    
    lunch: (orderIndex = 1) => ({
      name: 'Lunch',
      order_index: orderIndex,
      notes: 'Midday meal',
    }),
    
    dinner: (orderIndex = 2) => ({
      name: 'Dinner',
      order_index: orderIndex,
      notes: 'Evening meal',
    }),
    
    snack: (orderIndex = 3) => ({
      name: 'Snack',
      order_index: orderIndex,
      notes: 'Between meals',
    }),
  },
  
  /**
   * Meal component test data
   */
  mealComponent: {
    protein: () => ({
      type: 'protein',
      description: '200g Chicken Breast',
      calories: 330,
      protein: 62,
      carbs: 0,
      fat: 7,
      is_optional: false,
    }),
    
    carb: () => ({
      type: 'carb',
      description: '150g Brown Rice',
      calories: 185,
      protein: 4,
      carbs: 38,
      fat: 2,
      is_optional: false,
    }),
    
    vegetable: () => ({
      type: 'vegetable',
      description: '100g Broccoli',
      calories: 35,
      protein: 3,
      carbs: 7,
      fat: 0,
      is_optional: false,
    }),
    
    fat: () => ({
      type: 'fat',
      description: '15g Olive Oil',
      calories: 135,
      protein: 0,
      carbs: 0,
      fat: 15,
      is_optional: false,
    }),
  },
  
  /**
   * Progress entry test data
   */
  progress: {
    basic: () => ({
      date: currentDate(),
      weight: 75.5,
      notes: 'Weekly check-in',
    }),
    
    withPhotos: () => ({
      date: currentDate(),
      weight: 76.2,
      notes: 'Progress photos included',
    }),
    
    milestone: (weight: number) => ({
      date: currentDate(),
      weight,
      notes: `Reached ${weight}kg milestone!`,
    }),
  },
  
  /**
   * User test data
   */
  user: {
    client: () => ({
      username: `client_${randomString()}`,
      email: `client_${randomString()}@test.com`,
      password: 'Test123!@#',
      full_name: `Test Client ${randomString(4)}`,
      role: 'client',
    }),
    
    trainer: () => ({
      username: `trainer_${randomString()}`,
      email: `trainer_${randomString()}@test.com`,
      password: 'Test123!@#',
      full_name: `Test Trainer ${randomString(4)}`,
      role: 'trainer',
    }),
  },
  
  /**
   * Exercise completion test data
   */
  completion: {
    basic: (workoutExerciseId: number) => ({
      workout_exercise_id: workoutExerciseId,
      actual_sets: 3,
      actual_reps: '10, 10, 8',
      weight_used: '50kg',
      difficulty_rating: 3,
      notes: 'Felt good today',
    }),
    
    heavy: (workoutExerciseId: number) => ({
      workout_exercise_id: workoutExerciseId,
      actual_sets: 4,
      actual_reps: '6, 5, 4, 3',
      weight_used: '100kg',
      difficulty_rating: 5,
      notes: 'Very challenging, need spotter',
    }),
    
    light: (workoutExerciseId: number) => ({
      workout_exercise_id: workoutExerciseId,
      actual_sets: 3,
      actual_reps: '15, 15, 15',
      weight_used: '20kg',
      difficulty_rating: 2,
      notes: 'Light weight for recovery',
    }),
  },
};

/**
 * Muscle group options (matching actual frontend)
 */
export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Core',
  'Lower Back',
  'Glutes',
  'Quadriceps',
  'Hamstrings',
  'Calves',
  'Full Body',
  'Cardio',
  'Flexibility',
] as const;

/**
 * Days of week
 */
export const DAYS_OF_WEEK = [
  { value: 0, name: 'Monday' },
  { value: 1, name: 'Tuesday' },
  { value: 2, name: 'Wednesday' },
  { value: 3, name: 'Thursday' },
  { value: 4, name: 'Friday' },
  { value: 5, name: 'Saturday' },
  { value: 6, name: 'Sunday' },
] as const;

/**
 * Meal types
 */
export const MEAL_TYPES = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'pre_workout',
  'post_workout',
] as const;

/**
 * Component types
 */
export const COMPONENT_TYPES = [
  'protein',
  'carb',
  'fat',
  'vegetable',
  'fruit',
  'other',
] as const;

