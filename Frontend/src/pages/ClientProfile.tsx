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
import MealHistory from '../components/MealHistory';

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

interface MealPlanFoodOption {
  name: string;
  name_hebrew?: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  serving_size?: string;
}

interface MealPlanMacroCategory {
  macro_type: 'protein' | 'carb' | 'fat';
  quantity_instruction?: string;
  food_options?: MealPlanFoodOption[];
}

interface MealPlanSlot {
  id?: number;
  name: string;
  order_index?: number;
  time_suggestion?: string;
  macro_categories?: MealPlanMacroCategory[];
}

interface MealPlan {
  id: number;
  title?: string;
  name?: string;
  description?: string;
  total_calories?: number;
  protein_target?: number;
  carb_target?: number;
  fat_target?: number;
  number_of_meals?: number;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
  meals?: MealEntry[];
  meal_slots?: MealPlanSlot[];
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
  const [activeTab, setActiveTab] = useState('profile');
  
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
        const normalizedWorkouts = Array.isArray(workoutData)
          ? workoutData
              .filter((plan: any) => plan.is_active !== false)
              .sort((a: any, b: any) => {
                const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
                const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
                return dateB - dateA;
              })
          : [];

        const transformedWorkouts = normalizedWorkouts.length > 0
          ? normalizedWorkouts.map((plan: any) => ({
              ...plan,
              exercises:
                plan.workout_days?.flatMap((day: any) =>
                  (day.workout_exercises || []).map((ex: any) => ({
                    ...ex,
                    exercise_name: ex.exercise_name || ex.name,
                    sets: ex.target_sets,
                    reps: ex.target_reps,
                    rest_time: ex.rest_seconds,
                  })),
                ) || [],
              sessions_count: plan.workout_days?.length || 0,
              completed_sessions: 0,
            }))
          : [];
        
        const normalizedMealPlans = Array.isArray(mealData)
          ? mealData
              .filter((plan: any) => plan.is_active !== false)
              .sort((a: any, b: any) => {
                const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
                const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
                return dateB - dateA;
              })
          : [];

        setWorkoutPlans(transformedWorkouts.slice(0, 1));
        setMealPlans(normalizedMealPlans.slice(0, 1));
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
    navigate('/create-workout-plan-v2', { state: { client } });
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

  const activeMealPlan = mealPlans.length > 0 ? mealPlans[0] : null;
  const activeWorkoutPlan = workoutPlans.length > 0 ? workoutPlans[0] : null;

  const handleEditWorkoutPlan = () => {
    if (!activeWorkoutPlan) {
      handleCreateWorkout();
      return;
    }

    navigate('/create-workout-plan-v2', {
      state: {
        client,
        workoutPlan: activeWorkoutPlan,
      },
    });
  };

  const handleEditMealPlan = () => {
    const planForEdit = activeMealPlan || mealPlans[0];
    if (!planForEdit) {
      handleCreateMealPlan();
      return;
    }

    navigate('/create-meal-plan', {
      state: {
        client,
        mealPlan: planForEdit,
      },
    });
  };

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
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-1 h-auto min-h-[3rem] p-2">
              <TabsTrigger value="profile" className="text-sm sm:text-base px-4 py-3 whitespace-normal break-words">{t('clientProfile.profile', 'Profile')}</TabsTrigger>
              <TabsTrigger value="progress" className="text-sm sm:text-base px-4 py-3 whitespace-normal break-words">{t('clientProfile.weightProgress')}</TabsTrigger>
              <TabsTrigger value="workouts" className="text-sm sm:text-base px-4 py-3 whitespace-normal break-words">{t('clientProfile.workoutPlans')}</TabsTrigger>
              <TabsTrigger value="meals" className="text-sm sm:text-base px-4 py-3 whitespace-normal break-words">{t('clientProfile.mealPlans')}</TabsTrigger>
              <TabsTrigger value="nutrition" className="text-sm sm:text-base px-4 py-3 whitespace-normal break-words">{t('clientProfile.nutritionHistory')}</TabsTrigger>
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
              <Button
                data-testid="workout-plan-action"
                onClick={activeWorkoutPlan ? handleEditWorkoutPlan : handleCreateWorkout}
                className="gradient-green"
              >
                {!activeWorkoutPlan && <Plus className="w-4 h-4 mr-2" />}
                <span>
                  {activeWorkoutPlan
                    ? t('clientProfile.updateWorkoutPlan')
                    : t('clientProfile.createNewWorkout')}
                </span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeWorkoutPlan ? (
                <Card className="hover:shadow-lg transition-shadow" data-testid="workout-plan-card">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-2">
                        <CardTitle className="text-lg font-semibold">
                          {activeWorkoutPlan.name}
                        </CardTitle>
                        {activeWorkoutPlan.description && (
                          <p className="text-sm text-muted-foreground">{activeWorkoutPlan.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {activeWorkoutPlan.split_type && (
                            <Badge variant="outline">
                              {activeWorkoutPlan.split_type.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {activeWorkoutPlan.days_per_week && (
                            <Badge variant="outline">
                              {t('clientProfile.daysPerWeek', { count: activeWorkoutPlan.days_per_week })}
                            </Badge>
                          )}
                          {activeWorkoutPlan.duration_weeks && (
                            <Badge variant="outline">
                              {t('clientProfile.durationWeeks', { count: activeWorkoutPlan.duration_weeks })}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{t('clientProfile.activePlan')}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleEditWorkoutPlan}
                          aria-label={t('clientProfile.updateWorkoutPlan')}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">{t('clientProfile.updateWorkoutPlan')}</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {activeWorkoutPlan.workout_days?.length ? (
                      activeWorkoutPlan.workout_days.map((day: any) => (
                        <div key={day.id || day.order_index} className="p-3 rounded border bg-muted/40 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{day.name}</p>
                            {day.estimated_duration && (
                              <span className="text-xs text-muted-foreground">
                                {day.estimated_duration} {t('clientProfile.minutesShort')}
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            {day.workout_exercises?.length ? (
                              day.workout_exercises.map((exercise: any) => (
                                <div key={exercise.id || exercise.order_index} className="text-xs border rounded px-2 py-1 bg-background">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-foreground">
                                      {exercise.exercise?.name || exercise.exercise_name}
                                    </span>
                                    {exercise.exercise?.muscle_group && (
                                      <Badge variant="outline" className="text-[10px]">
                                        {exercise.exercise.muscle_group}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-muted-foreground mt-1">
                                    {[
                                      exercise.target_sets ? t('clientProfile.setsShort', { count: exercise.target_sets }) : null,
                                      exercise.target_reps || null,
                                      exercise.rest_seconds ? t('clientProfile.restShort', { seconds: exercise.rest_seconds }) : null,
                                    ]
                                      .filter(Boolean)
                                      .join(' • ') || t('clientProfile.noWorkoutDetails')}
                                  </div>
                                  {exercise.notes ? (
                                    <div className="mt-1 text-[11px] text-orange-600">
                                      {t('clientProfile.notePrefix')} {exercise.notes}
                                    </div>
                                  ) : null}
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-muted-foreground">{t('clientProfile.noWorkoutPlanExercises')}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('clientProfile.noWorkoutPlanExercises')}</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed" data-testid="workout-plan-empty">
                  <CardHeader>
                    <CardTitle>{t('clientProfile.noWorkoutPlanTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>{t('clientProfile.noWorkoutPlanDescription')}</p>
                    <p>{t('clientProfile.noWorkoutPlanAction')}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Meals Tab */}
          <TabsContent value="meals" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h3 className="text-lg font-semibold">{t('clientProfile.mealPlans')}</h3>
              <Button
                onClick={activeMealPlan ? handleEditMealPlan : handleCreateMealPlan}
                className="gradient-orange w-full sm:w-auto text-sm sm:text-base"
              >
                {!activeMealPlan && <Plus className="w-4 h-4 mr-2" />}
                <span className="whitespace-normal break-words">{activeMealPlan ? t('clientProfile.updateMealPlan') : t('clientProfile.createNewMealPlan')}</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeMealPlan ? (
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-2">
                        <CardTitle className="text-lg font-semibold">
                          {activeMealPlan.name || activeMealPlan.title}
                        </CardTitle>
                        {activeMealPlan.description && (
                          <p className="text-sm text-muted-foreground">{activeMealPlan.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t('clientProfile.lastUpdated')} {new Date(activeMealPlan.updated_at || activeMealPlan.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{t('clientProfile.activePlan')}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleEditMealPlan}
                          aria-label={t('clientProfile.updateMealPlan')}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">{t('clientProfile.updateMealPlan')}</span>
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {activeMealPlan.total_calories && <span>{activeMealPlan.total_calories} {t('meals.calories')}</span>}
                      {activeMealPlan.protein_target && <span>{activeMealPlan.protein_target}g {t('meals.protein')}</span>}
                      {activeMealPlan.carb_target && <span>{activeMealPlan.carb_target}g {t('meals.carbs')}</span>}
                      {activeMealPlan.fat_target && <span>{activeMealPlan.fat_target}g {t('meals.fat')}</span>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activeMealPlan.meal_slots && activeMealPlan.meal_slots.length > 0 ? (
                        activeMealPlan.meal_slots.map((meal: any, index: number) => (
                          <div key={meal.id || index} className="p-3 rounded border bg-muted/40">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">{meal.name}</h4>
                              {meal.time_suggestion && (
                                <span className="text-xs text-muted-foreground">{meal.time_suggestion}</span>
                              )}
                            </div>
                            <div className="space-y-2">
                              {meal.macro_categories && meal.macro_categories.map((macro: any, macroIndex: number) => (
                                <div key={macroIndex} className="text-xs text-muted-foreground">
                                  <span className="font-medium capitalize text-foreground">{macro.macro_type}: </span>
                                  <span>{macro.quantity_instruction || t('clientProfile.noQuantitySet')}</span>
                                  {macro.food_options?.length > 0 && (
                                    <span className="ml-2">
                                      ({macro.food_options.map((f: any) => f.name_hebrew || f.name).join(', ')})
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
              ) : (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle>{t('clientProfile.noMealPlanTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>{t('clientProfile.noMealPlanDescription')}</p>
                    <p>{t('clientProfile.noMealPlanAction')}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="nutrition" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h3 className="text-lg font-semibold">{t('clientProfile.nutritionHistory')}</h3>
              <Button variant="outline" onClick={handleCreateMealPlan} className="w-full sm:w-auto text-sm sm:text-base">
                <Utensils className="w-4 h-4 mr-2" />
                <span className="whitespace-normal break-words">{activeMealPlan ? t('clientProfile.updateMealPlan') : t('clientProfile.createNewMealPlan')}</span>
              </Button>
            </div>
            <MealHistory clientId={client.id} />
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client Details */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('clientProfile.basicInformation', 'Basic Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{client.email}</span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('clientProfile.username', 'Username')}</label>
                    <p className="text-foreground">{client.username}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('clientProfile.fullName', 'Full Name')}</label>
                    <p className="text-foreground">{client.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('clientProfile.memberSince', 'Member Since')}</label>
                    <p className="text-foreground">{new Date(client.created_at).toLocaleDateString()}</p>
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

              {/* Physical Information */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('clientProfile.physicalInformation', 'Physical Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('clientProfile.currentWeight', 'Current Weight')}</label>
                    <p className="text-foreground">
                      {latestWeight?.weight ? `${latestWeight.weight}kg` : t('clientProfile.notRecorded', 'Not recorded')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('clientProfile.height', 'Height')}</label>
                    <p className="text-foreground">
                      {client.profile?.height ? `${client.profile.height}cm` : t('clientProfile.notRecorded', 'Not recorded')}
                    </p>
                  </div>
                  {client.profile?.weight && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('clientProfile.targetWeight', 'Target Weight')}</label>
                      <p className="text-foreground">
                        {client.profile.weight}kg
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Goals & Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>{t('clientProfile.goalsAndPreferences', 'Goals & Preferences')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('clientProfile.goals', 'Fitness Goals')}</label>
                  <p className="text-foreground whitespace-pre-wrap">{client.profile?.goals || t('clientProfile.notSpecified', 'Not specified')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('clientProfile.preferences', 'Preferences')}</label>
                  <p className="text-foreground whitespace-pre-wrap">{client.profile?.preferences || t('clientProfile.notSpecified', 'Not specified')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('clientProfile.injuries', 'Injuries / Medical Conditions')}</label>
                  <p className="text-foreground text-orange-600 dark:text-orange-400 whitespace-pre-wrap">
                    {client.profile?.injuries || t('clientProfile.noneReported', 'None reported')}
                  </p>
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