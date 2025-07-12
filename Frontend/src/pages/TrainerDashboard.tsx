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
  Search, Filter, Eye, Edit, Trash2, PlusCircle, Weight, Camera, EyeOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import ClientWeightProgress from '../components/ClientWeightProgress';

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
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalExercises: 0,
    totalWorkoutPlans: 0,
    totalMealPlans: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [progressEntries, setProgressEntries] = useState<any[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [addClientDialogOpen, setAddClientDialogOpen] = useState(false);
  const [addClientForm, setAddClientForm] = useState({ username: '', email: '', full_name: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [addClientLoading, setAddClientLoading] = useState(false);
  const [addClientError, setAddClientError] = useState('');

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      // Fetch stats only
      const [clientsRes, exercisesRes, workoutPlansRes, mealPlansRes] = await Promise.all([
        fetch(`${API_BASE_URL}/users/clients`, { headers }),
        fetch(`${API_BASE_URL}/workouts/exercises`, { headers }),
        fetch(`${API_BASE_URL}/workouts/plans`, { headers }),
        fetch(`${API_BASE_URL}/meal-plans/`, { headers })
      ]);
      const clientsData = clientsRes.ok ? await clientsRes.json() : [];
      const exercisesData = exercisesRes.ok ? await exercisesRes.json() : [];
      const workoutPlansData = workoutPlansRes.ok ? await workoutPlansRes.json() : [];
      const mealPlansData = mealPlansRes.ok ? await mealPlansRes.json() : [];
      const activeClients = clientsData.filter((c: any) => c.is_active).length;
      const totalCompletions = workoutPlansData.reduce((sum: number, plan: any) => sum + plan.completed_sessions, 0);
      const totalSessions = workoutPlansData.reduce((sum: number, plan: any) => sum + plan.sessions_count, 0);
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

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/users/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleViewProgress = async (client: Client) => {
    setSelectedClient(client);
    setProgressModalOpen(true);
    setProgressLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/progress/?client_id=${client.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProgressEntries(data);
      } else {
        setProgressEntries([]);
      }
    } catch {
      setProgressEntries([]);
    } finally {
      setProgressLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDashboardData();
    fetchClients();
  }, []);
  if (loading) {
    return <Layout currentPage="dashboard"><div className="flex items-center justify-center min-h-screen"><div>Loading...</div></div></Layout>;
  }
  return (
    <Layout currentPage="dashboard">
      <div className="max-w-5xl mx-auto py-10 px-4">
        <h1 className="text-4xl font-bold mb-10 text-center">Trainer Dashboard</h1>
        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <Card className="rounded-xl shadow-xl border border-border bg-muted/90 transition-transform duration-300 animate-fade-in-up hover:-translate-y-1 hover:shadow-2xl">
            <CardContent className="p-6 flex flex-col items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-2 mt-2">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-bold mb-1">{stats.totalClients}</div>
              <div className="text-muted-foreground text-sm">Total Clients</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-xl border border-border bg-muted/90 transition-transform duration-300 animate-fade-in-up hover:-translate-y-1 hover:shadow-2xl">
            <CardContent className="p-6 flex flex-col items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mb-2 mt-2">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-bold mb-1">{stats.totalExercises}</div>
              <div className="text-muted-foreground text-sm">Exercises</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-xl border border-border bg-muted/90 transition-transform duration-300 animate-fade-in-up hover:-translate-y-1 hover:shadow-2xl">
            <CardContent className="p-6 flex flex-col items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-2 mt-2">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-bold mb-1">{stats.completionRate.toFixed(1)}%</div>
              <div className="text-muted-foreground text-sm">Workout Completion</div>
            </CardContent>
          </Card>
        </div>
        {/* Clients Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-center">Your Clients</h2>
            <Button onClick={() => setAddClientDialogOpen(true)} className="gradient-orange text-background font-semibold flex items-center"><UserPlus className="w-4 h-4 mr-2" />Add Client</Button>
          </div>
          <div className="flex justify-center mb-8">
            <input
              type="text"
              placeholder="Search clients..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="px-4 py-2 border border-input rounded-lg w-full max-w-md focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {clients.filter(client =>
              client.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
              client.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
              client.username.toLowerCase().includes(clientSearch.toLowerCase())
            ).length === 0 ? (
              <div className="col-span-full text-center text-muted-foreground py-12 text-lg">No clients found.</div>
            ) : (
              clients.filter(client =>
                client.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                client.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
                client.username.toLowerCase().includes(clientSearch.toLowerCase())
              ).map(client => (
                <Card key={client.id} className="rounded-xl shadow-lg border border-border bg-muted/90 hover:-translate-y-1 hover:shadow-2xl transition-transform duration-300 animate-fade-in-up flex flex-col justify-between h-full">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-center mb-4">
                      <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-4">
                        <span className="text-white font-bold text-2xl">
                          {client.full_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-foreground mb-1">{client.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-auto pt-4">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleViewProgress(client)}>View Progress</Button>
                      <Button size="sm" className="flex-1" onClick={() => navigate(`/client/${client.id}`)}>View Profile</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
        <Dialog open={progressModalOpen} onOpenChange={setProgressModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Weight Progress - {selectedClient?.full_name}</DialogTitle>
              </DialogHeader>
              {progressLoading ? (
                <div className="p-8 text-center">Loading...</div>
              ) : (
                <ClientWeightProgress
                  clientId={selectedClient?.id?.toString() || ''}
                  progressEntries={progressEntries}
                  onProgressUpdate={() => handleViewProgress(selectedClient!)}
                  isTrainer={true}
                />
              )}
            </DialogContent>
          </Dialog>
        <Dialog open={addClientDialogOpen} onOpenChange={setAddClientDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>Register a new client and assign them to you.</DialogDescription>
            </DialogHeader>
            <form onSubmit={async e => {
              e.preventDefault();
              setAddClientError('');
              if (addClientForm.password !== addClientForm.confirmPassword) {
                setAddClientError('Passwords do not match');
                return;
              }
              setAddClientLoading(true);
              try {
                const token = localStorage.getItem('access_token');
                // Register client
                const res = await fetch(`${API_BASE_URL}/auth/register/client`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    username: addClientForm.username,
                    email: addClientForm.email,
                    full_name: addClientForm.full_name,
                    password: addClientForm.password,
                    role: 'client'
                  })
                });
                if (!res.ok) {
                  let errMsg = 'Failed to register client';
                  try {
                    const err = await res.json();
                    errMsg = err.detail || JSON.stringify(err);
                  } catch (jsonErr) {
                    errMsg = await res.text();
                  }
                  setAddClientError(errMsg);
                  setAddClientLoading(false);
                  return;
                }
                const client = await res.json();
                // Assign client to trainer
                const assignRes = await fetch(`${API_BASE_URL}/users/clients/${client.id}/assign`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!assignRes.ok) {
                  let assignErrMsg = 'Client registered but failed to assign to trainer';
                  try {
                    const err = await assignRes.json();
                    assignErrMsg = err.detail || JSON.stringify(err);
                  } catch (jsonErr) {
                    assignErrMsg = await assignRes.text();
                  }
                  setAddClientError(assignErrMsg);
                  setAddClientLoading(false);
                  return;
                }
                setAddClientDialogOpen(false);
                setAddClientForm({ username: '', email: '', full_name: '', password: '', confirmPassword: '' });
                fetchClients();
              } catch (err) {
                setAddClientError('Unexpected error occurred: ' + (err?.message || err));
                console.error('Add client error:', err);
              } finally {
                setAddClientLoading(false);
              }
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={addClientForm.username} onChange={e => setAddClientForm({ ...addClientForm, username: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={addClientForm.email} onChange={e => setAddClientForm({ ...addClientForm, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" value={addClientForm.full_name} onChange={e => setAddClientForm({ ...addClientForm, full_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={addClientForm.password} onChange={e => setAddClientForm({ ...addClientForm, password: e.target.value })} required />
                  <button type="button" className="absolute right-2 top-2" onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={addClientForm.confirmPassword} onChange={e => setAddClientForm({ ...addClientForm, confirmPassword: e.target.value })} required />
                  <button type="button" className="absolute right-2 top-2" onClick={() => setShowConfirmPassword(v => !v)}>{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              {addClientError && <div className="text-red-500 text-sm">{addClientError}</div>}
              <div className="flex space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setAddClientDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1 gradient-orange text-background" disabled={addClientLoading}>{addClientLoading ? 'Adding...' : 'Add Client'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};
export default TrainerDashboard; 