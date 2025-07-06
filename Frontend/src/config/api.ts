// Environment-aware API base URL
export const getApiBaseUrl = (): string => {
  // Check for environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Check if we're in production (HTTPS)
  if (window.location.protocol === 'https:') {
    // In production, use the same domain with /api path
    return `${window.location.origin}/api`;
  }
  
  // Development fallback - use the same port as the frontend since Nginx proxies API calls
  return `${window.location.origin}/api`;
};

export const API_BASE_URL = getApiBaseUrl();

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