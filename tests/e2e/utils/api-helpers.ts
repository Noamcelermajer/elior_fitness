import { APIRequestContext, expect } from '@playwright/test';

/**
 * API helper utilities for direct API testing and data setup
 */

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'trainer' | 'client';
  is_active: boolean;
}

/**
 * Login via API and get access token
 */
export async function loginApi(
  request: APIRequestContext,
  username: string,
  password: string
): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: {
      username,
      password,
    },
  });
  
  expect(response.ok()).toBeTruthy();
  const data: LoginResponse = await response.json();
  return data.access_token;
}

/**
 * Get current user info
 */
export async function getCurrentUser(
  request: APIRequestContext,
  token: string
): Promise<UserInfo> {
  const response = await request.get('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

/**
 * Create exercise via API
 */
export async function createExercise(
  request: APIRequestContext,
  token: string,
  data: {
    name: string;
    description: string;
    muscle_group: string;
    equipment_needed?: string;
    instructions?: string;
  }
) {
  const response = await request.post('/api/exercises/', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data,
  });
  
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

/**
 * Create workout plan via API
 */
export async function createWorkoutPlan(
  request: APIRequestContext,
  token: string,
  data: {
    name: string;
    description: string;
    client_id: number;
    start_date?: string;
    end_date?: string;
  }
) {
  const response = await request.post('/api/workouts/plans', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data,
  });
  
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

/**
 * Create workout session via API
 */
export async function createWorkoutSession(
  request: APIRequestContext,
  token: string,
  planId: number,
  data: {
    name: string;
    day_of_week: number;
    notes?: string;
  }
) {
  const response = await request.post(`/api/workouts/plans/${planId}/sessions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data,
  });
  
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

/**
 * Get workout plan details
 */
export async function getWorkoutPlan(
  request: APIRequestContext,
  token: string,
  planId: number
) {
  const response = await request.get(`/api/workouts/plans/${planId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

/**
 * Delete workout plan
 */
export async function deleteWorkoutPlan(
  request: APIRequestContext,
  token: string,
  planId: number
) {
  const response = await request.delete(`/api/workouts/plans/${planId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  expect(response.ok()).toBeTruthy();
}

/**
 * Create meal plan via API
 */
export async function createMealPlan(
  request: APIRequestContext,
  token: string,
  data: {
    client_id: number;
    date: string;
    title?: string;
    total_calories?: number;
    protein_target?: number;
    carb_target?: number;
    fat_target?: number;
    notes?: string;
  }
) {
  const response = await request.post('/api/meal-plans/', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data,
  });
  
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

/**
 * Create meal entry via API
 */
export async function createMealEntry(
  request: APIRequestContext,
  token: string,
  planId: number,
  data: {
    name: string;
    order_index: number;
    notes?: string;
  }
) {
  const response = await request.post(`/api/meal-plans/${planId}/entries`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data,
  });
  
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

/**
 * Delete meal plan
 */
export async function deleteMealPlan(
  request: APIRequestContext,
  token: string,
  planId: number
) {
  const response = await request.delete(`/api/meal-plans/${planId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  expect(response.ok()).toBeTruthy();
}

/**
 * Get user's clients (for trainers)
 */
export async function getClients(
  request: APIRequestContext,
  token: string
): Promise<UserInfo[]> {
  const response = await request.get('/api/users/?role=client', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

/**
 * Create progress entry via API
 */
export async function createProgressEntry(
  request: APIRequestContext,
  token: string,
  data: {
    date: string;
    weight: number;
    notes?: string;
  }
) {
  const response = await request.post('/api/progress/weight', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data,
  });
  
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

/**
 * Health check
 */
export async function healthCheck(request: APIRequestContext): Promise<boolean> {
  try {
    const response = await request.get('/health');
    return response.ok();
  } catch {
    return false;
  }
}

/**
 * Generic API call helper
 */
export async function apiCall<T = any>(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  options?: {
    token?: string;
    data?: any;
    params?: Record<string, string>;
  }
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  
  let url = endpoint;
  if (options?.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }
  
  const response = await request.fetch(url, {
    method,
    headers,
    data: options?.data,
  });
  
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

