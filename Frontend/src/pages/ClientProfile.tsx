import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, User, Target, Weight, Calendar, Clock, 
  Dumbbell, Utensils, TrendingUp, Plus, Edit, Camera,
  Phone, Mail, MapPin, Activity, Heart, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import ClientWeightProgress from '../components/ClientWeightProgress';
import { useTranslation } from 'react-i18next';

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
    phone?: string;
    address?: string;
    emergency_contact?: string;
  };
}

interface WorkoutPlan {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  sessions_count?: number;
  completed_sessions?: number;
  workout_days?: any[];
  exercises?: WorkoutExercise[];
}

interface WorkoutExercise {
  id: number;
  exercise_id: number;
  exercise_name: string;
  exercise_description: string;
  muscle_group: string;
  order: number;
  sets: number;
  reps: string;
  weight?: number;
  rest_time: number;
  notes: string; // Personalized notes for this client
}

interface MealPlan {
  id: number;
  title: string;
  total_calories: number;
  protein_target: number;
  carb_target: number;
  fat_target: number;
  created_at: string;
  meals: MealEntry[];
}

interface MealEntry {
  id: number;
  name: string;
  order_index: number;
  notes?: string;
  components: MealComponent[];
}

interface MealComponent {
  id: number;
  type: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  is_optional: boolean;
}

interface ProgressEntry {
  id: number;
  weight?: number;
  body_fat?: number;
  photo_path?: string;
  notes?: string;
  recorded_at: string;
}

const ClientProfile = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('progress');
  
  // Data states
  const [client, setClient] = useState<Client | null>(null);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Get client from location state or fetch by ID
  const fetchClientData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // If we have client data in location state, use it
      if (location.state?.client) {
        setClient(location.state.client);
      } else if (clientId) {
        // Otherwise fetch client by ID
        const response = await fetch(`${API_BASE_URL}/users/${clientId}`, { headers });
        if (response.ok) {
          const clientData = await response.json();
          setClient(clientData);
        }
      }

      // Fetch client-specific data
      if (clientId) {
        const [workoutRes, mealRes, progressRes] = await Promise.all([
          fetch(`${API_BASE_URL}/v2/workouts/plans?client_id=${clientId}`, { headers }),
          fetch(`${API_BASE_URL}/v2/meals/plans?client_id=${clientId}`, { headers }),
          fetch(`${API_BASE_URL}/progress/?client_id=${clientId}`, { headers })
        ]);

        const workoutData = workoutRes.ok ? await workoutRes.json() : [];
        const mealData = mealRes.ok ? await mealRes.json() : [];
        const progressData = progressRes.ok ? await progressRes.json() : [];

        // Ensure data is array to avoid undefined errors
        // Transform v2 workout data to match old format for compatibility
        const transformedWorkouts = Array.isArray(workoutData) ? workoutData.map((plan: any) => ({
          ...plan,
          exercises: plan.workout_days?.flatMap((day: any) => 
            (day.workout_exercises || []).map((ex: any) => ({
              ...ex,
              exercise_name: ex.exercise_name || ex.name,
              sets: ex.target_sets,
              reps: ex.target_reps,
              rest_time: ex.rest_seconds
            }))
          ) || [],
          sessions_count: plan.workout_days?.length || 0,
          completed_sessions: 0
        })) : [];
        
        setWorkoutPlans(transformedWorkouts);
        setMealPlans(Array.isArray(mealData) ? mealData : []);
        setProgressEntries(Array.isArray(progressData) ? progressData : []);
      }

    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [clientId, location.state]);

  const handleCreateWorkout = () => {
    navigate('/create-workout', { state: { client } });
  };

  const handleCreateMealPlan = () => {
    navigate('/create-meal-plan', { state: { client } });
  };

  const handleViewProgress = () => {
    setActiveTab('progress');
  };

  const handleEditClient = () => {
    navigate(`/client/${clientId}/edit`, { state: { client } });
  };

  if (loading) {
    return (
      <Layout currentPage="dashboard">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="text-muted-foreground">Loading client profile...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout currentPage="dashboard">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Client Not Found</h2>
            <p className="text-muted-foreground mb-4">{t('clientProfile.clientNotFound')}</p>
            <Button onClick={() => navigate('/')}>{t('clientProfile.backToDashboard')}</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const latestWeight = progressEntries
    .filter(entry => entry.weight)
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];

  const latestPhoto = progressEntries
    .filter(entry => entry.photo_path)
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];

  // Map progress entries to match ClientWeightProgress expected type
  const normalizedProgressEntries = progressEntries.map((entry: any) => ({
    id: entry.id,
    client_id: client?.id || entry.client_id || 0,
    date: entry.recorded_at || entry.date || '',
    weight: entry.weight ?? 0,
    photo_path: entry.photo_path,
    notes: entry.notes,
    created_at: entry.created_at || entry.recorded_at || '',
  }));

  return (
    <Layout currentPage="dashboard">
      <div className="container mx-auto p-6 space-y-6 min-h-screen">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('clientProfile.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{client?.full_name || 'Client'}</h1>
              <p className="text-muted-foreground">{t('clientProfile.title')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleEditClient}>
              <Edit className="w-4 h-4 mr-2" />
              {t('clientProfile.editProfile')}
            </Button>
            <Button onClick={handleCreateWorkout} className="gradient-green">
              <Plus className="w-4 h-4 mr-2" />
              {t('clientProfile.createWorkout')}
            </Button>
            <Button onClick={handleCreateMealPlan} className="gradient-orange">
              <Plus className="w-4 h-4 mr-2" />
              {t('clientProfile.createMealPlan')}
            </Button>
          </div>
        </div>

        {/* Client Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-xl shadow-xl border border-border bg-muted/90 animate-fade-in-up">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4 h-48">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t('clientProfile.lastLogin')}</p>
              <p className="text-sm font-bold text-foreground">
                {client.last_login ? new Date(client.last_login).toLocaleDateString() : 'Never'}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-xl border border-border bg-muted/90 animate-fade-in-up">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4 h-48">
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Weight className="w-7 h-7 text-white" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t('clientProfile.currentWeight')}</p>
              <p className="text-2xl font-bold text-foreground">
                {latestWeight?.weight ? `${latestWeight.weight}kg` : 'N/A'}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-xl border border-border bg-muted/90 animate-fade-in-up">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4 h-48">
              <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Dumbbell className="w-7 h-7 text-white" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t('clientProfile.activePlans')}</p>
              <p className="text-2xl font-bold text-foreground">
                {(workoutPlans?.length || 0) + (mealPlans?.length || 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-xl border border-border bg-muted/90 animate-fade-in-up">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4 h-48">
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t('clientProfile.memberSince')}</p>
              <p className="text-sm font-bold text-foreground">{new Date(client.created_at).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="pt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="progress">{t('clientProfile.weightProgress')}</TabsTrigger>
              <TabsTrigger value="workouts">{t('clientProfile.workoutPlans')}</TabsTrigger>
              <TabsTrigger value="meals">{t('clientProfile.mealPlans')}</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{client.email}</span>
                  </div>
                  {client.profile?.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{client.profile.phone}</span>
                    </div>
                  )}
                  {client.profile?.address && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{client.profile.address}</span>
                    </div>
                  )}
                  {client.profile?.emergency_contact && (
                    <div className="flex items-center space-x-3">
                      <Heart className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{client.profile.emergency_contact}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Goals & Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>Goals & Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {client.profile?.goals && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2 flex items-center">
                        <Target className="w-4 h-4 mr-2" />
                        Goals
                      </h4>
                      <p className="text-muted-foreground">{client.profile.goals}</p>
                    </div>
                  )}
                  {client.profile?.preferences && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2 flex items-center">
                        <Activity className="w-4 h-4 mr-2" />
                        Preferences
                      </h4>
                      <p className="text-muted-foreground">{client.profile.preferences}</p>
                    </div>
                  )}
                  {client.profile?.injuries && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2 flex items-center text-orange-600">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Injuries/Concerns
                      </h4>
                      <p className="text-muted-foreground">{client.profile.injuries}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workoutPlans.slice(0, 3).map((plan) => (
                    <div key={plan.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                        <Dumbbell className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{plan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {plan.completed_sessions}/{plan.sessions_count} sessions completed
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(plan.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {mealPlans.slice(0, 2).map((plan) => (
                    <div key={plan.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <Utensils className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{plan.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {plan.total_calories} calories • {plan.meals?.length || 0} meals
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(plan.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workouts Tab */}
          <TabsContent value="workouts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{t('clientProfile.workoutPlans')}</h3>
              <Button onClick={handleCreateWorkout} className="gradient-green">
                <Plus className="w-4 h-4 mr-2" />
                {t('clientProfile.createNewWorkout')}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workoutPlans && workoutPlans.length > 0 && workoutPlans.map((plan) => (
                <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{plan.name}</span>
                      <Badge variant="outline">
                        {plan.completed_sessions}/{plan.sessions_count}
                      </Badge>
                    </CardTitle>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {plan.exercises.slice(0, 3).map((exercise) => (
                        <div key={exercise.id} className="flex items-center justify-between p-2 rounded border">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{exercise.exercise_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {exercise.sets} sets • {exercise.reps} • {exercise.rest_time}s rest
                            </p>
                            {exercise.notes && (
                              <p className="text-xs text-orange-600 mt-1">
                                Note: {exercise.notes}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {exercise.muscle_group}
                          </Badge>
                        </div>
                      ))}
                      {plan.exercises?.length > 3 && (
                        <p className="text-sm text-muted-foreground text-center">
                          +{plan.exercises.length - 3} more exercises
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Meals Tab */}
          <TabsContent value="meals" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{t('clientProfile.mealPlans')}</h3>
              <Button onClick={handleCreateMealPlan} className="gradient-orange">
                <Plus className="w-4 h-4 mr-2" />
                {t('clientProfile.createNewMealPlan')}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mealPlans.map((plan) => (
                <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{plan.name || plan.title}</CardTitle>
                    <div className="flex space-x-4 text-sm text-muted-foreground">
                      {plan.total_calories && <span>{plan.total_calories} cal</span>}
                      {plan.protein_target && <span>{plan.protein_target}g protein</span>}
                      {plan.carb_target && <span>{plan.carb_target}g carbs</span>}
                      {plan.fat_target && <span>{plan.fat_target}g fat</span>}
                    </div>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {plan.meal_slots && plan.meal_slots.length > 0 ? (
                        plan.meal_slots.map((meal, index) => (
                          <div key={meal.id || index} className="p-3 rounded border">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">{meal.name}</h4>
                              {meal.time_suggestion && (
                                <span className="text-xs text-muted-foreground">{meal.time_suggestion}</span>
                              )}
                            </div>
                            <div className="space-y-2">
                              {meal.macro_categories && meal.macro_categories.map((macro, macroIndex) => (
                                <div key={macroIndex} className="text-xs">
                                  <span className="font-medium capitalize">{macro.macro_type}: </span>
                                  <span className="text-muted-foreground">{macro.quantity_instruction}</span>
                                  {macro.food_options?.length > 0 && (
                                    <span className="text-muted-foreground ml-2">
                                      ({macro.food_options.map(f => f.name).join(', ')})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">{t('clientProfile.noMealsConfigured')}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            <ClientWeightProgress
              clientId={clientId!}
              progressEntries={normalizedProgressEntries}
              onProgressUpdate={fetchClientData}
              isTrainer={user?.role === 'trainer'}
            />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('clientProfile.completeProfileInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Personal Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                        <p className="text-foreground">{client.full_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-foreground">{client.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Username</label>
                        <p className="text-foreground">{client.username}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                        <p className="text-foreground">{new Date(client.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-foreground mb-3">Physical Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Current Weight</label>
                        <p className="text-foreground">
                          {latestWeight?.weight ? `${latestWeight.weight}kg` : 'Not recorded'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Height</label>
                        <p className="text-foreground">
                          {client.profile?.height ? `${client.profile.height}cm` : 'Not recorded'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Body Fat %</label>
                        <p className="text-foreground">
                          {latestWeight?.body_fat ? `${latestWeight.body_fat}%` : 'Not recorded'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-3">Goals & Preferences</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Fitness Goals</label>
                      <p className="text-foreground">{client.profile?.goals || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Preferences</label>
                      <p className="text-foreground">{client.profile?.preferences || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Injuries/Concerns</label>
                      <p className="text-foreground text-orange-600">
                        {client.profile?.injuries || 'None reported'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ClientProfile; 