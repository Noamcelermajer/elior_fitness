import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dumbbell, Target, Utensils, TrendingUp, Plus, Calendar, Clock, 
  CheckCircle, Users, Trophy, Flame, UserPlus, Activity, 
  Search, Filter, Eye, Edit, Trash2, PlusCircle, Weight, Camera
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

interface Client {
  id: number;
  username: string;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  profile?: {
    weight?: number;
    height?: number;
    goals?: string;
    injuries?: string;
    preferences?: string;
  };
}

interface Exercise {
  id: number;
  name: string;
  description: string;
  muscle_group: string;
  equipment_needed?: string;
  instructions?: string;
  video_url?: string;
  created_by: number;
}

interface WorkoutPlan {
  id: number;
  name: string;
  client_id: number;
  client_name: string;
  created_at: string;
  sessions_count: number;
  completed_sessions: number;
}

interface MealPlan {
  id: number;
  title: string;
  client_id: number;
  client_name: string;
  total_calories: number;
  created_at: string;
  meals_count: number;
}

interface ProgressEntry {
  id: number;
  client_id: number;
  client_name: string;
  weight?: number;
  body_fat?: number;
  photo_path?: string;
  notes?: string;
  recorded_at: string;
}

const TrainerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [clients, setClients] = useState<Client[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingExercises, setLoadingExercises] = useState(false);
  
  // Search and filter states
  const [clientSearch, setClientSearch] = useState('');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('all');

  // Client registration states
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'client'
  });
  const [registerLoading, setRegisterLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalExercises: 0,
    totalWorkoutPlans: 0,
    totalMealPlans: 0,
    completionRate: 0
  });

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch all data in parallel
      const [clientsRes, exercisesRes, workoutPlansRes, mealPlansRes, progressRes] = await Promise.all([
        fetch(`${API_BASE_URL}/users/?role=client`, { headers }),
        fetch(`${API_BASE_URL}/exercises/`, { headers }),
        fetch(`${API_BASE_URL}/workouts/plans`, { headers }),
        fetch(`${API_BASE_URL}/meal-plans/`, { headers }),
        fetch(`${API_BASE_URL}/progress/`, { headers })
      ]);

      const clientsData = clientsRes.ok ? await clientsRes.json() : [];
      const exercisesData = exercisesRes.ok ? await exercisesRes.json() : [];
      const workoutPlansData = workoutPlansRes.ok ? await workoutPlansRes.json() : [];
      const mealPlansData = mealPlansRes.ok ? await mealPlansRes.json() : [];
      const progressData = progressRes.ok ? await progressRes.json() : [];

      setClients(clientsData);
      setExercises(exercisesData);
      setWorkoutPlans(workoutPlansData);
      setMealPlans(mealPlansData);
      setProgressEntries(progressData);

      // Calculate stats
      const activeClients = clientsData.filter((c: Client) => c.is_active).length;
      const totalCompletions = workoutPlansData.reduce((sum: number, plan: WorkoutPlan) => sum + plan.completed_sessions, 0);
      const totalSessions = workoutPlansData.reduce((sum: number, plan: WorkoutPlan) => sum + plan.sessions_count, 0);
      const completionRate = totalSessions > 0 ? (totalCompletions / totalSessions) * 100 : 0;

      setStats({
        totalClients: clientsData.length,
        activeClients,
        totalExercises: exercisesData.length,
        totalWorkoutPlans: workoutPlansData.length,
        totalMealPlans: mealPlansData.length,
        completionRate: Math.min(completionRate, 100)
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredExercises = exercises.filter(exercise =>
    exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) &&
    (selectedMuscleGroup === 'all' || exercise.muscle_group === selectedMuscleGroup)
  );

  const muscleGroups = [...new Set(exercises.map(e => e.muscle_group))];

  const handleClientClick = (client: Client) => {
    navigate(`/client/${client.id}`, { state: { client } });
  };

  const handleCreateExercise = () => {
    navigate('/create-exercise');
  };

  const handleCreateWorkout = (client?: Client) => {
    if (client) {
      navigate('/create-workout', { state: { client } });
    } else {
      navigate('/create-workout');
    }
  };

  const handleCreateMealPlan = (client?: Client) => {
    if (client) {
      navigate('/create-meal-plan', { state: { client } });
    } else {
      navigate('/create-meal-plan');
    }
  };

  const handleViewProgress = (client: Client) => {
    navigate(`/client/${client.id}/progress`, { state: { client } });
  };

  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/auth/register/client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(registerForm),
      });

      if (response.ok) {
        const newClient = await response.json();
        
        // Add the new client to the local state
        setClients(prevClients => [...prevClients, newClient]);
        
        // Update stats
        setStats(prevStats => ({
          ...prevStats,
          totalClients: prevStats.totalClients + 1,
          activeClients: prevStats.activeClients + 1
        }));

        // Close dialog and reset form
        setRegisterDialogOpen(false);
        setRegisterForm({
          username: '',
          email: '',
          password: '',
          full_name: '',
          role: 'client'
        });

        // Show success message (you can add a toast notification here)
        alert('Client registered successfully!');
      } else {
        const errorData = await response.json();
        alert(`Registration failed: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('An error occurred during registration');
    } finally {
      setRegisterLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout currentPage="dashboard">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="text-muted-foreground">Loading trainer dashboard...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="dashboard">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Trainer Dashboard</h1>
            <p className="text-muted-foreground">Manage your clients, exercises, and programs</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleCreateExercise} className="gradient-orange">
              <Plus className="w-4 h-4 mr-2" />
              Add Exercise
            </Button>
            <Button onClick={() => handleCreateWorkout()} className="gradient-green">
              <Plus className="w-4 h-4 mr-2" />
              Create Workout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalClients}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Exercise Database</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalExercises}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Plans</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalWorkoutPlans + stats.totalMealPlans}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold text-foreground">{Math.round(stats.completionRate)}%</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="exercises">Exercise DB</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Clients */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Recent Clients</span>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('clients')}>
                      View All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {clients.slice(0, 5).map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50 cursor-pointer transition-colors"
                           onClick={() => handleClientClick(client)}>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {client.full_name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{client.full_name}</p>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                          </div>
                        </div>
                        <Badge variant={client.is_active ? "default" : "secondary"}>
                          {client.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activities */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {workoutPlans.slice(0, 3).map((plan) => (
                      <div key={plan.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                          <Dumbbell className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">Workout plan created</p>
                          <p className="text-sm text-muted-foreground">for {plan.client_name}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(plan.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <Button 
                onClick={() => setRegisterDialogOpen(true)}
                className="gradient-blue hover:gradient-blue-dark text-background font-semibold"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Register New Client
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client) => (
                <Card key={client.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleClientClick(client)}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {client.full_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{client.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                      <Badge variant={client.is_active ? "default" : "secondary"}>
                        {client.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {client.profile?.weight && (
                        <p className="text-sm text-muted-foreground">
                          <Weight className="w-3 h-3 inline mr-1" />
                          {client.profile.weight}kg
                        </p>
                      )}
                      {client.profile?.goals && (
                        <p className="text-sm text-muted-foreground">
                          <Target className="w-3 h-3 inline mr-1" />
                          {client.profile.goals}
                        </p>
                      )}
                    </div>

                    <div className="flex space-x-2 mt-4">
                      <Button size="sm" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        handleCreateWorkout(client);
                      }}>
                        <Plus className="w-3 h-3 mr-1" />
                        Workout
                      </Button>
                      <Button size="sm" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        handleCreateMealPlan(client);
                      }}>
                        <Utensils className="w-3 h-3 mr-1" />
                        Meal Plan
                      </Button>
                      <Button size="sm" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        handleViewProgress(client);
                      }}>
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Progress
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Register Client Dialog */}
            <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Register New Client</DialogTitle>
                  <DialogDescription>Create a new client account and automatically assign them to you.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRegisterClient} className="space-y-4">
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
                      onClick={() => setRegisterDialogOpen(false)} 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 gradient-blue text-background" 
                      disabled={registerLoading}
                    >
                      {registerLoading ? 'Registering...' : 'Register Client'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Exercises Tab */}
          <TabsContent value="exercises" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search exercises..."
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedMuscleGroup}
                  onChange={(e) => setSelectedMuscleGroup(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Muscle Groups</option>
                  {muscleGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleCreateExercise} className="gradient-orange">
                <Plus className="w-4 h-4 mr-2" />
                Add Exercise
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExercises.map((exercise) => (
                <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{exercise.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {exercise.muscle_group}
                        </Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="ghost">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {exercise.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {exercise.description}
                      </p>
                    )}
                    
                    {exercise.equipment_needed && (
                      <p className="text-xs text-muted-foreground">
                        Equipment: {exercise.equipment_needed}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weight Tracking */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Weight Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {progressEntries
                      .filter(entry => entry.weight)
                      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
                      .slice(0, 5)
                      .map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                              <Weight className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{entry.client_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {entry.weight}kg • {new Date(entry.recorded_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {entry.photo_path && (
                            <Button size="sm" variant="ghost">
                              <Camera className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Progress Photos */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Progress Photos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {progressEntries
                      .filter(entry => entry.photo_path)
                      .slice(0, 4)
                      .map((entry) => (
                        <div key={entry.id} className="aspect-square bg-secondary rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">{entry.client_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(entry.recorded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default TrainerDashboard; 