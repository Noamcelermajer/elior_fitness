import React from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dumbbell, Target, Utensils, TrendingUp, Plus, Calendar, Clock, CheckCircle, Users, Trophy, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTrainer = user?.role === 'trainer';

  const statsCards = [
    {
      label: 'Total Clients',
      value: '45',
      icon: Users,
      gradient: 'bg-gradient-to-r from-blue-500 to-blue-600',
    },
    {
      label: 'Workouts Completed',
      value: '328',
      icon: CheckCircle,
      gradient: 'bg-gradient-to-r from-green-500 to-green-600',
    },
    {
      label: 'Meal Plans Created',
      value: '24',
      icon: Utensils,
      gradient: 'bg-gradient-to-r from-orange-500 to-orange-600',
    },
    {
      label: 'Success Stories',
      value: '12',
      icon: Trophy,
      gradient: 'bg-gradient-to-r from-purple-500 to-purple-600',
    },
  ];

  const recentActivity = [
    {
      title: 'Sarah completed Upper Body workout',
      description: 'Finished all sets and reps perfectly!',
      time: '2 hours ago',
      icon: Dumbbell,
      color: 'bg-gradient-to-tr from-orange-500 to-orange-700',
    },
    {
      title: 'Mike hit a new personal best',
      description: 'Lifted 200lbs on deadlifts.',
      time: 'Yesterday',
      icon: Flame,
      color: 'bg-gradient-to-tr from-red-500 to-red-700',
    },
    {
      title: 'Emma started a new meal plan',
      description: 'Excited to see the results!',
      time: '3 days ago',
      icon: Utensils,
      color: 'bg-gradient-to-tr from-green-500 to-green-700',
    },
  ];

  return (
    <Layout currentPage="dashboard">
      <div className="pb-20 lg:pb-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-6 lg:py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gradient">
                  {isTrainer ? 'Trainer Dashboard' : `Welcome back, ${user?.name}`}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {isTrainer ? 'Manage clients and create workout plans' : 'Track your fitness journey and stay motivated'}
                </p>
              </div>
              {isTrainer && (
                <div className="flex space-x-3">
                  <Button 
                    onClick={() => navigate('/create-workout')}
                    className="gradient-orange hover:gradient-orange-dark text-background font-semibold transform hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Workout
                  </Button>
                  <Button 
                    onClick={() => navigate('/create-meal-plan')}
                    variant="outline" 
                    className="font-semibold transform hover:scale-105 transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Meal Plan
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
                  <span>{isTrainer ? 'Client Training' : 'My Training'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-foreground">
                    {isTrainer ? '12 Active Plans' : '3/4 Workouts'}
                  </span>
                  <Badge className="gradient-orange text-background">
                    {isTrainer ? '8 Completed Today' : '75% Complete'}
                  </Badge>
                </div>
                <Progress value={isTrainer ? 67 : 75} className="h-3 bg-secondary" />
                <Button 
                  onClick={() => navigate('/training')}
                  className="w-full gradient-orange text-background font-semibold transform hover:scale-105 transition-all duration-200"
                >
                  <Target className="w-4 h-4 mr-2" />
                  {isTrainer ? 'Manage Training Plans' : 'View My Workouts'}
                </Button>
              </CardContent>
            </Card>

            {/* Nutrition Section */}
            <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-foreground">
                  <Utensils className="w-5 h-5 text-green-500" />
                  <span>{isTrainer ? 'Client Nutrition' : 'My Nutrition'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-foreground">
                    {isTrainer ? '15 Meal Plans' : '2/3 Meals'}
                  </span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {isTrainer ? '10 Following' : 'On Track'}
                  </Badge>
                </div>
                <Progress value={isTrainer ? 67 : 67} className="h-3 bg-secondary" />
                <Button 
                  onClick={() => navigate('/meals')}
                  className="w-full bg-green-500 hover:bg-green-600 text-background font-semibold transform hover:scale-105 transition-all duration-200"
                >
                  <Utensils className="w-4 h-4 mr-2" />
                  {isTrainer ? 'Manage Meal Plans' : 'View My Meals'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <span>{isTrainer ? 'Recent Client Activity' : 'Recent Activity'}</span>
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
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
