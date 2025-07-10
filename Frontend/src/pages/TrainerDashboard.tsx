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

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      // Fetch stats only
      const [clientsRes, exercisesRes, workoutPlansRes, mealPlansRes] = await Promise.all([
        fetch(`${API_BASE_URL}/users/?role=client`, { headers }),
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
      const response = await fetch(`${API_BASE_URL}/users/?role=client`, {
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
      <div className="max-w-4xl mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Trainer Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card><CardContent className="p-6"><div className="text-center"><div className="text-2xl font-bold">{stats.totalClients}</div><div className="text-muted-foreground">Total Clients</div></div></CardContent></Card>
          <Card><CardContent className="p-6"><div className="text-center"><div className="text-2xl font-bold">{stats.totalExercises}</div><div className="text-muted-foreground">Exercises</div></div></CardContent></Card>
          <Card><CardContent className="p-6"><div className="text-center"><div className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</div><div className="text-muted-foreground">Workout Completion</div></div></CardContent></Card>
        </div>
        {/* Client Management Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">Clients</h2>
          <input
            type="text"
            placeholder="Search clients..."
            value={clientSearch}
            onChange={e => setClientSearch(e.target.value)}
            className="mb-4 px-4 py-2 border rounded-lg w-full md:w-1/2"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clients.filter(client =>
              client.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
              client.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
              client.username.toLowerCase().includes(clientSearch.toLowerCase())
            ).map(client => (
              <Card key={client.id} className="hover:shadow-lg transition-shadow">
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
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewProgress(client)}>View Progress</Button>
                    <Button size="sm" onClick={() => navigate(`/client/${client.id}`)}>View Profile</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Progress Modal */}
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
        </div>
      </div>
    </Layout>
  );
};
export default TrainerDashboard; 