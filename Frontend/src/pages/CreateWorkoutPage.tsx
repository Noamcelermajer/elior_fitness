import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Dumbbell, Users, Save, AlertCircle, Edit, Search } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';

interface Exercise {
  id: number;
  name: string;
  description: string;
  instructions: string;
  muscle_group: string;
  equipment_needed: string;
  video_url: string;
  created_by: number;
}

interface SelectedExercise {
  exercise: Exercise;
  sets: number;
  reps: string;
  rest_time: number;
  weight: number;
  notes: string;
  order: number;
}

interface WorkoutFormData {
  name: string;
  description: string;
  client_id: number;
}

const muscleGroups = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'legs', label: 'Legs' },
  { value: 'core', label: 'Core' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'other', label: 'Other' }
];

const CreateWorkoutPage = () => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const form = useForm<WorkoutFormData>({
    defaultValues: {
      name: '',
      description: '',
      client_id: 0
    }
  });

  // Fetch exercises from database
  const fetchExercises = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/exercises/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setExercises(data);
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  // Fetch clients for the trainer
  const fetchClients = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/users/clients', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  useEffect(() => {
    fetchExercises();
    fetchClients();
  }, []);

  // Filter exercises by category and search
  const filteredExercises = exercises.filter(exercise => {
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || exercise.muscle_group === selectedCategory;
    const matchesSearch = !searchTerm || 
      exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exercise.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addExerciseToWorkout = (exercise: Exercise) => {
    const newSelectedExercise: SelectedExercise = {
      exercise,
      sets: 3,
      reps: '8-12',
      rest_time: 60,
      weight: 0,
      notes: '',
      order: selectedExercises.length + 1
    };
    setSelectedExercises([...selectedExercises, newSelectedExercise]);
  };

  const removeExerciseFromWorkout = (exerciseId: number) => {
    setSelectedExercises(selectedExercises.filter(ex => ex.exercise.id !== exerciseId));
    // Reorder remaining exercises
    setSelectedExercises(prev => 
      prev.filter(ex => ex.exercise.id !== exerciseId)
         .map((ex, index) => ({ ...ex, order: index + 1 }))
    );
  };

  const updateExerciseDetails = (exerciseId: number, field: keyof SelectedExercise, value: any) => {
    setSelectedExercises(prev => 
      prev.map(ex => 
        ex.exercise.id === exerciseId 
          ? { ...ex, [field]: value }
          : ex
      )
    );
  };

  const startEditingNotes = (exerciseId: number, currentNotes: string) => {
    setEditingNotes(exerciseId);
    setEditNotes(currentNotes);
  };

  const saveEditedNotes = () => {
    if (editingNotes) {
      updateExerciseDetails(editingNotes, 'notes', editNotes);
      setEditingNotes(null);
      setEditNotes('');
    }
  };

  const cancelEditingNotes = () => {
    setEditingNotes(null);
    setEditNotes('');
  };

  const getMuscleGroupColor = (muscleGroup: string) => {
    const colors: { [key: string]: string } = {
      chest: 'bg-red-500',
      back: 'bg-blue-500',
      shoulders: 'bg-green-500',
      biceps: 'bg-purple-500',
      triceps: 'bg-orange-500',
      legs: 'bg-yellow-500',
      core: 'bg-pink-500',
      cardio: 'bg-indigo-500',
      full_body: 'bg-gray-500',
      other: 'bg-slate-500'
    };
    return colors[muscleGroup] || 'bg-gray-500';
  };

  const createWorkout = async (data: WorkoutFormData) => {
    if (selectedExercises.length === 0) {
      alert('Please add at least one exercise to the workout');
      return;
    }

    setLoading(true);
    try {
      // Create workout plan
      const workoutPlanData = {
        name: data.name,
        description: data.description,
        client_id: data.client_id
      };

      const response = await fetch('http://localhost:8000/api/workouts/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(workoutPlanData)
      });

      if (response.ok) {
        const workoutPlan = await response.json();
        console.log('Workout plan created successfully:', workoutPlan);

        // Create a workout session
        const sessionData = {
          name: `${data.name} - Session 1`,
          day_of_week: 0, // Monday
          notes: data.description
        };

        const sessionResponse = await fetch(`http://localhost:8000/api/workouts/${workoutPlan.id}/sessions/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(sessionData)
        });

        if (sessionResponse.ok) {
          const session = await sessionResponse.json();
          console.log('Workout session created successfully:', session);

          // Add exercises to the session
          const exercisesData = {
            exercises: selectedExercises.map((selectedExercise, index) => ({
              exercise_id: selectedExercise.exercise.id,
              order: index + 1,
              sets: selectedExercise.sets,
              reps: selectedExercise.reps,
              weight: selectedExercise.weight,
              rest_time: selectedExercise.rest_time,
              notes: selectedExercise.notes
            }))
          };

          const exercisesResponse = await fetch(`http://localhost:8000/api/workouts/sessions/${session.id}/exercises/bulk/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(exercisesData)
          });

          if (exercisesResponse.ok) {
            const exercises = await exercisesResponse.json();
            console.log('Exercises added successfully:', exercises);
            alert('Workout created successfully!');
            // Here you would typically redirect to the workout detail page
          } else {
            console.error('Error adding exercises to workout');
            alert('Workout plan created but failed to add exercises');
          }
        } else {
          console.error('Error creating workout session');
          alert('Workout plan created but failed to create session');
        }
      } else {
        console.error('Error creating workout plan');
        alert('Failed to create workout plan');
      }
    } catch (error) {
      console.error('Error creating workout:', error);
      alert('Error creating workout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout currentPage="training">
      <div className="pb-20 lg:pb-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-6 lg:py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 gradient-orange rounded-xl flex items-center justify-center shadow-xl">
                <Dumbbell className="w-7 h-7 text-background" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gradient">Create Workout</h1>
                <p className="text-muted-foreground mt-1">Design custom workout routines for your clients</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
          <Tabs defaultValue="exercises" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
              <TabsTrigger value="exercises" className="data-[state=active]:bg-primary data-[state=active]:text-background">
                Select Exercises
              </TabsTrigger>
              <TabsTrigger value="workout" className="data-[state=active]:bg-primary data-[state=active]:text-background">
                Workout Details
              </TabsTrigger>
            </TabsList>

            {/* Exercise Selection Tab */}
            <TabsContent value="exercises" className="space-y-6">
              {/* Filters */}
              <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl">
                <CardHeader>
                  <CardTitle>Exercise Library</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Filter by Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All categories</SelectItem>
                          {muscleGroups.map((group) => (
                            <SelectItem key={group.value} value={group.value}>
                              {group.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Search Exercises</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search exercises..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Exercise Grid */}
                  <div className="grid gap-4 max-h-[500px] overflow-y-auto">
                    {filteredExercises.map((exercise) => {
                      const isSelected = selectedExercises.some(ex => ex.exercise.id === exercise.id);
                      return (
                        <div key={exercise.id} className="p-4 bg-secondary/50 rounded-xl border border-border/30">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-semibold text-foreground">{exercise.name}</h4>
                                <Badge className={`${getMuscleGroupColor(exercise.muscle_group)} text-white`}>
                                  {muscleGroups.find(g => g.value === exercise.muscle_group)?.label}
                                </Badge>
                              </div>
                              
                              {exercise.description && (
                                <p className="text-sm text-muted-foreground mb-2">{exercise.description}</p>
                              )}
                              
                              {exercise.instructions && (
                                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                  <p className="text-xs text-blue-800 dark:text-blue-200">
                                    {exercise.instructions}
                                  </p>
                                </div>
                              )}
                              
                              {exercise.equipment_needed && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Equipment: {exercise.equipment_needed}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={isSelected ? "default" : "outline"}
                              onClick={() => isSelected ? removeExerciseFromWorkout(exercise.id) : addExerciseToWorkout(exercise)}
                              className={isSelected ? "gradient-orange text-background" : ""}
                            >
                              {isSelected ? 'Remove' : 'Add'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {filteredExercises.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No exercises found</p>
                        <p className="text-sm">Try adjusting your filters or create new exercises</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Workout Details Tab */}
            <TabsContent value="workout" className="space-y-6">
              <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span>Workout Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(createWorkout)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          rules={{ required: "Workout name is required" }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Workout Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Upper Body Strength" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="client_id"
                          rules={{ required: "Client is required" }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a client" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {clients.map((client) => (
                                    <SelectItem key={client.id} value={client.id.toString()}>
                                      {client.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the workout goals and focus areas..."
                                className="min-h-[80px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Selected Exercises */}
                      <div>
                        <Label className="text-base font-semibold">
                          Selected Exercises ({selectedExercises.length})
                        </Label>
                        <div className="mt-4 space-y-4">
                          {selectedExercises.map((selectedExercise, index) => (
                            <div key={selectedExercise.exercise.id} className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">{selectedExercise.order}</Badge>
                                  <h4 className="font-semibold text-foreground">{selectedExercise.exercise.name}</h4>
                                  <Badge className={`${getMuscleGroupColor(selectedExercise.exercise.muscle_group)} text-white`}>
                                    {muscleGroups.find(g => g.value === selectedExercise.exercise.muscle_group)?.label}
                                  </Badge>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeExerciseFromWorkout(selectedExercise.exercise.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>

                              {/* Exercise Parameters */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                <div>
                                  <Label className="text-xs">Sets</Label>
                                  <Input
                                    type="number"
                                    value={selectedExercise.sets}
                                    onChange={(e) => updateExerciseDetails(selectedExercise.exercise.id, 'sets', parseInt(e.target.value))}
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Reps</Label>
                                  <Input
                                    value={selectedExercise.reps}
                                    onChange={(e) => updateExerciseDetails(selectedExercise.exercise.id, 'reps', e.target.value)}
                                    placeholder="8-12"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Weight (kg)</Label>
                                  <Input
                                    type="number"
                                    value={selectedExercise.weight}
                                    onChange={(e) => updateExerciseDetails(selectedExercise.exercise.id, 'weight', parseFloat(e.target.value))}
                                    placeholder="0"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Rest (seconds)</Label>
                                  <Input
                                    type="number"
                                    value={selectedExercise.rest_time}
                                    onChange={(e) => updateExerciseDetails(selectedExercise.exercise.id, 'rest_time', parseInt(e.target.value))}
                                    className="text-sm"
                                  />
                                </div>
                              </div>

                              {/* Client-Specific Notes */}
                              <div>
                                <Label className="text-xs flex items-center space-x-1">
                                  <AlertCircle className="w-3 h-3 text-orange-500" />
                                  <span>Client-Specific Modifications</span>
                                </Label>
                                {editingNotes === selectedExercise.exercise.id ? (
                                  <div className="mt-2 space-y-2">
                                    <Textarea
                                      value={editNotes}
                                      onChange={(e) => setEditNotes(e.target.value)}
                                      placeholder="Add client-specific modifications, injury considerations, or special instructions..."
                                      className="min-h-[60px] text-xs"
                                    />
                                    <div className="flex space-x-2">
                                      <Button size="sm" onClick={saveEditedNotes} className="text-xs">
                                        Save
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={cancelEditingNotes} className="text-xs">
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-2">
                                    {selectedExercise.notes ? (
                                      <div className="p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                                        <p className="text-xs text-orange-800 dark:text-orange-200">
                                          {selectedExercise.notes}
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">No modifications added</p>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => startEditingNotes(selectedExercise.exercise.id, selectedExercise.notes)}
                                      className="mt-2 text-xs"
                                    >
                                      <Edit className="w-3 h-3 mr-1" />
                                      {selectedExercise.notes ? 'Edit Notes' : 'Add Notes'}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {selectedExercises.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <p>No exercises selected</p>
                              <p className="text-sm">Go to the Exercises tab to select exercises for this workout</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full gradient-orange text-background font-semibold"
                        disabled={selectedExercises.length === 0 || loading}
                      >
                        {loading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin"></div>
                            <span>Creating...</span>
                          </div>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Create Workout
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default CreateWorkoutPage;
