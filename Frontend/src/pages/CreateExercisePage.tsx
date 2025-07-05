import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Dumbbell, Save, AlertCircle } from 'lucide-react';
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

interface ExerciseFormData {
  name: string;
  description: string;
  instructions: string;
  muscle_group: string;
  equipment_needed: string;
  video_url: string;
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

const CreateExercisePage = () => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<ExerciseFormData>({
    defaultValues: {
      name: '',
      description: '',
      instructions: '',
      muscle_group: '',
      equipment_needed: '',
      video_url: ''
    }
  });

  // Fetch existing exercises
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

  useEffect(() => {
    fetchExercises();
  }, []);

  const onSubmit = async (data: ExerciseFormData) => {
    setLoading(true);
    setSuccess(false);

    try {
      const response = await fetch('http://localhost:8000/api/exercises/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setSuccess(true);
        form.reset();
        fetchExercises(); // Refresh the list
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const errorData = await response.json();
        console.error('Error creating exercise:', errorData);
      }
    } catch (error) {
      console.error('Error creating exercise:', error);
    } finally {
      setLoading(false);
    }
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
                <h1 className="text-2xl lg:text-3xl font-bold text-gradient">Create Exercise</h1>
                <p className="text-muted-foreground mt-1">Add new exercises to your library</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Exercise Form */}
            <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="w-5 h-5 text-primary" />
                  <span>Add New Exercise</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      rules={{ required: "Exercise name is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Exercise Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Push-ups" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="muscle_group"
                      rules={{ required: "Muscle group is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Muscle Group</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select muscle group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {muscleGroups.map((group) => (
                                <SelectItem key={group.value} value={group.value}>
                                  {group.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Brief description of the exercise..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="instructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            <span>Step-by-Step Instructions</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Detailed instructions on how to perform the exercise correctly..."
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            These instructions will be shown to clients when they perform this exercise
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="equipment_needed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipment Needed</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Dumbbells, Resistance band, Bodyweight" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="video_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Video URL (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="YouTube or other video demonstration URL" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full gradient-orange text-background font-semibold"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin"></div>
                          <span>Creating...</span>
                        </div>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Create Exercise
                        </>
                      )}
                    </Button>

                    {success && (
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-green-800 dark:text-green-200 text-sm font-medium">
                          Exercise created successfully!
                        </p>
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Exercise Library */}
            <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle>Exercise Library</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {exercises.length} exercises available
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {exercises.map((exercise) => (
                    <div key={exercise.id} className="p-4 bg-secondary/50 rounded-xl border border-border/30">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-foreground">{exercise.name}</h4>
                        <Badge className={`${getMuscleGroupColor(exercise.muscle_group)} text-white`}>
                          {muscleGroups.find(g => g.value === exercise.muscle_group)?.label || exercise.muscle_group}
                        </Badge>
                      </div>
                      
                      {exercise.description && (
                        <p className="text-sm text-muted-foreground mb-2">{exercise.description}</p>
                      )}
                      
                      {exercise.instructions && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
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
                  ))}
                  
                  {exercises.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No exercises created yet</p>
                      <p className="text-sm">Create your first exercise using the form</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateExercisePage; 