import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeHelp,
  CheckCircle2,
  Clock,
  Dumbbell,
  History,
  Loader2,
  PlayCircle,
  Video,
  Weight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
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

  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [exerciseDetails, setExerciseDetails] = useState<Record<number, ExerciseDetail>>({});
  const [setCompletions, setSetCompletions] = useState<SetCompletion[]>([]);
  const [previousSessions, setPreviousSessions] = useState<Record<number, PreviousSession>>({});
  const [tempSets, setTempSets] = useState<Record<string, { reps: string; weight: string }>>({});
  const [customSetCounts, setCustomSetCounts] = useState<Record<number, number>>({});
  const [bodyweightExercises, setBodyweightExercises] = useState<Record<number, boolean>>({});
  const [activeDayId, setActiveDayId] = useState<string>('');
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

        const [plan, completions] = await Promise.all([
          fetchWorkoutPlan(user.id, token),
          fetchSetCompletions(user.id, token),
        ]);

        if (plan) {
          setWorkoutPlan(plan);
          const normalizedDays = normalizeDays(plan.workout_days);
          if (normalizedDays.length > 0) {
            setActiveDayId(String(normalizedDays[0].id));
          }

          const uniqueExerciseIds = Array.from(
            new Set(
              normalizedDays.flatMap((day) =>
                day.workout_exercises.map((exercise) => exercise.exercise_id),
              ),
            ),
          );

          if (uniqueExerciseIds.length > 0) {
            const detailsMap = await fetchExerciseDetails(uniqueExerciseIds, token);
            setExerciseDetails(detailsMap);
          } else {
            setExerciseDetails({});
          }
        } else {
          setWorkoutPlan(null);
          setExerciseDetails({});
        }

        const { todays, previous } = processCompletions(completions);
        setSetCompletions(todays);
        setPreviousSessions(previous);
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

  useEffect(() => {
    if (workoutPlan?.workout_days?.length && !activeDayId) {
      const firstDay = normalizeDays(workoutPlan.workout_days)[0];
      if (firstDay) {
        setActiveDayId(String(firstDay.id));
      }
    }
  }, [workoutPlan, activeDayId]);

  const handleBodyweightToggle = (exerciseId: number) => {
    const newValue = !bodyweightExercises[exerciseId];
    setBodyweightExercises((prev) => ({
      ...prev,
      [exerciseId]: newValue,
    }));

    setTempSets((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${exerciseId}-`)) {
          next[key] = {
            ...next[key],
            weight: newValue ? '0' : '',
          };
        }
      });
      return next;
    });
  };

  const updateTempSet = (
    exerciseId: number,
    setNumber: number,
    field: 'reps' | 'weight',
    value: string,
  ) => {
    const key = `${exerciseId}-${setNumber}`;
    setTempSets((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const handleAddSet = (exerciseId: number) => {
    setCustomSetCounts((prev) => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? 0) + 1,
    }));
  };

  const isSetCompleted = (exerciseId: number, setNumber: number) =>
    setCompletions.some(
      (completion) =>
        completion.workout_exercise_id === exerciseId && completion.set_number === setNumber,
    );

  const getCompletedSet = (exerciseId: number, setNumber: number) =>
    setCompletions.find(
      (completion) =>
        completion.workout_exercise_id === exerciseId && completion.set_number === setNumber,
    );

  const getPreviousSet = (exerciseId: number, setNumber: number) =>
    previousSessions[exerciseId]?.sets?.[setNumber];

  const handleLogSet = async (exerciseId: number, setNumber: number) => {
    const key = `${exerciseId}-${setNumber}`;
    const payload = tempSets[key];

    if (!payload?.reps || (!bodyweightExercises[exerciseId] && !payload.weight)) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('missing_token');
      }

      const response = await fetch(`${API_BASE_URL}/v2/workouts/set-completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workout_exercise_id: exerciseId,
          set_number: setNumber,
          reps_completed: Number(payload.reps),
          weight_used: Number(bodyweightExercises[exerciseId] ? '0' : payload.weight),
          completed_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('failed_request');
      }

      const newCompletion: SetCompletion = await response.json();
      setSetCompletions((prev) => [...prev, newCompletion]);

      setTempSets((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      console.error('Failed to log set:', err);
      const message = t(
        'training.errors.logFailed',
        'לא הצלחנו לשמור את הסט. בדוק את החיבור ונסה שוב.',
      );
      setError(message);
    }
  };

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
    <div className="pb-24 lg:pb-10">
      <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-6 lg:py-8 shadow-sm">
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
                <Badge variant="outline" className="px-3 py-1 text-sm">
                  {t(`training.splitTypes.${workoutPlan.split_type}`, workoutPlan.split_type)}
                </Badge>
              ) : null}
              {workoutPlan.days_per_week ? (
                <Badge variant="outline" className="px-3 py-1 text-sm">
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

      <div className="max-w-6xl mx-auto space-y-6 px-4 lg:px-6 py-6">
        {error && (
          <Card className="border-destructive/40 bg-destructive/10">
            <CardContent className="flex items-center gap-3 pt-6">
              <BadgeHelp className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeDayId} onValueChange={setActiveDayId} className="space-y-6">
          <div className="flex flex-col gap-3">
            <TabsList className="flex w-full justify-start gap-2 overflow-x-auto rounded-xl bg-muted/60 p-1">
              {planDays.map((day) => (
                <TabsTrigger
                  key={day.id}
                  value={String(day.id)}
                  className={cn(
                    'flex min-w-[140px] flex-col items-center gap-1 rounded-lg px-3 py-3 text-xs md:text-sm',
                  )}
                >
                  <span className="font-semibold">
                    {day.name || t(`training.dayTypes.${day.day_type}`, day.day_type)}
                  </span>
                  <span className="text-muted-foreground text-[11px] md:text-xs">
                    {t('training.exercisesCount', {
                      defaultValue: '{{count}} תרגילים',
                      count: day.workout_exercises.length,
                    })}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {planDays.map((day) => (
            <TabsContent key={day.id} value={String(day.id)} className="space-y-5">
              <Card className="border-muted">
                <CardContent className="py-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {day.name || t(`training.dayTypes.${day.day_type}`, day.day_type)}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Dumbbell className="h-4 w-4" />
                          {t('training.exercisesCount', {
                            defaultValue: '{{count}} תרגילים',
                            count: day.workout_exercises.length,
                          })}
                        </span>
                        {day.estimated_duration ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {t('training.estimatedDuration', {
                              defaultValue: '{{minutes}} דק׳',
                              minutes: day.estimated_duration,
                            })}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {day.notes ? (
                      <p className="text-xs text-muted-foreground lg:max-w-md">
                        {day.notes}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-5">
                {day.workout_exercises.map((exercise, index) => {
                  const detail = exerciseDetails[exercise.exercise_id];
                  const resolvedVideoUrl =
                    exercise.video_url || detail?.video_url || VIDEO_FALLBACK_URL;
                  const thumbnail = getVideoThumbnail(resolvedVideoUrl);
                  const exerciseName = detail?.name || exercise.exercise?.name;
                  const machine = detail?.equipment_needed || exercise.exercise?.equipment;
                  const muscleGroup = detail?.muscle_group || exercise.exercise?.muscle_group;
                  const cardSetCount =
                    exercise.target_sets + (customSetCounts[exercise.id] ?? 0);

                  return (
                    <Card
                      key={exercise.id}
                      className="overflow-hidden border border-border/60 shadow-sm"
                    >
                      <CardHeader className="gap-4 space-y-0 pb-0">
                        <div className="flex gap-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <button
                                type="button"
                                className="relative w-28 shrink-0 overflow-hidden rounded-xl border border-border/60 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                aria-label={t('training.watchVideo', 'צפה בווידאו')}
                              >
                                <AspectRatio ratio={9 / 16}>
                                  {thumbnail ? (
                                    <img
                                      src={thumbnail}
                                      alt={exerciseName || t('training.exercise', 'תרגיל')}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-muted">
                                      <Video className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <PlayCircle className="h-10 w-10 text-white drop-shadow" />
                                  </div>
                                </AspectRatio>
                              </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>{exerciseName}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-xl">
                                  <iframe
                                    src={resolvedVideoUrl.replace('watch?v=', 'embed/')}
                                    title={exerciseName || ''}
                                    className="h-full w-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </AspectRatio>
                                <p className="text-sm text-muted-foreground">
                                  {resolvedVideoUrl === VIDEO_FALLBACK_URL
                                    ? t(
                                        'training.videoFallback',
                                        'לא סופק וידאו, מציגים סרטון חלופי.',
                                      )
                                    : resolvedVideoUrl}
                                </p>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <div className="flex flex-1 flex-col justify-between gap-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <CardTitle className="text-lg font-semibold leading-tight">
                                  <span className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/90 text-xs font-bold text-primary-foreground shadow-sm">
                                    {index + 1}
                                  </span>
                                  {exerciseName}
                                </CardTitle>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  {muscleGroup ? (
                                    <Badge variant="secondary" className="rounded-full px-2 py-1">
                                      {t(`training.muscleGroupsLabels.${muscleGroup}`, muscleGroup)}
                                    </Badge>
                                  ) : null}
                                  {machine ? (
                                    <Badge variant="secondary" className="rounded-full px-2 py-1">
                                      {machine}
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`bw-${exercise.id}`}
                                  checked={!!bodyweightExercises[exercise.id]}
                                  onCheckedChange={() => handleBodyweightToggle(exercise.id)}
                                />
                                <label
                                  htmlFor={`bw-${exercise.id}`}
                                  className="text-xs font-medium text-muted-foreground"
                                >
                                  {t('training.bodyweight', 'משקל גוף')}
                                </label>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <InfoTile label={t('training.sets')} value={exercise.target_sets} />
                              <InfoTile label={t('training.reps')} value={exercise.target_reps} />
                              <InfoTile label={t('training.rest')} value={formatRestTime(exercise.rest_seconds)} />
                              {exercise.target_weight ? (
                                <InfoTile
                                  label={t('training.targetWeightLabel', 'משקל יעד')}
                                  value={`${exercise.target_weight} ${t('training.kg', 'ק״ג')}`}
                                  icon={Weight}
                                />
                              ) : (
                                <InfoTile
                                  label={t('training.tempo')}
                                  value={exercise.tempo || t('training.tempoNA', 'ללא')}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {detail?.instructions ? (
                          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                            {detail.instructions}
                          </div>
                        ) : null}

                        {exercise.notes ? (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
                            {exercise.notes}
                          </div>
                        ) : null}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">
                              {t('training.trackSets', 'עקוב אחרי הסטים שלך')}
                            </p>
                            {previousSessions[exercise.id]?.sessionDate ? (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <History className="h-3 w-3" />
                                {t('training.lastSession', {
                                  defaultValue: 'האימון הקודם: {{date}}',
                                  date: previousSessions[exercise.id]?.sessionDate,
                                })}
                              </span>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            {Array.from({ length: cardSetCount }).map((_, indexSet) => {
                              const setNumber = indexSet + 1;
                              const completed = isSetCompleted(exercise.id, setNumber);
                              const currentKey = `${exercise.id}-${setNumber}`;
                              const previous = getPreviousSet(exercise.id, setNumber);

                              return (
                                <div
                                  key={currentKey}
                                  className={cn(
                                    'flex flex-col gap-3 rounded-xl border border-border/60 p-4 transition-colors sm:flex-row sm:items-center',
                                    completed ? 'border-emerald-500/40 bg-emerald-500/10' : 'bg-card',
                                  )}
                                >
                                  <div className="flex items-center gap-2 text-sm font-semibold">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                      {setNumber}
                                    </span>
                                  </div>

                                  {completed ? (
                                    <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="flex items-center gap-2 text-sm font-medium">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        {t('training.completedSet', {
                                          defaultValue: '{{reps}} חזרות · {{weight}} ק״ג',
                                          reps: getCompletedSet(exercise.id, setNumber)?.reps_completed ?? 0,
                                          weight: getCompletedSet(exercise.id, setNumber)?.weight_used ?? 0,
                                        })}
                                      </div>
                                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
                                        {t('training.completed')}
                                      </Badge>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                        <div className="flex flex-col gap-1">
                                          <label className="text-xs text-muted-foreground">
                                            {t('training.reps')}
                                          </label>
                                          <Input
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            placeholder={
                                              previous
                                                ? t('training.previousRepsPlaceholder', {
                                                    defaultValue: 'קודם: {{value}}',
                                                    value: previous.reps_completed,
                                                  })
                                                : t('training.enterReps', 'מספר חזרות')
                                            }
                                            value={tempSets[currentKey]?.reps ?? ''}
                                            onChange={(event) =>
                                              updateTempSet(
                                                exercise.id,
                                                setNumber,
                                                'reps',
                                                event.target.value,
                                              )
                                            }
                                            className="w-full sm:w-32"
                                          />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                          <label className="text-xs text-muted-foreground">
                                            {t('training.weight')}
                                          </label>
                                          <Input
                                            type="number"
                                            inputMode="decimal"
                                            min={0}
                                            step="0.5"
                                            disabled={bodyweightExercises[exercise.id]}
                                            placeholder={
                                              bodyweightExercises[exercise.id]
                                                ? t('training.bodyweight', 'משקל גוף')
                                                : previous
                                                ? t('training.previousWeightPlaceholder', {
                                                    defaultValue: 'קודם: {{value}} ק״ג',
                                                    value: previous.weight_used,
                                                  })
                                                : t('training.enterWeight', 'משקל (ק״ג)')
                                            }
                                            value={
                                              bodyweightExercises[exercise.id]
                                                ? '0'
                                                : tempSets[currentKey]?.weight ?? ''
                                            }
                                            onChange={(event) =>
                                              updateTempSet(
                                                exercise.id,
                                                setNumber,
                                                'weight',
                                                event.target.value,
                                              )
                                            }
                                            className="w-full sm:w-32"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {previous ? (
                                          <TooltipProvider delayDuration={200}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Badge
                                                  variant="outline"
                                                  className="hidden border-dashed text-xs text-muted-foreground sm:inline-flex"
                                                >
                                                  {t('training.previousSetShort', {
                                                    defaultValue: '{{reps}}×{{weight}}',
                                                    reps: previous.reps_completed,
                                                    weight: previous.weight_used,
                                                  })}
                                                </Badge>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                {t('training.previousSet', {
                                                  defaultValue: 'האימון הקודם: {{reps}} חזרות · {{weight}} ק״ג',
                                                  reps: previous.reps_completed,
                                                  weight: previous.weight_used,
                                                })}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        ) : null}

                                        <Button
                                          size="sm"
                                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                                          onClick={() => handleLogSet(exercise.id, setNumber)}
                                          disabled={
                                            !tempSets[currentKey]?.reps ||
                                            (!bodyweightExercises[exercise.id] &&
                                              !tempSets[currentKey]?.weight)
                                          }
                                        >
                                          {t('training.saveSet', 'שמור סט')}
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="pt-2">
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-sm text-primary"
                              onClick={() => handleAddSet(exercise.id)}
                            >
                              + {t('training.addSet', 'הוסף סט')}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
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
  const response = await fetch(
    `${API_BASE_URL}/v2/workouts/plans?client_id=${clientId}&active_only=true`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('failed_plan_request');
  }

  const data: WorkoutPlan[] = await response.json();
  return data.length ? data[0] : null;
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

export default TrainingPlanV2;




