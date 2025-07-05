import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, Target, Utensils, TrendingUp, Plus, Calendar, Clock, CheckCircle, Users, Trophy, Flame, UserPlus, Shield, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: ''
  });
  const [loading, setLoading] = useState(false);

  // --- New state for real stats ---
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTrainers: 0,
    totalClients: 0,
    systemHealth: '100%',
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      setStatsError('');
      try {
        const token = localStorage.getItem('access_token');
        // Fetch all users
        const usersRes = await fetch('http://localhost:8000/api/users/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const trainersRes = await fetch('http://localhost:8000/api/users/trainers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const clientsRes = await fetch('http://localhost:8000/api/users/clients', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!usersRes.ok || !trainersRes.ok || !clientsRes.ok) {
          throw new Error('Failed to fetch user stats');
        }
        const users = await usersRes.json();
        const trainers = await trainersRes.json();
        const clients = await clientsRes.json();
        setStats({
          totalUsers: users.length,
          totalTrainers: trainers.length,
          totalClients: clients.length,
          systemHealth: '100%', // Placeholder, can be dynamic if backend provides
        });
      } catch (err: any) {
        setStatsError(err.message || 'Failed to load stats');
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statsCards = [
    {
      label: 'Total Users',
      value: '156',
      icon: Users,
      gradient: 'bg-gradient-to-r from-blue-500 to-blue-600',
    },
    {
      label: 'Active Trainers',
      value: '23',
      icon: Shield,
      gradient: 'bg-gradient-to-r from-green-500 to-green-600',
    },
    {
      label: 'Total Clients',
      value: '133',
      icon: Users,
      gradient: 'bg-gradient-to-r from-purple-500 to-purple-600',
    },
    {
      label: 'System Health',
      value: '100%',
      icon: CheckCircle,
      gradient: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    },
  ];

  const recentActivity = [
    {
      title: 'New trainer registered: Coach Sarah',
      description: 'Sarah Johnson joined the platform',
      time: '2 hours ago',
      icon: UserPlus,
      color: 'bg-gradient-to-tr from-green-500 to-green-700',
    },
    {
      title: 'System maintenance completed',
      description: 'Database optimization successful',
      time: 'Yesterday',
      icon: Settings,
      color: 'bg-gradient-to-tr from-blue-500 to-blue-700',
    },
    {
      title: 'New client registration',
      description: 'Mike Davis joined as a client',
      time: '3 days ago',
      icon: Users,
      color: 'bg-gradient-to-tr from-purple-500 to-purple-700',
    },
  ];

  const handleRegisterTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/auth/register/trainer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...registerForm,
          role: 'trainer'
        }),
      });

      if (response.ok) {
        alert('Trainer registered successfully!');
        setIsRegisterDialogOpen(false);
        setRegisterForm({ username: '', email: '', password: '', full_name: '' });
      } else {
        const errorData = await response.json();
        alert(`Registration failed: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout currentPage="dashboard">
      <div className="pb-20 lg:pb-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-6 lg:py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gradient">
                  Admin Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage users, monitor system health, and oversee platform operations
                </p>
              </div>
              <div className="flex space-x-3">
                <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="gradient-orange hover:gradient-orange-dark text-background font-semibold transform hover:scale-105 transition-all duration-200 shadow-lg"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Register Trainer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Register New Trainer</DialogTitle>
                      <DialogDescription>
                        Create a new trainer account. Fill in the details below.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRegisterTrainer} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={registerForm.username}
                          onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                          placeholder="Enter username"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={registerForm.email}
                          onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                          placeholder="Enter email"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          value={registerForm.full_name}
                          onChange={(e) => setRegisterForm({...registerForm, full_name: e.target.value})}
                          placeholder="Enter full name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                          placeholder="Enter password"
                          required
                        />
                      </div>
                      <div className="flex space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsRegisterDialogOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 gradient-orange text-background"
                          disabled={loading}
                        >
                          {loading ? 'Registering...' : 'Register Trainer'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="outline" 
                  className="font-semibold transform hover:scale-105 transition-all duration-200"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  System Settings
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Users */}
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 border-0 shadow-xl transform hover:scale-105 transition-all duration-300">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl lg:text-3xl font-bold text-background">
                      {statsLoading ? '...' : stats.totalUsers}
                    </p>
                    <p className="text-background/80 text-xs lg:text-sm font-medium">Total Users</p>
                  </div>
                  <Users className="w-8 h-8 lg:w-10 lg:h-10 text-background/90" />
                </div>
              </CardContent>
            </Card>
            {/* Active Trainers */}
            <Card className="bg-gradient-to-r from-green-500 to-green-600 border-0 shadow-xl transform hover:scale-105 transition-all duration-300">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl lg:text-3xl font-bold text-background">
                      {statsLoading ? '...' : stats.totalTrainers}
                    </p>
                    <p className="text-background/80 text-xs lg:text-sm font-medium">Active Trainers</p>
                  </div>
                  <Shield className="w-8 h-8 lg:w-10 lg:h-10 text-background/90" />
                </div>
              </CardContent>
            </Card>
            {/* Total Clients */}
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 border-0 shadow-xl transform hover:scale-105 transition-all duration-300">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl lg:text-3xl font-bold text-background">
                      {statsLoading ? '...' : stats.totalClients}
                    </p>
                    <p className="text-background/80 text-xs lg:text-sm font-medium">Total Clients</p>
                  </div>
                  <Users className="w-8 h-8 lg:w-10 lg:h-10 text-background/90" />
                </div>
              </CardContent>
            </Card>
            {/* System Health */}
            <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 border-0 shadow-xl transform hover:scale-105 transition-all duration-300">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl lg:text-3xl font-bold text-background">
                      {stats.systemHealth}
                    </p>
                    <p className="text-background/80 text-xs lg:text-sm font-medium">System Health</p>
                  </div>
                  <CheckCircle className="w-8 h-8 lg:w-10 lg:h-10 text-background/90" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Management Section */}
            <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-foreground">
                  <Users className="w-5 h-5 text-primary" />
                  <span>User Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-foreground">
                    {statsLoading ? '...' : `${stats.totalUsers} Total Users`}
                  </span>
                  <Badge className="gradient-orange text-background">
                    {statsLoading ? '...' : `${stats.totalTrainers} Trainers`}
                  </Badge>
                </div>
                <Progress value={stats.totalUsers ? Math.round((stats.totalTrainers / stats.totalUsers) * 100) : 0} className="h-3 bg-secondary" />
                <Button 
                  onClick={() => navigate('/users')}
                  className="w-full gradient-orange text-background font-semibold transform hover:scale-105 transition-all duration-200"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
              </CardContent>
            </Card>

            {/* System Health Section */}
            <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-foreground">
                  <Shield className="w-5 h-5 text-green-500" />
                  <span>System Health</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-foreground">
                    100% Uptime
                  </span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    All Systems OK
                  </Badge>
                </div>
                <Progress value={100} className="h-3 bg-secondary" />
                <Button 
                  onClick={() => navigate('/system')}
                  className="w-full bg-green-500 hover:bg-green-600 text-background font-semibold transform hover:scale-105 transition-all duration-200"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  View System Status
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <span>Recent System Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-secondary/30 rounded-xl border border-border/30 hover:bg-secondary/50 transition-colors">
                    <div className={`w-10 h-10 rounded-full ${activity.color} flex items-center justify-center shadow-lg`}>
                      <activity.icon className="w-5 h-5 text-background" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {statsError && (
            <div className="text-red-500 font-semibold text-center mt-4">{statsError}</div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard; 