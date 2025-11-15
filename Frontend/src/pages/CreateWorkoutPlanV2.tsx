import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface WorkoutExercise {
  exercise_id: number;
  exercise_name?: string;
  order_index: number;
  target_sets: number | null;
  target_reps: string;
  target_weight: number | null;
  rest_seconds: number | null;
  tempo: string;
  notes: string;
  group_name?: string;
  video_url?: string | null;
}

interface WorkoutDay {
  name: string;
  day_type: string;
  order_index: number;
  notes: string;
  estimated_duration: number | null;
  exercises: WorkoutExercise[];
}

interface WorkoutSplit {
  id: number;
  name: string;
  description?: string;
  days_per_week?: number | null;
}

interface WorkoutPlanFormData {
  client_id: number;
  name: string;
  description: string;
  split_type: string | null;
  days_per_week: number | null;
  duration_weeks: number | null;
  notes: string;
  is_active: boolean;
  workout_days: WorkoutDay[];
}

const CreateWorkoutPlanV2: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const client = location.state?.client;
  const existingPlan = location.state?.workoutPlan;
  const isEditing = Boolean(existingPlan);

  const [formData, setFormData] = useState<WorkoutPlanFormData>({
    client_id: client?.id || 0,
    name: '',
    description: '',
    split_type: null,
    days_per_week: null,
    duration_weeks: 8,
    notes: '',
    is_active: true,
    workout_days: [{ name: 'יום 1', day_type: 'custom', order_index: 0, notes: '', estimated_duration: null, exercises: [] }],
  });

  const [clients, setClients] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [workoutSplits, setWorkoutSplits] = useState<WorkoutSplit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const [newSplitName, setNewSplitName] = useState('');
  const [newSplitDescription, setNewSplitDescription] = useState('');
  const [newSplitDaysPerWeek, setNewSplitDaysPerWeek] = useState<number | null>(null);
  const [showCreateSplitDialog, setShowCreateSplitDialog] = useState(false);
  const hasHydratedExistingPlan = useRef(false);

  // Role-based access control
  useEffect(() => {
    if (user) {
      if (user.role === 'CLIENT') {
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate]);

  // Update client_id when client is loaded
  useEffect(() => {
    if (client?.id && formData.client_id !== client.id) {
      setFormData(prev => ({ ...prev, client_id: client.id }));
    }
  }, [client, formData.client_id]);

  // Fetch exercises, clients, and workout splits
  useEffect(() => {
    fetchExercises();
    fetchWorkoutSplits();
    if (!client && user?.role === 'TRAINER') {
      fetchClients();
    }
  }, [client, user]);

  // Check for createSplit query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('createSplit') === 'true') {
      setShowCreateSplitDialog(true);
      // Clean up URL
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, navigate, location.pathname]);

  // Hydrate form with existing plan data when editing
  useEffect(() => {
    if (!existingPlan || hasHydratedExistingPlan.current) {
      return;
    }

    const mappedDays: WorkoutDay[] = (existingPlan.workout_days || []).map((day: any, idx: number) => ({
      name: day.name,
      day_type: day.day_type || 'custom',
      order_index: idx,
      notes: day.notes || '',
      estimated_duration: day.estimated_duration ?? null,
      exercises: (day.workout_exercises || []).map((exercise: any, exerciseIndex: number) => ({
        exercise_id: exercise.exercise_id,
        exercise_name: exercise.exercise?.name || exercise.exercise_name || '',
        order_index: exerciseIndex,
        target_sets: exercise.target_sets ?? null,
        target_reps: exercise.target_reps ?? '',
        target_weight: exercise.target_weight ?? null,
        rest_seconds: exercise.rest_seconds ?? null,
        tempo: exercise.tempo ?? '',
        notes: exercise.notes ?? '',
        group_name: exercise.group_name ?? '',
        video_url: exercise.video_url || exercise.exercise?.video_url || null,
      })),
    }));

    setFormData({
      client_id: client?.id || existingPlan.client_id,
      name: existingPlan.name || '',
      description: existingPlan.description || '',
      split_type: existingPlan.split_type || null,
      days_per_week: existingPlan.days_per_week ?? null,
      duration_weeks: existingPlan.duration_weeks ?? null,
      notes: existingPlan.notes || '',
      is_active: existingPlan.is_active ?? true,
      workout_days: mappedDays.length
        ? mappedDays
        : [
            {
              name: 'יום 1',
              day_type: 'custom',
              order_index: 0,
              notes: '',
              estimated_duration: null,
              exercises: [],
            },
          ],
    });

    hasHydratedExistingPlan.current = true;
  }, [existingPlan, client]);

  const fetchClients = async () => {
    try {
         const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/users/clients`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setClients(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchExercises = async () => {
    try {
         const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/exercises/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setExercises(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    }
  };

  const fetchWorkoutSplits = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/workout-splits/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setWorkoutSplits(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch workout splits:', error);
    }
  };

  const createWorkoutSplit = async () => {
    if (!newSplitName.trim()) {
      setError('Split name is required');
      return;
    }
    
    try {
      setError('');
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/workout-splits/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSplitName.trim(),
          description: newSplitDescription?.trim() || null,
          days_per_week: newSplitDaysPerWeek || null,
        }),
      });

      if (response.ok) {
        const newSplit = await response.json();
        setWorkoutSplits([...workoutSplits, newSplit]);
        setFormData({ ...formData, split_type: String(newSplit.id) });
        setNewSplitName('');
        setNewSplitDescription('');
        setNewSplitDaysPerWeek(null);
        setShowCreateSplitDialog(false);
        setError('');
      } else {
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Failed to create workout split';
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorMessage;
          } else {
            const text = await response.text();
            if (text) errorMessage = text;
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        setError(errorMessage);
        console.error('Failed to create workout split:', response.status, errorMessage);
      }
    } catch (error) {
      console.error('Failed to create workout split:', error);
      setError('Failed to create workout split: ' + (error instanceof Error ? error.message : String(error)));
    }
  };


  const addExerciseToDay = (dayIndex: number, exerciseId: number) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    const newDays = [...formData.workout_days];
    const orderIndex = newDays[dayIndex].exercises.length;

    newDays[dayIndex].exercises.push({
      exercise_id: exerciseId,
      exercise_name: exercise.name,
      order_index: orderIndex,
      target_sets: null,
      target_reps: '',
      target_weight: null,
      rest_seconds: null,
      tempo: '',
      notes: '',
      group_name: '',
      video_url: exercise.video_url || null,
    });

    setFormData({ ...formData, workout_days: newDays });
    setActiveDayIndex(null);
  };

  const updateWorkoutDay = (dayIndex: number, field: keyof WorkoutDay, value: any) => {
    const newDays = [...formData.workout_days];
    newDays[dayIndex][field] = value;
    setFormData({ ...formData, workout_days: newDays });
  };

  const updateExercise = (dayIndex: number, exerciseIndex: number, field: keyof WorkoutExercise, value: any) => {
    const newDays = [...formData.workout_days];
    newDays[dayIndex].exercises[exerciseIndex][field] = value;
    setFormData({ ...formData, workout_days: newDays });
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const newDays = [...formData.workout_days];
    newDays[dayIndex].exercises.splice(exerciseIndex, 1);
    // Update order_index for remaining exercises
    newDays[dayIndex].exercises.forEach((ex, idx) => {
      ex.order_index = idx;
    });
    setFormData({ ...formData, workout_days: newDays });
  };

  const addWorkoutDay = () => {
    const newDays = [...formData.workout_days];
    newDays.push({
      name: `יום ${newDays.length + 1}`,
      day_type: 'custom',
      order_index: newDays.length,
      notes: '',
      estimated_duration: null,
      exercises: [],
    });
    setFormData({ ...formData, workout_days: newDays });
  };

  const sanitizeString = (value?: string | null) => {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate client_id
      if (!formData.client_id || formData.client_id === 0) {
        setError('Please select a client');
        setLoading(false);
        return;
      }

         const token = localStorage.getItem('access_token');
      const payload: any = {
        client_id: formData.client_id,
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        days_per_week: formData.days_per_week || null,
        duration_weeks: formData.duration_weeks || null,
        notes: formData.notes?.trim() || null,
        workout_days: formData.workout_days.map((day, dayIdx) => {
          const dayPayload: any = {
            name: day.name.trim(),
            order_index: dayIdx,
            notes: sanitizeString(day.notes) || null,
            estimated_duration: day.estimated_duration || null,
            exercises: day.exercises.map((exercise, exerciseIdx) => ({
              exercise_id: exercise.exercise_id,
              order_index: exerciseIdx,
              target_sets: exercise.target_sets && exercise.target_sets >= 1 ? exercise.target_sets : null,
              target_reps: sanitizeString(exercise.target_reps) || null,
              target_weight: exercise.target_weight || null,
              rest_seconds: exercise.rest_seconds && exercise.rest_seconds >= 0 ? exercise.rest_seconds : null,
              tempo: sanitizeString(exercise.tempo) || null,
              notes: sanitizeString(exercise.notes) || null,
              group_name: sanitizeString(exercise.group_name) || null,
              video_url: exercise.video_url || null,
            })),
          };
          if (day.day_type) {
            dayPayload.day_type = day.day_type;
          }
          return dayPayload;
        }),
      };
      
      // Only send split_type if it's a valid enum value, not a workout split ID
      // Workout splits are separate from split_type enum
      if (formData.split_type) {
        const validSplitTypes = ['push_pull_legs', 'upper_lower', 'full_body', 'bro_split', 'custom'];
        if (validSplitTypes.includes(formData.split_type)) {
          payload.split_type = formData.split_type;
        }
        // If it's not a valid enum (e.g., workout split ID), don't send it
        // The backend will default to CUSTOM
      }

      const response = await fetch(`${API_BASE_URL}/v2/workouts/plans/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create workout plan';
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            if (errorData.detail) {
              if (Array.isArray(errorData.detail)) {
                errorMessage = errorData.detail.map((err: any) => 
                  `${err.loc?.join('.')}: ${err.msg}`
                ).join(', ');
              } else {
                errorMessage = errorData.detail;
              }
            }
          } catch (parseError) {
            // If JSON parsing fails, use status text
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
        } else {
          // If response is not JSON (e.g., HTML error page), use status text
          const text = await response.text();
          errorMessage = `Server error: ${response.status} ${response.statusText}. ${text.substring(0, 100)}`;
        }
        throw new Error(errorMessage);
      }

      // Success!
      navigate('/trainer-dashboard');
    } catch (error: any) {
      console.error('Failed to create workout plan:', error);
      setError(error.message || 'Failed to create workout plan');
    } finally {
      setLoading(false);
    }
  };

  const getDayTypeIcon = (type: string) => {
    switch (type) {
      case 'push': return '💪';
      case 'pull': return '↕️';
      case 'legs': return '🦵';
      case 'upper': return '⬆️';
      case 'lower': return '⬇️';
      case 'chest': return '🫁';
      case 'back': return '🔙';
      case 'shoulders': return '👐';
      case 'arms': return '💪';
      case 'full_body': return '🏋️';
      case 'cardio': return '🏃';
      default: return '📅';
    }
  };

  const isFormValid = () => {
    return (
      formData.client_id > 0 &&
      formData.name.trim() !== '' &&
      formData.workout_days.length > 0 &&
      formData.workout_days.every(day => day.name.trim() !== '' && day.exercises.length > 0)
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('clientProfile.back')}</span>
          </Button>
          <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {isEditing ? t('workoutCreation.updateTitle') : t('workoutCreation.title')}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">{t('workoutCreation.subtitle')}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Plan Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Plan Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Client Selection */}
          {!client && (
            <div>
              <Label htmlFor="client">Client *</Label>
              <select
                id="client"
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: parseInt(e.target.value) })}
              >
                <option value={0} className="bg-background text-foreground">Select client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id} className="bg-background text-foreground">{c.full_name} ({c.email})</option>
                ))}
              </select>
            </div>
          )}

          {client && (
            <div className="p-4 bg-muted rounded-md">
              <Label>Client</Label>
              <p className="font-semibold">{client.full_name}</p>
              <p className="text-sm text-muted-foreground">{client.email}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">{t('workoutCreation.planNameRequired')}</Label>
              <Input
                id="name"
                placeholder={t('workoutCreation.planNamePlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="duration_weeks">{t('workoutCreation.durationWeeks')}</Label>
              <Input
                id="duration_weeks"
                type="number"
                min={1}
                placeholder="8"
                value={formData.duration_weeks || ''}
                onChange={(e) => setFormData({ ...formData, duration_weeks: parseInt(e.target.value) || null })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">{t('workoutCreation.description')}</Label>
            <Textarea
              id="description"
              placeholder="Overall plan description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <Separator />

          {/* Workout Split Selection */}
          <div>
            <Label>{t('workoutCreation.splitType', 'סוג פיצול האימון')}</Label>
            <div className="flex gap-2 mt-2">
              <Select
                value={formData.split_type ? String(formData.split_type) : ''}
                onValueChange={(value) => {
                  const selectedSplit = workoutSplits.find(s => s.id === parseInt(value));
                  setFormData({
                    ...formData,
                    split_type: value || null,
                    days_per_week: selectedSplit?.days_per_week ?? null,
                  });
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t('workoutCreation.selectSplit', 'בחר פיצול אימון (אופציונלי)')} />
                </SelectTrigger>
                <SelectContent>
                  {workoutSplits.map((split) => (
                    <SelectItem key={split.id} value={String(split.id)}>
                      {split.name}
                      {split.days_per_week ? ` (${split.days_per_week} ${t('workoutCreation.daysPerWeek', 'ימים בשבוע')})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={showCreateSplitDialog} onOpenChange={setShowCreateSplitDialog}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('workoutCreation.createSplit', 'צור פיצול')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('workoutCreation.createNewSplit', 'צור פיצול אימון חדש')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>{t('workoutCreation.splitName', 'שם הפיצול')} *</Label>
                      <Input
                        placeholder={t('workoutCreation.splitNamePlaceholder', 'למשל, Push/Pull/Legs')}
                        value={newSplitName}
                        onChange={(e) => setNewSplitName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>{t('workoutCreation.description')}</Label>
                      <Textarea
                        placeholder={t('workoutCreation.splitDescriptionPlaceholder', 'תיאור קצר של הפיצול')}
                        value={newSplitDescription}
                        onChange={(e) => setNewSplitDescription(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>{t('workoutCreation.daysPerWeek', 'ימים בשבוע')}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={7}
                        placeholder="6"
                        value={newSplitDaysPerWeek || ''}
                        onChange={(e) => setNewSplitDaysPerWeek(e.target.value ? parseInt(e.target.value) : null)}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateSplitDialog(false)}>
                        {t('clientProfile.cancel', 'ביטול')}
                      </Button>
                      <Button
                        onClick={createWorkoutSplit}
                        disabled={!newSplitName.trim()}
                      >
                        {t('workoutCreation.create', 'צור')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('workoutCreation.splitHint', 'פיצול האימון הוא רק לציון - אתה מגדיר את הימים באופן ידני')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Workout Days */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Workout Days ({formData.workout_days.length})</CardTitle>
            <Button size="sm" onClick={addWorkoutDay}>
              <Plus className="h-4 w-4 mr-2" />
              {t('workoutCreation.addDay', 'הוסף יום')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {formData.workout_days.map((day, dayIndex) => (
              <AccordionItem key={dayIndex} value={`day-${dayIndex}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getDayTypeIcon(day.day_type)}</span>
                    <span className="font-semibold">{day.name}</span>
                    <Badge variant="outline">{day.exercises.length} exercises</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    {/* Day Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Day Name *</Label>
                        <Input
                          placeholder={`יום ${dayIndex + 1} (e.g., Push Day, Chest & Triceps)`}
                          value={day.name}
                          onChange={(e) => updateWorkoutDay(dayIndex, 'name', e.target.value)}
                          required
                          className={day.name.trim() === '' ? 'border-destructive' : ''}
                        />
                        {day.name.trim() === '' && (
                          <p className="text-xs text-destructive mt-1">Please enter a day name</p>
                        )}
                      </div>
                      <div>
                        <Label>Estimated Duration (min)</Label>
                        <Input
                          type="number"
                          placeholder="60"
                          value={day.estimated_duration || ''}
                          onChange={(e) => updateWorkoutDay(dayIndex, 'estimated_duration', parseInt(e.target.value) || null)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Day-specific notes..."
                        value={day.notes}
                        onChange={(e) => updateWorkoutDay(dayIndex, 'notes', e.target.value)}
                        rows={2}
                      />
                    </div>

                    <Separator />

                    {/* Exercises */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label>Exercises ({day.exercises.length})</Label>
                        <Button
                          size="sm"
                          variant="outline"
                onClick={() => setActiveDayIndex(dayIndex)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Exercise
                        </Button>
                      </div>

                      {day.exercises.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded">
                          No exercises yet. Click "Add Exercise" to get started.
                        </p>
                      )}

                      <div className="space-y-3">
                        {day.exercises.map((exercise, exerciseIndex) => (
                          <Card key={exerciseIndex} className="p-4">
                            <div className="space-y-3">
                              {/* Exercise Name */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                                  <span className="font-semibold">{exercise.exercise_name || `Exercise ${exerciseIndex + 1}`}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeExercise(dayIndex, exerciseIndex)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">{t('workoutCreation.groupName')}</Label>
                                  <Input
                                    placeholder={t('workoutCreation.groupNamePlaceholder')}
                                    value={exercise.group_name || ''}
                                    onChange={(e) =>
                                      updateExercise(dayIndex, exerciseIndex, 'group_name', e.target.value)
                                    }
                                  />
                                  <p className="mt-1 text-[10px] text-muted-foreground">
                                    {t('workoutCreation.groupNameHint')}
                                  </p>
                                </div>
                              </div>

                              {/* Exercise Parameters */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                  <Label className="text-xs">Sets (מס סטים) *</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={10}
                                value={exercise.target_sets ?? ''}
                                onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'target_sets', e.target.value ? parseInt(e.target.value) : null)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Reps (מס חזרות) *</Label>
                                  <Input
                                    placeholder="8-12"
                                    value={exercise.target_reps}
                                    onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'target_reps', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Weight (kg) (משקל)</Label>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    placeholder="60"
                                    value={exercise.target_weight || ''}
                                    onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'target_weight', parseFloat(e.target.value) || null)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Rest (sec) (מנוחה) *</Label>
                                  <Input
                                    type="number"
                                    step="15"
                                    placeholder="90"
                                  value={exercise.rest_seconds ?? ''}
                                  onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'rest_seconds', e.target.value ? parseInt(e.target.value) : null)}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Tempo (optional)</Label>
                                  <Input
                                    placeholder="e.g., 3-0-1-0"
                                    value={exercise.tempo}
                                    onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'tempo', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Notes</Label>
                                  <Input
                                    placeholder="Focus on form, controlled descent..."
                                    value={exercise.notes}
                                    onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'notes', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>

                      {/* Exercise Selector Modal */}
                      {activeDayIndex === dayIndex && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                            <CardHeader>
                              <CardTitle>Select Exercise</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {exercises.length === 0 ? (
                                  <p className="text-center text-muted-foreground py-4">
                                    No exercises available. Please create exercises first.
                                  </p>
                                ) : (
                                  exercises.map(exercise => (
                                    <Card
                                      key={exercise.id}
                                      className="p-3 cursor-pointer hover:bg-accent"
                                      onClick={() => addExerciseToDay(dayIndex, exercise.id)}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-semibold">{exercise.name || 'Unnamed Exercise'}</p>
                                          <p className="text-sm text-muted-foreground capitalize">{exercise.muscle_group}</p>
                                        </div>
                                        <Plus className="h-5 w-5" />
                                      </div>
                                    </Card>
                                  ))
                                )}
                              </div>

                              <div className="flex justify-end mt-4">
                                <Button variant="outline" onClick={() => setActiveDayIndex(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {formData.workout_days.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {t('workoutCreation.addFirstDay', 'לחץ על "הוסף יום" כדי להתחיל')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid() || loading}
          className="gradient-green"
        >
          <Save className="mr-2 h-4 w-4" />
          {loading
            ? t(isEditing ? 'workoutCreation.updating' : 'workoutCreation.creating')
            : t(isEditing ? 'workoutCreation.updateWorkoutPlan' : 'workoutCreation.createWorkoutPlan')}
        </Button>
      </div>

      {/* Form Status */}
      <div className="mt-4 text-sm text-muted-foreground text-center">
        {!isFormValid() && (
          <p>
            Fill in all required fields and add at least one exercise to each day
          </p>
        )}
      </div>
    </div>
  );
};

export default CreateWorkoutPlanV2;

