import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeHelp,
  CheckCircle2,
  ChevronDown,
  Clock,
  Dumbbell,
  History,
  Loader2,
  MoreHorizontal,
  PlayCircle,
  PlusCircle,
  Video,
  Weight,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '../contexts/AuthContext';

import { API_BASE_URL } from '../config/api';
const VIDEO_FALLBACK_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

interface Exercise {
  id: number;
  name: string;
  description?: string | null;
  muscle_group: string;
  equipment?: string | null;
  video_url?: string | null;
  instructions?: string | null;
}

interface WorkoutExercise {
  id: number;
  exercise_id: number;
  exercise?: Exercise | null;
  order_index: number;
  target_sets: number;
  target_reps: string;
  target_weight?: number | null;
  rest_seconds: number;
  tempo?: string | null;
  notes?: string | null;
  video_url?: string | null;
  group_name?: string | null;
}

interface WorkoutDay {
  id: number;
  name: string;
  day_type: string;
  order_index: number;
  notes?: string | null;
  estimated_duration?: number | null;
  workout_exercises: WorkoutExercise[];
}

interface WorkoutPlan {
  id: number;
  name: string;
  description?: string | null;
  split_type: string;
  days_per_week?: number | null;
  duration_weeks?: number | null;
  is_active: boolean;
  workout_days: WorkoutDay[];
}

interface SetCompletion {
  id: number;
  workout_exercise_id: number;
  set_number: number;
  reps_completed: number;
  weight_used: number;
  rest_taken?: number | null;
  rpe?: number | null;
  completed_at: string;
}

interface ExerciseDetail {
  id: number;
  name: string;
  description?: string | null;
  muscle_group: string;
  equipment_needed?: string | null;
  video_url?: string | null;
  instructions?: string | null;
}

interface PreviousSession {
  sessionDate: string;
  sets: Record<number, SetCompletion>;
}

const formatRestTime = (seconds: number) => {
  if (seconds === null || seconds === undefined) {
    return '';
  }

  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${seconds}s`;
};

const getYoutubeId = (url?: string | null) => {
  if (!url) return null;
  const standardMatch = url.match(/v=([^&]+)/);
  if (standardMatch) return standardMatch[1];
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) return shortMatch[1];
  const embedMatch = url.match(/embed\/([^?]+)/);
  if (embedMatch) return embedMatch[1];
  return null;
};

const getVideoThumbnail = (url?: string | null) => {
  const videoId = getYoutubeId(url || undefined);
  if (!videoId) {
    const fallbackId = getYoutubeId(VIDEO_FALLBACK_URL);
    return fallbackId ? `https://img.youtube.com/vi/${fallbackId}/hqdefault.jpg` : undefined;
  }
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

const normalizeDays = (days: WorkoutDay[]) => [...days].sort((a, b) => a.order_index - b.order_index);

const TrainingPlanV2: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [dayCompletions, setDayCompletions] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('missing_token');
        }

        const plan = await fetchWorkoutPlan(user.id, token);

        if (plan) {
          setWorkoutPlan(plan);
          
          // Fetch day completions only if plan has days
          if (plan.workout_days && plan.workout_days.length > 0) {
            const completionsMap: Record<number, boolean> = {};
            const today = new Date().toISOString().split('T')[0];
            
            await Promise.all(
              plan.workout_days.map(async (day) => {
                try {
                  // Check for today's completed session first, then most recent
                  const sessionResponse = await fetch(
                    `${API_BASE_URL}/v2/workouts/sessions?client_id=${user.id}&workout_day_id=${day.id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  if (sessionResponse.ok) {
                    const sessions = await sessionResponse.json();
                    if (Array.isArray(sessions) && sessions.length > 0) {
                      // Sort by completed_at descending (most recent first)
                      const sortedSessions = sessions
                        .filter((s: any) => s.completed_at)
                        .sort((a: any, b: any) => 
                          new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
                        );
                      
                      // Check if most recent session is completed
                      const mostRecentSession = sortedSessions[0];
                      completionsMap[day.id] = mostRecentSession ? mostRecentSession.is_completed === true : false;
                    } else {
                      completionsMap[day.id] = false;
                    }
                  } else {
                    completionsMap[day.id] = false;
                  }
                } catch (err) {
                  console.error(`Failed to fetch completion for day ${day.id}:`, err);
                  completionsMap[day.id] = false;
                }
              })
            );
            
            setDayCompletions(completionsMap);
          } else {
            setDayCompletions({});
          }
        } else {
          setWorkoutPlan(null);
          setDayCompletions({});
        }
      } catch (err) {
        console.error('Failed to load training data:', err);
        const message =
          err instanceof Error && err.message === 'missing_token'
            ? t('training.errors.missingToken', 'לא נמצא אסימון התחברות. התחבר מחדש.')
            : t('training.errors.loadFailed', 'טעינת תוכנית האימון נכשלה. נסה שוב מאוחר יותר.');
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, t]);


  const planDays = useMemo(
    () => (workoutPlan ? normalizeDays(workoutPlan.workout_days) : []),
    [workoutPlan],
  );

  if (loading) {
    return (
      <div className="pb-20 lg:pb-8">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-3 px-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {t('training.loadingPlan', 'טוען את תוכנית האימון...')}
          </p>
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
            <p className="text-muted-foreground mt-1">
              {t('training.defaultPlanDescription', 'התוכנית האישית שלך לאימונים')}
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
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
    <div className="pb-20">
      <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-4 lg:py-6 shadow-sm">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                {workoutPlan.name}
              </h1>
              <p className="text-muted-foreground mt-2">
                {workoutPlan.description ||
                  t('training.defaultPlanDescription', 'התוכנית האישית שלך לאימונים')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {workoutPlan.split_type ? (
                <Badge variant="outline" className="px-3 py-3 text-sm">
                  {t(`training.splitTypes.${workoutPlan.split_type}`, workoutPlan.split_type)}
                </Badge>
              ) : null}
              {workoutPlan.days_per_week ? (
                <Badge variant="outline" className="px-3 py-3 text-sm">
                  {t('training.daysPerWeek', {
                    defaultValue: '{{count}} אימונים בשבוע',
                    count: workoutPlan.days_per_week,
                  })}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 px-4 lg:px-6 py-4 md:py-6">
        {error && (
          <Card className="border-destructive/40 bg-destructive/10">
            <CardContent className="flex items-center gap-3 pt-4 md:pt-6 px-4 md:px-6">
              <BadgeHelp className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-xs md:text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Training Days List - Similar to Meal Plan UI */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">
            {t('training.trainingDays', 'ימי אימון')} ({planDays.length})
          </h2>
          
          <div className="space-y-3">
            {planDays.map((day, index) => {
              const isCompleted = dayCompletions[day.id] || false;
              const totalExercises = day.workout_exercises.length;
              
              return (
                <Card
                  key={day.id}
                  className={cn(
                    'border rounded-lg cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]',
                    isCompleted && 'border-green-500/30 bg-green-500/5',
                    !isCompleted && 'border-border/60 hover:border-primary/30'
                  )}
                  onClick={() => navigate(`/training/day/${day.id}`)}
                >
                  <CardContent className="px-6 py-4">
                    <div className="flex items-center justify-between w-full gap-4">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className="text-2xl shrink-0 mt-0.5">💪</div>
                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Day Name - Top */}
                          <p className="font-semibold text-lg" dir="auto">
                            {day.name || `יום ${index + 1}`}
                          </p>
                          {/* Notes/Description - Below name */}
                          {day.notes && (
                            <p className="text-sm text-muted-foreground line-clamp-2" dir="auto">
                              {day.notes}
                            </p>
                          )}
                          {/* Exercise count and duration - Bottom */}
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Dumbbell className="w-3.5 h-3.5" />
                              {t('training.exercisesCount', {
                                defaultValue: '{{count}} תרגילים',
                                count: totalExercises,
                              })}
                            </span>
                            {day.estimated_duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {t('training.estimatedDuration', {
                                  defaultValue: '{{minutes}} דק׳',
                                  minutes: day.estimated_duration,
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {isCompleted && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {t('training.completed', 'הושלם')}
                          </Badge>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

interface InfoTileProps {
  label: React.ReactNode;
  value?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}

const InfoTile: React.FC<InfoTileProps> = ({ label, value, icon: Icon }) => (
  <div className="flex flex-col rounded-lg border border-border/60 bg-muted/40 p-3">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <span className="mt-1 flex items-center gap-1 text-sm font-semibold">
      {Icon ? <Icon className="h-3.5 w-3.5 text-primary" /> : null}
      {value ?? '—'}
    </span>
  </div>
);

const fetchWorkoutPlan = async (clientId: number, token: string): Promise<WorkoutPlan | null> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/v2/workouts/plans?client_id=${clientId}&active_only=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      console.error('Failed to fetch workout plan:', response.status, response.statusText);
      throw new Error('failed_plan_request');
    }

    const data: WorkoutPlan[] = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    
    // Prioritize plans with multiple days, then plans with any days, then any plan
    const plansWithDays = data.filter((plan) => plan.workout_days && plan.workout_days.length > 0);
    if (plansWithDays.length === 0) {
      return data[0];
    }
    
    // Sort by number of days (descending) to prioritize plans with more days
    const sortedPlans = plansWithDays.sort((a, b) => {
      const aDays = a.workout_days?.length || 0;
      const bDays = b.workout_days?.length || 0;
      return bDays - aDays;
    });
    
    return sortedPlans[0];
  } catch (err) {
    console.error('Error fetching workout plan:', err);
    throw err;
  }
};

const fetchSetCompletions = async (clientId: number, token: string): Promise<SetCompletion[]> => {
  const response = await fetch(`${API_BASE_URL}/v2/workouts/set-completions?client_id=${clientId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('failed_completions_request');
  }

  return response.json();
};

const fetchExerciseDetails = async (
  exerciseIds: number[],
  token: string,
): Promise<Record<number, ExerciseDetail>> => {
  const detailEntries = await Promise.all(
    exerciseIds.map(async (exerciseId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/v2/workouts/exercises/${exerciseId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`failed_exercise_${exerciseId}`);
        }

        const detail: ExerciseDetail = await response.json();
        return [exerciseId, detail] as const;
      } catch (err) {
        console.warn(`Failed to load exercise detail for ${exerciseId}`, err);
        return [exerciseId, undefined] as const;
      }
    }),
  );

  return detailEntries.reduce<Record<number, ExerciseDetail>>((acc, [id, detail]) => {
    if (detail) {
      acc[id] = detail;
    }
    return acc;
  }, {});
};

const processCompletions = (completions: SetCompletion[]) => {
  const todayKey = new Date().toISOString().split('T')[0];

  const todays = completions.filter((completion) => {
    const completionDate = new Date(completion.completed_at).toISOString().split('T')[0];
    return completionDate === todayKey;
  });

  const previousEntries = completions.filter((completion) => {
    const completionDate = new Date(completion.completed_at).toISOString().split('T')[0];
    return completionDate !== todayKey;
  });

  const groupedByExercise = previousEntries.reduce<
    Record<number, Record<string, SetCompletion[]>>
  >((acc, completion) => {
    const exerciseId = completion.workout_exercise_id;
    const dayKey = new Date(completion.completed_at).toISOString().split('T')[0];

    if (!acc[exerciseId]) {
      acc[exerciseId] = {};
    }

    if (!acc[exerciseId][dayKey]) {
      acc[exerciseId][dayKey] = [];
    }

    acc[exerciseId][dayKey].push(completion);
    return acc;
  }, {});

  const previousSessions: Record<number, PreviousSession> = {};

  Object.entries(groupedByExercise).forEach(([exerciseId, sessions]) => {
    const sortedSessionKeys = Object.keys(sessions).sort((a, b) => (a > b ? -1 : 1));
    const latestSessionKey = sortedSessionKeys[0];
    if (!latestSessionKey) {
      return;
    }

    const latestSessionSets = sessions[latestSessionKey];
    const setMap = latestSessionSets.reduce<Record<number, SetCompletion>>((acc, completion) => {
      const existing = acc[completion.set_number];
      if (
        !existing ||
        new Date(existing.completed_at).getTime() < new Date(completion.completed_at).getTime()
      ) {
        acc[completion.set_number] = completion;
      }
      return acc;
    }, {});

    previousSessions[Number(exerciseId)] = {
      sessionDate: latestSessionKey,
      sets: setMap,
    };
  });

  return { todays, previous: previousSessions };
};

const ExerciseHistoryDialog: React.FC<{ exerciseId: number }> = ({ exerciseId }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [history, setHistory] = useState<SetCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token || !user?.id) return;

        const response = await fetch(
          `${API_BASE_URL}/v2/workouts/set-completions?client_id=${user.id}&workout_exercise_id=${exerciseId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data: SetCompletion[] = await response.json();
          // Group by date
          const grouped = data.sort(
            (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
          );
          setHistory(grouped);
        }
      } catch (error) {
        console.error('Failed to fetch exercise history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [exerciseId, user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{t('training.noHistory', 'אין היסטוריה זמינה')}</p>
      </div>
    );
  }

  // Group by date
  const groupedByDate = history.reduce<Record<string, SetCompletion[]>>((acc, completion) => {
    const date = new Date(completion.completed_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(completion);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(groupedByDate)
        .sort((a, b) => (a[0] > b[0] ? -1 : 1))
        .map(([date, completions]) => (
          <div key={date} className="space-y-2">
            <div className="text-sm font-semibold text-foreground border-b border-border pb-1">
              {new Date(date).toLocaleDateString()}
            </div>
            <div className="space-y-1">
              {completions
                .sort((a, b) => a.set_number - b.set_number)
                .map((completion) => (
                  <div
                    key={completion.id}
                    className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/50"
                  >
                    <span className="text-muted-foreground">
                      Set {completion.set_number}
                    </span>
                    <span className="text-foreground">
                      {completion.weight_used} kg × {completion.reps_completed} reps
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
};

export default TrainingPlanV2;




