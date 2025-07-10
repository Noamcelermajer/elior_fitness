import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

export type UserRole = 'admin' | 'trainer' | 'client';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to get stored token
  const getToken = (): string | null => {
    return localStorage.getItem('access_token');
  };

  // Function to set token
  const setToken = (token: string): void => {
    localStorage.setItem('access_token', token);
  };

  // Function to remove token
  const removeToken = (): void => {
    localStorage.removeItem('access_token');
  };

  // Function to decode JWT token and get expiration
  const decodeToken = (token: string): any => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  // Function to check if token is expired or will expire soon (within 5 minutes)
  const isTokenExpired = (token: string): boolean => {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - now;
    
    // Consider token expired if it expires within 5 minutes
    return expiresIn < 300;
  };

  // Function to refresh token
  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    return false;
  };

  // Function to fetch current user data
  const fetchCurrentUser = async (): Promise<User | null> => {
    const token = getToken();
    if (!token) return null;

    // Check if token is expired or will expire soon
    if (isTokenExpired(token)) {
      const refreshed = await refreshToken();
      if (!refreshed) {
        removeToken();
        return null;
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        return userData;
      } else if (response.status === 401) {
        // Token is invalid, try to refresh
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry the request with new token
          const retryResponse = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${getToken()}`,
              'Content-Type': 'application/json',
            },
          });
          if (retryResponse.ok) {
            const userData = await retryResponse.json();
            return userData;
          }
        }
        removeToken();
        return null;
      } else {
        removeToken();
        return null;
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      removeToken();
      return null;
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting login with API URL:', `${API_BASE_URL}/auth/login`);
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      console.log('Login response status:', response.status);
      console.log('Login response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('Login successful, token received:', data);
        setToken(data.access_token);
        
        // Fetch user data
        const userData = await fetchCurrentUser();
        console.log('User data fetched:', userData);
        if (userData) {
          setUser(userData);
          console.log('User set in context:', userData);
          return true;
        }
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Login failed:', errorData);
        console.error('Response status:', response.status);
        console.error('Response status text:', response.statusText);
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    removeToken();
  };

  // Check for stored token and fetch user data on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getToken();
      if (token) {
        const userData = await fetchCurrentUser();
        setUser(userData);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Set up periodic token refresh (every 20 minutes)
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      const token = getToken();
      if (token && isTokenExpired(token)) {
        const refreshed = await refreshToken();
        if (!refreshed) {
          logout();
        }
      }
    }, 20 * 60 * 1000); // 20 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
