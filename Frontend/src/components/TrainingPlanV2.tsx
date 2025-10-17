import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, Clock, CheckCircle, Circle, TrendingUp, Timer, Weight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface Exercise {
  id: number;
  name: string;
  description: string;
  muscle_group: string;
  equipment: string;
}

interface WorkoutExercise {
  id: number;
  exercise_id: number;
  exercise: Exercise;
  order_index: number;
  target_sets: number;
  target_reps: string;
  target_weight: number;
  rest_seconds: number;
  tempo: string;
  notes: string;
  video_url: string;
}

interface WorkoutDay {
  id: number;
  name: string;
  day_type: string;
  order_index: number;
  notes: string;
  estimated_duration: number;
  workout_exercises: WorkoutExercise[];
}

interface WorkoutPlan {
  id: number;
  name: string;
  description: string;
  split_type: string;
  days_per_week: number;
  duration_weeks: number;
  is_active: boolean;
  workout_days: WorkoutDay[];
}

interface SetCompletion {
  id: number;
  workout_exercise_id: number;
  set_number: number;
  reps_completed: number;
  weight_used: number;
  rest_taken: number;
  rpe: number;
  completed_at: string;
}

const TrainingPlanV2 = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [setCompletions, setSetCompletions] = useState<SetCompletion[]>([]);
  const [activeExercise, setActiveExercise] = useState<number | null>(null);
  const [tempSets, setTempSets] = useState<{ [key: string]: { reps: string; weight: string } }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchWorkoutPlan();
      fetchTodaySetCompletions();
    }
  }, [user]);

  const fetchWorkoutPlan = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/v2/workouts/plans?client_id=${user?.id}&active_only=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setWorkoutPlan(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch workout plan:', error);
      setError('Failed to load workout plan');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaySetCompletions = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_BASE_URL}/v2/workouts/set-completions?client_id=${user?.id}&date=${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSetCompletions(data);
      }
    } catch (error) {
      console.error('Failed to fetch set completions:', error);
    }
  };

  const logSet = async (exerciseId: number, setNumber: number) => {
    const key = `${exerciseId}-${setNumber}`;
    const tempSet = tempSets[key];
    
    if (!tempSet?.reps || !tempSet?.weight) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/v2/workouts/set-completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workout_exercise_id: exerciseId,
          set_number: setNumber,
          reps_completed: parseInt(tempSet.reps),
          weight_used: parseFloat(tempSet.weight),
          completed_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const newSet = await response.json();
        setSetCompletions([...setCompletions, newSet]);
        
        // Clear temp data
        const newTempSets = { ...tempSets };
        delete newTempSets[key];
        setTempSets(newTempSets);
      }
    } catch (error) {
      console.error('Failed to log set:', error);
    }
  };

  const isSetCompleted = (exerciseId: number, setNumber: number) => {
    return setCompletions.some(
      c => c.workout_exercise_id === exerciseId && c.set_number === setNumber
    );
  };

  const getCompletedSet = (exerciseId: number, setNumber: number) => {
    return setCompletions.find(
      c => c.workout_exercise_id === exerciseId && c.set_number === setNumber
    );
  };

  const updateTempSet = (exerciseId: number, setNumber: number, field: 'reps' | 'weight', value: string) => {
    const key = `${exerciseId}-${setNumber}`;
    setTempSets({
      ...tempSets,
      [key]: {
        ...tempSets[key],
        [field]: value,
      },
    });
  };

  const getDayIcon = (dayType: string) => {
    switch (dayType.toLowerCase()) {
      case 'push':
        return '💪';
      case 'pull':
        return '↕️';
      case 'legs':
        return '🦵';
      case 'upper':
        return '⬆️';
      case 'lower':
        return '⬇️';
      case 'full_body':
        return '🏋️';
      default:
        return '📅';
    }
  };

  const formatRestTime = (seconds: number) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="pb-20 lg:pb-8">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Loading workout plan...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!workoutPlan) {
    return (
      <div className="pb-20 lg:pb-8">
        <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-6 lg:py-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl lg:text-3xl font-bold text-gradient">{t('training.myWorkouts')}</h1>
            <p className="text-muted-foreground mt-1">Track your training and progress</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-medium">{t('training.noActiveWorkoutPlan')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('training.noWorkoutPlanAssigned')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-6 lg:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gradient">
                {workoutPlan.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                {workoutPlan.description || 'Your personalized workout program'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-sm">
                {workoutPlan.split_type.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {workoutPlan.days_per_week} days/week
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        {/* Workout Days */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Workout Days ({workoutPlan.workout_days.length})</h2>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            {workoutPlan.workout_days.map((day) => (
              <AccordionItem key={day.id} value={`day-${day.id}`} className="border rounded-lg">
                <Card>
                  <AccordionTrigger className="hover:no-underline px-6 py-4">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl">{getDayIcon(day.day_type)}</span>
                        <div className="text-left">
                          <p className="font-semibold text-lg">{day.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center">
                            <Dumbbell className="w-3 h-3 mr-1" />
                            {day.workout_exercises.length} exercises
                            {day.estimated_duration && (
                              <>
                                <span className="mx-2">•</span>
                                <Clock className="w-3 h-3 mr-1" />
                                {day.estimated_duration} min
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-6 pb-4">
                    {day.notes && (
                      <p className="text-sm text-muted-foreground mb-4 italic">{day.notes}</p>
                    )}
                    
                    <div className="space-y-4">
                      {day.workout_exercises.map((exercise, index) => (
                        <Card key={exercise.id} className="border-2">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base flex items-center">
                                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">
                                    {index + 1}
                                  </span>
                                  {exercise.exercise.name}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {exercise.exercise.muscle_group} | {exercise.exercise.equipment}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent>
                            {/* Exercise Info */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                              <div className="text-center p-2 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground">{t('training.sets')}</p>
                                <p className="text-lg font-bold">{exercise.target_sets}</p>
                              </div>
                              <div className="text-center p-2 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground">Reps</p>
                                <p className="text-lg font-bold">{exercise.target_reps}</p>
                              </div>
                              <div className="text-center p-2 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground">{t('training.rest')}</p>
                                <p className="text-lg font-bold">{formatRestTime(exercise.rest_seconds)}</p>
                              </div>
                            </div>

                            {exercise.target_weight && (
                              <div className="mb-4 p-2 bg-primary/10 rounded-lg">
                                <p className="text-sm text-center">
                                  <Weight className="w-4 h-4 inline mr-1" />
                                  Target Weight: <span className="font-bold">{exercise.target_weight} kg</span>
                                </p>
                              </div>
                            )}

                            {exercise.notes && (
                              <p className="text-sm text-muted-foreground mb-4 p-2 bg-muted/50 rounded italic">
                                {exercise.notes}
                              </p>
                            )}

                            {/* Set Tracking */}
                            <div className="space-y-2">
                              <p className="text-sm font-semibold mb-2">Track Your Sets:</p>
                              {Array.from({ length: exercise.target_sets }).map((_, setIndex) => {
                                const setNumber = setIndex + 1;
                                const completed = isSetCompleted(exercise.id, setNumber);
                                const completedSet = getCompletedSet(exercise.id, setNumber);
                                const key = `${exercise.id}-${setNumber}`;

                                return (
                                  <div 
                                    key={setNumber} 
                                    className={`flex items-center space-x-2 p-3 rounded-lg border ${
                                      completed ? 'bg-green-500/10 border-green-500/30' : 'bg-card'
                                    }`}
                                  >
                                    <span className="text-sm font-medium w-16">Set {setNumber}</span>
                                    
                                    {completed ? (
                                      <>
                                        <div className="flex-1 flex items-center space-x-2">
                                          <CheckCircle className="w-5 h-5 text-green-500" />
                                          <span className="text-sm">
                                            {completedSet?.reps_completed} reps × {completedSet?.weight_used} kg
                                          </span>
                                        </div>
                                        <Badge className="gradient-green text-background">{t('training.completed')}</Badge>
                                      </>
                                    ) : (
                                      <>
                                        <Input
                                          type="number"
                                          placeholder="Reps"
                                          className="w-20"
                                          value={tempSets[key]?.reps || ''}
                                          onChange={(e) => updateTempSet(exercise.id, setNumber, 'reps', e.target.value)}
                                        />
                                        <Input
                                          type="number"
                                          step="0.5"
                                          placeholder="Weight"
                                          className="w-24"
                                          value={tempSets[key]?.weight || ''}
                                          onChange={(e) => updateTempSet(exercise.id, setNumber, 'weight', e.target.value)}
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => logSet(exercise.id, setNumber)}
                                          disabled={!tempSets[key]?.reps || !tempSets[key]?.weight}
                                          className="gradient-green text-background"
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {error && (
          <Card className="bg-destructive/10 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-center">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TrainingPlanV2;




