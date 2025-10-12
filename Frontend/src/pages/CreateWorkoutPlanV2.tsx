import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface WorkoutExercise {
  exercise_id: number;
  exercise_name?: string;
  order_index: number;
  target_sets: number;
  target_reps: string;
  target_weight: number | null;
  rest_seconds: number;
  tempo: string;
  notes: string;
}

interface WorkoutDay {
  name: string;
  day_type: string;
  order_index: number;
  notes: string;
  estimated_duration: number | null;
  exercises: WorkoutExercise[];
}

interface WorkoutPlanFormData {
  client_id: number;
  name: string;
  description: string;
  split_type: string;
  days_per_week: number | null;
  duration_weeks: number | null;
  notes: string;
  workout_days: WorkoutDay[];
}

const CreateWorkoutPlanV2: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const client = location.state?.client;

  const [formData, setFormData] = useState<WorkoutPlanFormData>({
    client_id: client?.id || 0,
    name: '',
    description: '',
    split_type: 'push_pull_legs',
    days_per_week: 6,
    duration_weeks: 8,
    notes: '',
    workout_days: [],
  });

  const [clients, setClients] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showExerciseSelector, setShowExerciseSelector] = useState<{ mealIndex: number; dayIndex: number } | null>(null);

  // Role-based access control
  useEffect(() => {
    if (user) {
      if (user.role === 'CLIENT') {
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate]);

  // Fetch exercises and clients
  useEffect(() => {
    fetchExercises();
    if (!client && user?.role === 'TRAINER') {
      fetchClients();
    }
  }, [client, user]);

  // Initialize workout days based on split type
  useEffect(() => {
    initializeWorkoutDays(formData.split_type);
  }, [formData.split_type]);

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

  const initializeWorkoutDays = (splitType: string) => {
    let days: WorkoutDay[] = [];

    switch (splitType) {
      case 'push_pull_legs':
        days = [
          { name: 'Push Day 1', day_type: 'push', order_index: 0, notes: '', estimated_duration: null, exercises: [] },
          { name: 'Pull Day 1', day_type: 'pull', order_index: 1, notes: '', estimated_duration: null, exercises: [] },
          { name: 'Leg Day 1', day_type: 'legs', order_index: 2, notes: '', estimated_duration: null, exercises: [] },
          { name: 'Push Day 2', day_type: 'push', order_index: 3, notes: '', estimated_duration: null, exercises: [] },
          { name: 'Pull Day 2', day_type: 'pull', order_index: 4, notes: '', estimated_duration: null, exercises: [] },
          { name: 'Leg Day 2', day_type: 'legs', order_index: 5, notes: '', estimated_duration: null, exercises: [] },
        ];
        setFormData(prev => ({ ...prev, days_per_week: 6, workout_days: days }));
        break;

      case 'upper_lower':
        days = [
          { name: 'Upper Body 1', day_type: 'upper', order_index: 0, notes: '', estimated_duration: null, exercises: [] },
          { name: 'Lower Body 1', day_type: 'lower', order_index: 1, notes: '', estimated_duration: null, exercises: [] },
          { name: 'Upper Body 2', day_type: 'upper', order_index: 2, notes: '', estimated_duration: null, exercises: [] },
          { name: 'Lower Body 2', day_type: 'lower', order_index: 3, notes: '', estimated_duration: null, exercises: [] },
        ];
        setFormData(prev => ({ ...prev, days_per_week: 4, workout_days: days }));
        break;

      case 'full_body':
        days = [
          { name: 'Full Body 1', day_type: 'full_body', order_index: 0, notes: '', estimated_duration: null, exercises: [] },
          { name: 'Full Body 2', day_type: 'full_body', order_index: 1, notes: '', estimated_duration: null, exercises: [] },
          { name: 'Full Body 3', day_type: 'full_body', order_index: 2, notes: '', estimated_duration: null, exercises: [] },
        ];
        setFormData(prev => ({ ...prev, days_per_week: 3, workout_days: days }));
        break;

      case 'bro_split':
        days = [
          { name: 'Chest Day', day_type: 'chest', order_index: 0, notes: '', estimated_duration: null, exercises: [] },
          { name: 'Back Day', day_type: 'back', order_index: 1, notes: '', estimated_duration: null, exercises: [] },
          { name: 'Shoulder Day', day_type: 'shoulders', order_index: 2, notes: '', estimated_duration: null, exercises: [] },
          { name: 'Arm Day', day_type: 'arms', order_index: 3, notes: '', estimated_duration: null, exercises: [] },
          { name: 'Leg Day', day_type: 'legs', order_index: 4, notes: '', estimated_duration: null, exercises: [] },
        ];
        setFormData(prev => ({ ...prev, days_per_week: 5, workout_days: days }));
        break;

      case 'custom':
        days = [
          { name: 'Day 1', day_type: 'custom', order_index: 0, notes: '', estimated_duration: null, exercises: [] },
        ];
        setFormData(prev => ({ ...prev, days_per_week: null, workout_days: days }));
        break;

      default:
        break;
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
      target_sets: 3,
      target_reps: '8-12',
      target_weight: null,
      rest_seconds: 90,
      tempo: '',
      notes: '',
    });

    setFormData({ ...formData, workout_days: newDays });
    setShowExerciseSelector(null);
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
      name: `Day ${newDays.length + 1}`,
      day_type: 'custom',
      order_index: newDays.length,
      notes: '',
      estimated_duration: null,
      exercises: [],
    });
    setFormData({ ...formData, workout_days: newDays });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

         const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/v2/workouts/plans/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create workout plan');
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create Workout Plan</h1>
            <p className="text-muted-foreground">New workout system with splits and detailed tracking</p>
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
                className="w-full px-3 py-2 border rounded-md"
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: parseInt(e.target.value) })}
              >
                <option value={0}>Select client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
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
              <Label htmlFor="name">Plan Name *</Label>
              <Input
                id="name"
                placeholder="e.g., PPL Hypertrophy Phase 1"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="duration_weeks">Duration (weeks)</Label>
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Overall plan description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <Separator />

          {/* Split Type Selection */}
          <div>
            <Label>Workout Split Type *</Label>
            <RadioGroup value={formData.split_type} onValueChange={(value) => setFormData({ ...formData, split_type: value })}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <Card className={`cursor-pointer ${formData.split_type === 'push_pull_legs' ? 'border-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="push_pull_legs" id="ppl" />
                      <Label htmlFor="ppl" className="cursor-pointer flex-1">
                        <div className="font-semibold">Push/Pull/Legs</div>
                        <div className="text-xs text-muted-foreground">💪 ↕️ 🦵 (6 days/week)</div>
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer ${formData.split_type === 'upper_lower' ? 'border-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="upper_lower" id="ul" />
                      <Label htmlFor="ul" className="cursor-pointer flex-1">
                        <div className="font-semibold">Upper/Lower</div>
                        <div className="text-xs text-muted-foreground">⬆️ ⬇️ (4 days/week)</div>
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer ${formData.split_type === 'full_body' ? 'border-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="full_body" id="fb" />
                      <Label htmlFor="fb" className="cursor-pointer flex-1">
                        <div className="font-semibold">Full Body</div>
                        <div className="text-xs text-muted-foreground">🏋️ (3 days/week)</div>
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer ${formData.split_type === 'bro_split' ? 'border-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bro_split" id="bro" />
                      <Label htmlFor="bro" className="cursor-pointer flex-1">
                        <div className="font-semibold">Bro Split</div>
                        <div className="text-xs text-muted-foreground">Chest/Back/Shoulders/Arms/Legs</div>
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer ${formData.split_type === 'custom' ? 'border-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label htmlFor="custom" className="cursor-pointer flex-1">
                        <div className="font-semibold">Custom</div>
                        <div className="text-xs text-muted-foreground">📅 Build your own</div>
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Workout Days */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Workout Days ({formData.workout_days.length})</CardTitle>
            {formData.split_type === 'custom' && (
              <Button size="sm" onClick={addWorkoutDay}>
                <Plus className="h-4 w-4 mr-2" />
                Add Day
              </Button>
            )}
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
                          placeholder="e.g., Push Day, Chest & Triceps"
                          value={day.name}
                          onChange={(e) => updateWorkoutDay(dayIndex, 'name', e.target.value)}
                        />
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
                          onClick={() => setShowExerciseSelector({ mealIndex: 0, dayIndex })}
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

                              {/* Exercise Parameters */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                  <Label className="text-xs">Sets (מס סטים) *</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={exercise.target_sets}
                                    onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'target_sets', parseInt(e.target.value) || 1)}
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
                                    value={exercise.rest_seconds}
                                    onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'rest_seconds', parseInt(e.target.value) || 90)}
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
                      {showExerciseSelector?.dayIndex === dayIndex && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                            <CardHeader>
                              <CardTitle>Select Exercise</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {exercises.map(exercise => (
                                  <Card
                                    key={exercise.id}
                                    className="p-3 cursor-pointer hover:bg-accent"
                                    onClick={() => addExerciseToDay(dayIndex, exercise.id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-semibold">{exercise.name}</p>
                                        <p className="text-sm text-muted-foreground capitalize">{exercise.muscle_group}</p>
                                      </div>
                                      <Plus className="h-5 w-5" />
                                    </div>
                                  </Card>
                                ))}
                              </div>

                              <div className="flex justify-end mt-4">
                                <Button variant="outline" onClick={() => setShowExerciseSelector(null)}>
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
              Select a split type above to get started
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
          {loading ? 'Creating...' : 'Create Workout Plan'}
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

