
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dumbbell, Clock, CheckCircle, Circle, Calendar, User, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const TrainingPlan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTrainer = user?.role === 'trainer';
  
  const trainerWorkouts = [
    {
      id: 1,
      name: "Upper Body Strength",
      day: "Monday",
      duration: "45 min",
      difficulty: "Intermediate",
      completed: false,
      clientName: "Sarah Johnson",
      exercises: [
        { name: "Push-ups", sets: 3, reps: "12-15", rest: "60s", completed: true },
        { name: "Pull-ups", sets: 3, reps: "8-10", rest: "90s", completed: true },
        { name: "Bench Press", sets: 4, reps: "8-10", rest: "120s", completed: false },
        { name: "Rows", sets: 3, reps: "10-12", rest: "60s", completed: false },
        { name: "Shoulder Press", sets: 3, reps: "10-12", rest: "60s", completed: false }
      ]
    },
    {
      id: 2,
      name: "Lower Body Power",
      day: "Wednesday", 
      duration: "50 min",
      difficulty: "Advanced",
      completed: true,
      clientName: "Mike Chen",
      exercises: [
        { name: "Squats", sets: 4, reps: "10-12", rest: "120s", completed: true },
        { name: "Deadlifts", sets: 4, reps: "6-8", rest: "150s", completed: true },
        { name: "Lunges", sets: 3, reps: "12 each leg", rest: "60s", completed: true },
        { name: "Calf Raises", sets: 3, reps: "15-20", rest: "45s", completed: true }
      ]
    },
    {
      id: 3,
      name: "Cardio & Core",
      day: "Friday",
      duration: "35 min", 
      difficulty: "Beginner",
      completed: false,
      clientName: "Emma Wilson",
      exercises: [
        { name: "Burpees", sets: 3, reps: "10", rest: "60s", completed: false },
        { name: "Mountain Climbers", sets: 3, reps: "20", rest: "45s", completed: false },
        { name: "Plank", sets: 3, reps: "60s hold", rest: "60s", completed: false },
        { name: "Russian Twists", sets: 3, reps: "20", rest: "45s", completed: false }
      ]
    }
  ];

  const clientWorkouts = [
    {
      id: 1,
      name: "Upper Body Strength",
      day: "Monday",
      duration: "45 min",
      difficulty: "Intermediate",
      completed: true,
      exercises: [
        { name: "Push-ups", sets: 3, reps: "12-15", rest: "60s", completed: true },
        { name: "Pull-ups", sets: 3, reps: "8-10", rest: "90s", completed: true },
        { name: "Bench Press", sets: 4, reps: "8-10", rest: "120s", completed: true },
        { name: "Rows", sets: 3, reps: "10-12", rest: "60s", completed: true },
        { name: "Shoulder Press", sets: 3, reps: "10-12", rest: "60s", completed: true }
      ]
    },
    {
      id: 2,
      name: "Lower Body Power",
      day: "Wednesday", 
      duration: "50 min",
      difficulty: "Intermediate",
      completed: true,
      exercises: [
        { name: "Squats", sets: 4, reps: "10-12", rest: "120s", completed: true },
        { name: "Deadlifts", sets: 4, reps: "6-8", rest: "150s", completed: true },
        { name: "Lunges", sets: 3, reps: "12 each leg", rest: "60s", completed: true },
        { name: "Calf Raises", sets: 3, reps: "15-20", rest: "45s", completed: true }
      ]
    },
    {
      id: 3,
      name: "Cardio & Core",
      day: "Friday",
      duration: "35 min", 
      difficulty: "Intermediate",
      completed: false,
      exercises: [
        { name: "Burpees", sets: 3, reps: "10", rest: "60s", completed: false },
        { name: "Mountain Climbers", sets: 3, reps: "20", rest: "45s", completed: false },
        { name: "Plank", sets: 3, reps: "60s hold", rest: "60s", completed: false },
        { name: "Russian Twists", sets: 3, reps: "20", rest: "45s", completed: false }
      ]
    },
    {
      id: 4,
      name: "Full Body Circuit",
      day: "Saturday",
      duration: "40 min", 
      difficulty: "Intermediate",
      completed: false,
      exercises: [
        { name: "Jumping Jacks", sets: 3, reps: "30", rest: "30s", completed: false },
        { name: "Bodyweight Squats", sets: 3, reps: "15", rest: "45s", completed: false },
        { name: "Push-ups", sets: 3, reps: "10", rest: "45s", completed: false },
        { name: "High Knees", sets: 3, reps: "20", rest: "30s", completed: false }
      ]
    }
  ];

  const [workouts, setWorkouts] = useState(isTrainer ? trainerWorkouts : clientWorkouts);

  const toggleWorkoutCompletion = (workoutId: number) => {
    setWorkouts(workouts.map(workout => {
      if (workout.id === workoutId) {
        return {
          ...workout,
          completed: !workout.completed
        };
      }
      return workout;
    }));
  };

  const handleWorkoutClick = (workoutId: number) => {
    navigate(`/workout/${workoutId}`);
  };

  const completedWorkouts = workouts.filter(w => w.completed).length;
  const progressPercentage = (completedWorkouts / workouts.length) * 100;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Intermediate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'; 
      case 'Advanced': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-6 lg:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gradient">
                {isTrainer ? 'Training Plans' : 'My Workouts'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isTrainer ? 'Manage client workout programs' : 'Track your workout progress and stay consistent'}
              </p>
            </div>
            {isTrainer && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => navigate('/create-exercise')}
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/10 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  <Dumbbell className="w-4 h-4 mr-2" />
                  Create Exercise
                </Button>
                <Button 
                  onClick={() => navigate('/create-workout')}
                  className="gradient-orange hover:gradient-orange-dark text-background font-semibold transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  <Dumbbell className="w-4 h-4 mr-2" />
                  Create Workout
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        {/* Weekly Progress */}
        <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Dumbbell className="w-5 h-5 text-primary" />
              <span>{isTrainer ? 'Overall Progress' : 'Weekly Progress'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-2xl lg:text-3xl font-bold text-foreground">
                  {completedWorkouts} / {workouts.length} Workouts
                </span>
                <Badge variant={progressPercentage >= 80 ? "default" : "secondary"} 
                       className={progressPercentage >= 80 ? "gradient-orange text-background" : ""}>
                  {Math.round(progressPercentage)}% Complete
                </Badge>
              </div>
              <Progress value={progressPercentage} className="h-3 bg-secondary" />
            </div>
          </CardContent>
        </Card>

        {/* Workout Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {workouts.map((workout) => (
            <Card key={workout.id} className={`transform hover:scale-[1.02] transition-all duration-300 shadow-xl cursor-pointer ${
              workout.completed 
                ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30' 
                : 'bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/80'
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Dumbbell className="w-6 h-6 text-primary" />
                      <CardTitle className={`text-xl ${workout.completed ? 'text-green-400' : 'text-foreground'}`}>
                        {workout.name}
                      </CardTitle>
                    </div>
                    <CardDescription className="flex flex-wrap items-center gap-4 text-base">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {workout.duration}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {workout.day}
                      </span>
                      {isTrainer && 'clientName' in workout && (
                        <span className="flex items-center text-muted-foreground">
                          <User className="w-4 h-4 mr-1" />
                          {(workout as any).clientName}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={getDifficultyColor(workout.difficulty)}>
                      {workout.difficulty}
                    </Badge>
                    {workout.completed && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {workout.exercises.length} exercises
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {workout.exercises.filter(e => e.completed).length} completed
                    </span>
                  </div>
                  
                  <Progress 
                    value={(workout.exercises.filter(e => e.completed).length / workout.exercises.length) * 100} 
                    className="h-2 bg-secondary" 
                  />
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleWorkoutClick(workout.id)}
                      className="flex-1 gradient-orange text-background"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWorkoutCompletion(workout.id);
                      }}
                      className={workout.completed ? "bg-green-500/10 border-green-500/30 text-green-400" : ""}
                    >
                      {workout.completed ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrainingPlan;
