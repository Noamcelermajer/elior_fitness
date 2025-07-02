
import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Dumbbell, Users, Save } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from 'react-hook-form';

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
}

interface Workout {
  name: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  exercises: Exercise[];
}

const CreateWorkoutPage = () => {
  const [exercises, setExercises] = useState<Exercise[]>([
    { id: '1', name: 'Push-ups', sets: 3, reps: '12-15', rest: '60s', notes: 'Keep core tight' },
    { id: '2', name: 'Squats', sets: 4, reps: '10-12', rest: '90s', notes: 'Full range of motion' },
    { id: '3', name: 'Pull-ups', sets: 3, reps: '8-10', rest: '120s', notes: 'Controlled movement' },
  ]);

  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [newExercise, setNewExercise] = useState({ name: '', sets: 3, reps: '', rest: '60s', notes: '' });

  const form = useForm<Workout>({
    defaultValues: {
      name: '',
      duration: '',
      difficulty: 'Intermediate',
      exercises: []
    }
  });

  const addExercise = () => {
    if (newExercise.name && newExercise.reps) {
      const exercise: Exercise = {
        id: Date.now().toString(),
        ...newExercise
      };
      setExercises([...exercises, exercise]);
      setNewExercise({ name: '', sets: 3, reps: '', rest: '60s', notes: '' });
    }
  };

  const deleteExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
    setSelectedExercises(selectedExercises.filter(ex => ex.id !== id));
  };

  const toggleExerciseSelection = (exercise: Exercise) => {
    const isSelected = selectedExercises.find(ex => ex.id === exercise.id);
    if (isSelected) {
      setSelectedExercises(selectedExercises.filter(ex => ex.id !== exercise.id));
    } else {
      setSelectedExercises([...selectedExercises, exercise]);
    }
  };

  const createWorkout = (data: Workout) => {
    const workout = {
      ...data,
      exercises: selectedExercises
    };
    console.log('Creating workout:', workout);
    // Here you would typically save to your backend
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
                Manage Exercises
              </TabsTrigger>
              <TabsTrigger value="workout" className="data-[state=active]:bg-primary data-[state=active]:text-background">
                Create Workout
              </TabsTrigger>
            </TabsList>

            {/* Exercises Management Tab */}
            <TabsContent value="exercises" className="space-y-6">
              {/* Add New Exercise */}
              <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="w-5 h-5 text-primary" />
                    <span>Add New Exercise</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="exerciseName">Exercise Name</Label>
                      <Input
                        id="exerciseName"
                        value={newExercise.name}
                        onChange={(e) => setNewExercise({...newExercise, name: e.target.value})}
                        placeholder="e.g., Push-ups"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sets">Sets</Label>
                      <Input
                        id="sets"
                        type="number"
                        value={newExercise.sets}
                        onChange={(e) => setNewExercise({...newExercise, sets: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="reps">Reps</Label>
                      <Input
                        id="reps"
                        value={newExercise.reps}
                        onChange={(e) => setNewExercise({...newExercise, reps: e.target.value})}
                        placeholder="e.g., 10-12"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rest">Rest</Label>
                      <Input
                        id="rest"
                        value={newExercise.rest}
                        onChange={(e) => setNewExercise({...newExercise, rest: e.target.value})}
                        placeholder="e.g., 60s"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Input
                      id="notes"
                      value={newExercise.notes}
                      onChange={(e) => setNewExercise({...newExercise, notes: e.target.value})}
                      placeholder="Any special instructions..."
                    />
                  </div>
                  <Button onClick={addExercise} className="mt-4 gradient-orange text-background">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Exercise
                  </Button>
                </CardContent>
              </Card>

              {/* Exercise Library */}
              <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl">
                <CardHeader>
                  <CardTitle>Exercise Library</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {exercises.map((exercise) => (
                      <div key={exercise.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl border border-border/30">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{exercise.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {exercise.sets} sets × {exercise.reps} reps • Rest: {exercise.rest}
                          </p>
                          {exercise.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{exercise.notes}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant={selectedExercises.find(ex => ex.id === exercise.id) ? "default" : "outline"}
                            onClick={() => toggleExerciseSelection(exercise)}
                            className={selectedExercises.find(ex => ex.id === exercise.id) ? "gradient-orange text-background" : ""}
                          >
                            {selectedExercises.find(ex => ex.id === exercise.id) ? 'Selected' : 'Select'}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteExercise(exercise.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Create Workout Tab */}
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
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
                          name="duration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duration</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 45 min" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="difficulty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Difficulty</FormLabel>
                              <FormControl>
                                <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                  <option value="Beginner">Beginner</option>
                                  <option value="Intermediate">Intermediate</option>
                                  <option value="Advanced">Advanced</option>
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Selected Exercises */}
                      <div>
                        <Label className="text-base font-semibold">Selected Exercises ({selectedExercises.length})</Label>
                        <div className="mt-4 space-y-3">
                          {selectedExercises.map((exercise, index) => (
                            <div key={exercise.id} className="flex items-center space-x-4 p-4 bg-primary/10 rounded-xl border border-primary/20">
                              <Badge variant="outline">{index + 1}</Badge>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground">{exercise.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {exercise.sets} sets × {exercise.reps} reps • Rest: {exercise.rest}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleExerciseSelection(exercise)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          {selectedExercises.length === 0 && (
                            <p className="text-muted-foreground text-center py-8">
                              No exercises selected. Go to the Exercises tab to select exercises for this workout.
                            </p>
                          )}
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full gradient-orange text-background font-semibold transform hover:scale-105 transition-all duration-200"
                        disabled={selectedExercises.length === 0}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Create Workout
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
