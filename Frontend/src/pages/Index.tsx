import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dumbbell, Target, Utensils, TrendingUp, Plus, Calendar, Clock, CheckCircle, Users, Trophy, Flame, UserPlus, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config/api';

interface DashboardStats {
  totalClients: number;
  totalWorkoutPlans: number;
  totalMealPlans: number;
  totalCompletions: number;
  activeClients: number;
  completionRate: number;
}

interface RecentActivity {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'workout' | 'meal' | 'client' | 'progress';
  clientName?: string;
  icon: any;
  color: string;
}

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isTrainer = user?.role === 'TRAINER';
  const isAdmin = user?.role === 'ADMIN';
  
  // Redirect trainers to trainer dashboard and admins to admin dashboard
  useEffect(() => {
    if (isTrainer) {
      navigate('/trainer-dashboard');
    } else if (isAdmin) {
      navigate('/admin');
    }
  }, [isTrainer, isAdmin, navigate]);
  
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalWorkoutPlans: 0,
    totalMealPlans: 0,
    totalCompletions: 0,
    activeClients: 0,
    completionRate: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientStats, setClientStats] = useState<{
    totalDays: number;
    completedDays: number;
    totalMeals: number;
    completedMeals: number;
    averageCalories7Days: number;
  } | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // If client, fetch their real stats
      if (!isTrainer && !isAdmin && user?.id) {
        // Fetch workout plans and sessions
        const [workoutPlansRes, mealPlansRes] = await Promise.all([
          fetch(`${API_BASE_URL}/v2/workouts/plans?client_id=${user.id}`, { headers }),
          fetch(`${API_BASE_URL}/v2/meals/plans?client_id=${user.id}`, { headers })
        ]);

        const workoutPlans = workoutPlansRes.ok ? await workoutPlansRes.json() : [];
        const mealPlans = mealPlansRes.ok ? await mealPlansRes.json() : [];

        // Count total workouts (workout days) in the training plan
        let totalWorkouts = 0;
        let completedWorkouts = 0;
        
        for (const plan of workoutPlans) {
          if (plan.workout_days && Array.isArray(plan.workout_days)) {
            totalWorkouts += plan.workout_days.length;
            
            // Check completed sessions for each day
            for (const day of plan.workout_days) {
              try {
                const sessionsRes = await fetch(
                  `${API_BASE_URL}/v2/workouts/sessions?client_id=${user.id}&workout_day_id=${day.id}`,
                  { headers }
                );
                if (sessionsRes.ok) {
                  const sessions = await sessionsRes.json();
                  const hasCompleted = Array.isArray(sessions) && sessions.some((s: any) => s.is_completed === true);
                  if (hasCompleted) {
                    completedWorkouts++;
                  }
                }
              } catch (err) {
                console.error(`Failed to fetch sessions for day ${day.id}:`, err);
              }
            }
          }
        }

        // Count meals per day from active meal plan and completed meals for today
        // Meals reset at midnight (00:00)
        let totalMealsPerDay = 0;
        let completedMealsToday = 0;
        const today = new Date().toISOString().split('T')[0];

        // Find active meal plan to get number_of_meals per day
        const activeMealPlan = mealPlans.find((plan: any) => plan.is_active === true);
        if (activeMealPlan && activeMealPlan.number_of_meals) {
          totalMealsPerDay = activeMealPlan.number_of_meals;
        }

        // Fetch today's meal completions (resets at midnight)
        try {
          const completionsRes = await fetch(
            `${API_BASE_URL}/v2/meals/completions?date=${today}`,
            { headers }
          );
          if (completionsRes.ok) {
            const completions = await completionsRes.json();
            completedMealsToday = Array.isArray(completions) 
              ? completions.filter((c: any) => c.is_completed === true).length
              : 0;
          }
        } catch (err) {
          console.error('Failed to fetch meal completions:', err);
        }

        // Fetch average calories for last 7 days
        let averageCalories7Days = 0;
        try {
          const avgCaloriesRes = await fetch(
            `${API_BASE_URL}/v2/meals/history/average?days=7`,
            { headers }
          );
          if (avgCaloriesRes.ok) {
            const avgData = await avgCaloriesRes.json();
            averageCalories7Days = avgData.average_calories || 0;
          }
        } catch (err) {
          console.error('Failed to fetch average calories:', err);
        }

        setStats({
          totalClients: 0,
          totalWorkoutPlans: workoutPlans.length,
          totalMealPlans: mealPlans.length,
          totalCompletions: completedWorkouts,
          activeClients: 0,
          completionRate: totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0
        });

        // Store client-specific stats for display
        setClientStats({
          totalDays: totalWorkouts, // Total workouts in plan
          completedDays: completedWorkouts, // Completed workouts
          totalMeals: totalMealsPerDay, // Meals per day (resets at midnight)
          completedMeals: completedMealsToday, // Completed meals today
          averageCalories7Days: averageCalories7Days // Average calories in 7 days
        });

        setLoading(false);
        return;
      }

      // Trainer/Admin dashboard logic continues below...
      if (!isTrainer) {
        setLoading(false);
        return;
      }

      // Fetch clients
      const clientsResponse = await fetch(`${API_BASE_URL}/users/`, { headers });
      const clients = clientsResponse.ok ? await clientsResponse.json() : [];
      const clientUsers = clients.filter((u: any) => u.role === 'CLIENT');

      // Fetch workout plans
      const workoutResponse = await fetch(`${API_BASE_URL}/workouts/plans`, { headers });
      const workoutPlans = workoutResponse.ok ? await workoutResponse.json() : [];

      // Fetch meal plans
      const mealResponse = await fetch(`${API_BASE_URL}/meal-plans/`, { headers });
      const mealPlans = mealResponse.ok ? await mealResponse.json() : [];

      // Fetch recent completions
      const completionsResponse = await fetch(`${API_BASE_URL}/workouts/completions?size=5`, { headers });
      const completions = completionsResponse.ok ? await completionsResponse.json() : [];

      // Calculate stats
      const activeClients = clientUsers.filter((c: any) => c.is_active).length;
      const totalCompletions = completions.length;
      const completionRate = workoutPlans.length > 0 ? (totalCompletions / (workoutPlans.length * 10)) * 100 : 0; // Rough estimate

      setStats({
        totalClients: clientUsers.length,
        totalWorkoutPlans: workoutPlans.length,
        totalMealPlans: mealPlans.length,
        totalCompletions,
        activeClients,
        completionRate: Math.min(completionRate, 100)
      });

      // Build recent activity
      const activities: RecentActivity[] = [];

      // Add recent workout completions
      completions.slice(0, 3).forEach((completion: any) => {
        activities.push({
          id: `completion-${completion.id}`,
          title: `${completion.client_name || 'Client'} completed workout`,
          description: `${completion.exercise_name || 'Exercise'} - ${completion.actual_sets} sets`,
          time: formatTimeAgo(new Date(completion.completed_at)),
          type: 'workout',
          clientName: completion.client_name,
          icon: CheckCircle,
          color: 'bg-gradient-to-tr from-green-500 to-green-700'
        });
      });

      // Add recent client registrations
      const recentClients = clientUsers
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2);
      
      recentClients.forEach((client: any) => {
        activities.push({
          id: `client-${client.id}`,
          title: `New client joined: ${client.full_name}`,
          description: `Started their fitness journey`,
          time: formatTimeAgo(new Date(client.created_at)),
          type: 'client',
          clientName: client.full_name,
          icon: UserPlus,
          color: 'bg-gradient-to-tr from-blue-500 to-blue-700'
        });
      });

      // Add recent meal plan activities
      const recentMealPlans = mealPlans
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2);
      
      recentMealPlans.forEach((plan: any) => {
        activities.push({
          id: `meal-${plan.id}`,
          title: `Created meal plan: ${plan.title}`,
          description: `${plan.total_calories} calories for ${plan.client_name || 'client'}`,
          time: formatTimeAgo(new Date(plan.created_at)),
          type: 'meal',
          clientName: plan.client_name,
          icon: Utensils,
          color: 'bg-gradient-to-tr from-orange-500 to-orange-700'
        });
      });

      // Sort activities by time and take top 5
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivity(activities.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [isTrainer]);

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return t('dates.today');
    if (diffInHours < 24) return `${diffInHours} ${t('common.time')}`;
    if (diffInHours < 48) return t('dates.yesterday');
    return `${Math.floor(diffInHours / 24)} ${t('dates.today')}`;
  };

  const statsCards = [
    {
      label: t('dashboard.totalClients'),
      value: stats.totalClients.toString(),
      icon: Users,
      gradient: 'bg-gradient-to-r from-blue-500 to-blue-600',
    },
    {
      label: t('training.workoutPlans'),
      value: stats.totalWorkoutPlans.toString(),
      icon: CheckCircle,
      gradient: 'bg-gradient-to-r from-green-500 to-green-600',
    },
    {
      label: t('meals.mealPlans'),
      value: stats.totalMealPlans.toString(),
      icon: Utensils,
      gradient: 'bg-gradient-to-r from-orange-500 to-orange-600',
    },
    {
      label: t('training.completionRate'),
      value: `${Math.round(stats.completionRate)}%`,
      icon: Trophy,
      gradient: 'bg-gradient-to-r from-purple-500 to-purple-600',
    },
  ];

  if (loading) {
    return (
      <Layout currentPage="dashboard">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="text-muted-foreground">{t('dashboard.loading')}</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="dashboard">
      <div className="pb-20 lg:pb-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-6 lg:py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gradient">
                  {isTrainer ? t('dashboard.welcome') : `${t('auth.welcomeBack')}, ${user?.full_name}`}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {isTrainer ? t('dashboard.overview') : t('dashboard.welcome')}
                </p>
              </div>
              {isTrainer && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <Button 
                    onClick={() => navigate('/create-workout-plan-v2')}
                    variant="outline" 
                    className="font-semibold transform hover:scale-105 transition-all duration-200 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('training.createWorkout')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statsCards.map((stat, index) => (
              <Card key={index} className={`${stat.gradient} border-0 shadow-xl transform hover:scale-105 transition-all duration-300`}>
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl lg:text-3xl font-bold text-background">{stat.value}</p>
                      <p className="text-background/80 text-xs lg:text-sm font-medium">{stat.label}</p>
                    </div>
                    <stat.icon className="w-8 h-8 lg:w-10 lg:h-10 text-background/90" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Training Section */}
            <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-foreground">
                  <Dumbbell className="w-5 h-5 text-primary" />
                  <span>{isTrainer ? t('training.training') : t('training.training')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-foreground">
                    {isTrainer ? `${stats.totalWorkoutPlans} ${t('training.workoutPlans')}` : 
                      clientStats 
                        ? `${clientStats.totalDays} ${t('training.workouts')}`
                        : `0 ${t('training.workouts')}`}
                  </span>
                  <Badge className="gradient-orange text-background">
                    {isTrainer ? `${stats.totalCompletions} ${t('training.completed')}` : 
                      clientStats && clientStats.totalDays > 0
                        ? `${clientStats.completedDays}/${clientStats.totalDays} ${t('training.completed')}`
                        : `0/0 ${t('training.completed')}`}
                  </Badge>
                </div>
                <Progress 
                  value={isTrainer ? stats.completionRate : 
                    (clientStats && clientStats.totalDays > 0
                      ? (clientStats.completedDays / clientStats.totalDays) * 100
                      : 0)} 
                  className="h-3 bg-secondary" 
                />
                <Button 
                  onClick={() => navigate('/training')}
                  className="w-full gradient-orange text-background font-semibold transform hover:scale-105 transition-all duration-200"
                >
                  <Target className="w-4 h-4 mr-2" />
                  {isTrainer ? t('training.workoutPlans') : t('training.workouts')}
                </Button>
              </CardContent>
            </Card>

            {/* Nutrition Section */}
            <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-foreground">
                  <Utensils className="w-5 h-5 text-green-500" />
                  <span>{isTrainer ? t('meals.meals') : t('meals.meals')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-foreground">
                    {isTrainer ? `${stats.totalMealPlans} ${t('meals.mealPlans')}` : 
                      clientStats 
                        ? `${clientStats.completedMeals}/${clientStats.totalMeals} ${t('meals.meals')}`
                        : `0/0 ${t('meals.meals')}`}
                  </span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {isTrainer ? `${stats.activeClients} ${t('client.clients')}` : 
                      clientStats
                        ? `${Math.round(clientStats.averageCalories7Days)} ${t('meals.kcal')}`
                        : `0 ${t('meals.kcal')}`}
                  </Badge>
                </div>
                <Progress 
                  value={isTrainer ? (stats.totalMealPlans > 0 ? 67 : 0) : 
                    (clientStats && clientStats.totalMeals > 0
                      ? (clientStats.completedMeals / clientStats.totalMeals) * 100
                      : 0)} 
                  className="h-3 bg-secondary" 
                />
                <Button 
                  onClick={() => navigate('/meals')}
                  className="w-full bg-green-500 hover:bg-green-600 text-background font-semibold transform hover:scale-105 transition-all duration-200"
                >
                  <Utensils className="w-4 h-4 mr-2" />
                  {isTrainer ? t('meals.mealPlans') : t('meals.meals')}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground">
                <Activity className="w-5 h-5 text-blue-500" />
                <span>{isTrainer ? t('dashboard.recentActivity') : t('dashboard.recentActivity')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('dashboard.noData')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t('dashboard.welcome')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4 p-4 bg-secondary/30 rounded-xl border border-border/30 hover:bg-secondary/50 transition-colors">
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
