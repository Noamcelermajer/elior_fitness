
import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'client' | 'trainer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Static test users
const TEST_USERS: User[] = [
  {
    id: '1',
    name: 'Coach Mike',
    email: 'trainer@test.com',
    role: 'trainer',
    avatar: '👨‍💼'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'client@test.com',
    role: 'client',
    avatar: '👩‍💪'
  }
];

const TEST_CREDENTIALS = [
  { email: 'trainer@test.com', password: 'trainer123' },
  { email: 'client@test.com', password: 'client123' }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string): boolean => {
    const credentials = TEST_CREDENTIALS.find(
      cred => cred.email === email && cred.password === password
    );
    
    if (credentials) {
      const userData = TEST_USERS.find(u => u.email === email);
      if (userData) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Check for stored user on mount
  React.useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user
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
