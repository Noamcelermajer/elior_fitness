// API Configuration
// Production: Uses current domain with /api path
// Development: Uses localhost:8000 (FastAPI directly)

const getApiUrl = () => {
  // Check for environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Production environment - use same domain as frontend
  if (import.meta.env.PROD) {
    // Use the same domain as the frontend, with /api path
    return `${window.location.origin}/api`;
  }
  
  // Development environment - FastAPI runs directly on port 8000
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiUrl();

// Log the API URL being used (for debugging)
console.log('API Base URL:', API_BASE_URL);

// Helper function to make API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('access_token');
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers: defaultHeaders,
  });
};

// API Endpoints
export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  
  // Users
  USERS: '/users/',
  USERS_BY_ID: (id: number) => `/users/${id}`,
  
  // Exercises
  EXERCISES: '/exercises/',
  EXERCISES_BY_ID: (id: number) => `/exercises/${id}`,
  
  // Workouts
  WORKOUT_PLANS: '/workouts/plans',
  WORKOUT_PLANS_BY_ID: (id: number) => `/workouts/plans/${id}`,
  WORKOUT_COMPLETIONS: '/workouts/completions',
  
  // Meal Plans
  MEAL_PLANS: '/meal-plans/',
  MEAL_PLANS_BY_ID: (id: number) => `/meal-plans/${id}`,
  
  // Progress
  PROGRESS: '/progress/',
  PROGRESS_BY_ID: (id: number) => `/progress/${id}`,
  
  // Notifications
  NOTIFICATIONS: '/notifications/',
  NOTIFICATIONS_BY_ID: (id: number) => `/notifications/${id}`,
  NOTIFICATIONS_MARK_READ: (id: number) => `/notifications/${id}/mark-read`,
  
  // System
  SYSTEM_HEALTH: '/system/health',
  SYSTEM_STATS: '/system/stats',
};

// API Headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// API Error Handling
export const handleApiError = (response: Response) => {
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response;
}; 