import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, User, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UserLoginInfo {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name: string;
}

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<UserLoginInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { login } = useAuth();

  // Fetch registered users from the server
  const fetchRegisteredUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('http://localhost:8000/api/auth/registered-users');
      if (response.ok) {
        const users = await response.json();
        setRegisteredUsers(users);
      } else {
        console.error('Failed to fetch registered users');
      }
    } catch (error) {
      console.error('Error fetching registered users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchRegisteredUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await login(username, password);
      if (!success) {
        setError('Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-gradient-to-r from-red-500 to-red-600';
      case 'trainer':
        return 'gradient-orange';
      case 'client':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRoleDisplayName = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 gradient-orange rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl transform hover:scale-110 transition-transform duration-300">
            <Dumbbell className="w-10 h-10 text-background" />
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">FitTrainer Pro</h1>
          <p className="text-muted-foreground">Welcome back to your fitness journey</p>
        </div>

        {/* Login Form */}
        <Card className="glass-effect border-border/50 shadow-2xl transform hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground font-medium">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border/50 focus:border-primary transition-colors"
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-secondary/50 border-border/50 focus:border-primary transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="text-destructive text-sm font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full gradient-orange hover:gradient-orange-dark text-background font-semibold h-12 transform hover:scale-105 transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Registered Users */}
        <Card className="mt-6 glass-effect border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-foreground">Registered Users</CardTitle>
                <CardDescription>Available users for testing the application</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchRegisteredUsers}
                disabled={loadingUsers}
                className="hover:bg-secondary/50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <span className="ml-2 text-muted-foreground">Loading users...</span>
              </div>
            ) : registeredUsers.length > 0 ? (
              registeredUsers.map((user, index) => (
                <div key={user.id} className="p-4 bg-secondary/30 rounded-xl border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={
                      getRoleColor(user.role) === 'gradient-orange' ? 'gradient-orange text-background' : 
                      getRoleColor(user.role) === 'bg-gradient-to-r from-red-500 to-red-600' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                      `${getRoleColor(user.role)} text-white`
                    }>
                      {getRoleDisplayName(user.role)}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> <span className="text-foreground font-medium">{user.full_name}</span></p>
                    <p><span className="text-muted-foreground">Username:</span> <span className="text-foreground font-mono">{user.username}</span></p>
                    <p><span className="text-muted-foreground">Email:</span> <span className="text-foreground font-mono">{user.email}</span></p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Note: Passwords are not displayed for security reasons
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No registered users found</p>
                <p className="text-sm">Please register users through the admin panel</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
