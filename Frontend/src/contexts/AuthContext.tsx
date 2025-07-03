import React, { createContext, useContext, useState, useEffect } from 'react';

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

// API base URL - adjust this based on your backend configuration
const API_BASE_URL = 'http://localhost:8000/api';

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

  // Function to fetch current user data
  const fetchCurrentUser = async (): Promise<User | null> => {
    const token = getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        return userData;
      } else {
        // Token is invalid, remove it
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
        const errorData = await response.json();
        console.error('Login failed:', errorData);
      }
    } catch (error) {
      console.error('Login error:', error);
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

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      loading
    }}>
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
