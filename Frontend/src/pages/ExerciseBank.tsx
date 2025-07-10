import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dumbbell, Plus, Search, Filter, Edit, Trash2, 
  Video, FileText, Tag, Clock, Weight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import { useToast } from '../hooks/use-toast';

interface Exercise {
  id: number;
  name: string;
  description: string;
  muscle_group: string;
  equipment_needed?: string;
  instructions?: string;
  video_url?: string;
  created_by: number;
  created_at: string;
}

const muscleGroups = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 
  'legs', 'glutes', 'core', 'cardio', 'full body'
];

const ExerciseBank = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  
  const [exerciseForm, setExerciseForm] = useState({
    name: '',
    description: '',
    muscle_group: '',
    equipment_needed: '',
    instructions: '',
    video_url: ''
  });

  const fetchExercises = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/workouts/exercises`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExercises(data);
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
      toast({
        title: "Error",
        description: "Failed to load exercises",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const filteredExercises = exercises.filter(exercise =>
    exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedMuscleGroup === 'all' || exercise.muscle_group === selectedMuscleGroup)
  );

  const groupedExercises = filteredExercises.reduce((acc, exercise) => {
    const group = exercise.muscle_group;
    if (!acc[group]) acc[group] = [];
    acc[group].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/workouts/exercises`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exerciseForm)
      });

      if (response.ok) {
        const newExercise = await response.json();
        setExercises([...exercises, newExercise]);
        setCreateDialogOpen(false);
        resetForm();
        toast({
          title: "Success",
          description: "Exercise created successfully"
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.detail || "Failed to create exercise",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating exercise:', error);
      toast({
        title: "Error",
        description: "Failed to create exercise",
        variant: "destructive"
      });
    }
  };

  const handleUpdateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExercise) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/workouts/exercises/${editingExercise.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exerciseForm)
      });

      if (response.ok) {
        const updatedExercise = await response.json();
        setExercises(exercises.map(ex => 
          ex.id === updatedExercise.id ? updatedExercise : ex
        ));
        setEditingExercise(null);
        resetForm();
        toast({
          title: "Success",
          description: "Exercise updated successfully"
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.detail || "Failed to update exercise",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
      toast({
        title: "Error",
        description: "Failed to update exercise",
        variant: "destructive"
      });
    }
  };

  const handleDeleteExercise = async (exerciseId: number) => {
    if (!confirm('Are you sure you want to delete this exercise?')) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/workouts/exercises/${exerciseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setExercises(exercises.filter(ex => ex.id !== exerciseId));
        toast({
          title: "Success",
          description: "Exercise deleted successfully"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete exercise",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast({
        title: "Error",
        description: "Failed to delete exercise",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setExerciseForm({
      name: '',
      description: '',
      muscle_group: '',
      equipment_needed: '',
      instructions: '',
      video_url: ''
    });
  };

  const startEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setExerciseForm({
      name: exercise.name,
      description: exercise.description,
      muscle_group: exercise.muscle_group,
      equipment_needed: exercise.equipment_needed || '',
      instructions: exercise.instructions || '',
      video_url: exercise.video_url || ''
    });
  };

  if (loading) {
    return (
      <Layout currentPage="exercises">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="text-muted-foreground">Loading exercises...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="exercises">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Exercise Bank</h1>
            <p className="text-muted-foreground">Manage your exercise database</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gradient-green">
            <Plus className="w-4 h-4 mr-2" />
            Add Exercise
          </Button>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10"
                  placeholder="Search exercises..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full md:w-[220px]">
                <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                  <SelectTrigger className="h-10 w-full" />
                  <SelectContent>
                    <SelectItem value="all">All Muscle Groups</SelectItem>
                    {muscleGroups.map(group => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exercise List by Muscle Group */}
        <div className="space-y-6">
          {Object.entries(groupedExercises).map(([muscleGroup, groupExercises]) => (
            <div key={muscleGroup}>
              <h2 className="text-xl font-semibold mb-3 flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                {muscleGroup.charAt(0).toUpperCase() + muscleGroup.slice(1)}
                <Badge variant="secondary" className="ml-2">{groupExercises.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupExercises.map((exercise) => (
                  <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-lg">{exercise.name}</span>
                        <div className="flex space-x-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startEdit(exercise)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteExercise(exercise.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{exercise.description}</p>
                      
                      {exercise.equipment_needed && (
                        <div className="flex items-center text-sm">
                          <Weight className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span>{exercise.equipment_needed}</span>
                        </div>
                      )}
                      
                      {exercise.video_url && (
                        <div className="flex items-center text-sm">
                          <Video className="w-4 h-4 mr-2 text-muted-foreground" />
                          <a href={exercise.video_url} target="_blank" rel="noopener noreferrer" 
                             className="text-primary hover:underline">
                            Video Tutorial
                          </a>
                        </div>
                      )}
                      
                      {exercise.instructions && (
                        <div className="flex items-start text-sm">
                          <FileText className="w-4 h-4 mr-2 text-muted-foreground mt-0.5" />
                          <p className="text-muted-foreground line-clamp-2">{exercise.instructions}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Exercise Dialog */}
        <Dialog open={createDialogOpen || !!editingExercise} 
                onOpenChange={(open) => {
                  if (!open) {
                    setCreateDialogOpen(false);
                    setEditingExercise(null);
                    resetForm();
                  }
                }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingExercise ? 'Edit Exercise' : 'Add New Exercise'}
              </DialogTitle>
              <DialogDescription>
                {editingExercise 
                  ? 'Update the exercise details below.'
                  : 'Create a new exercise for your exercise bank.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editingExercise ? handleUpdateExercise : handleCreateExercise} 
                  className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Exercise Name</Label>
                  <Input
                    id="name"
                    value={exerciseForm.name}
                    onChange={(e) => setExerciseForm({...exerciseForm, name: e.target.value})}
                    placeholder="e.g., Bench Press"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="muscle_group">Muscle Group</Label>
                  <Select 
                    value={exerciseForm.muscle_group} 
                    onValueChange={(value) => setExerciseForm({...exerciseForm, muscle_group: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select muscle group" />
                    </SelectTrigger>
                    <SelectContent>
                      {muscleGroups.map(group => (
                        <SelectItem key={group} value={group}>
                          {group.charAt(0).toUpperCase() + group.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={exerciseForm.description}
                  onChange={(e) => setExerciseForm({...exerciseForm, description: e.target.value})}
                  placeholder="Brief description of the exercise"
                  rows={3}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="equipment_needed">Equipment Needed</Label>
                  <Input
                    id="equipment_needed"
                    value={exerciseForm.equipment_needed}
                    onChange={(e) => setExerciseForm({...exerciseForm, equipment_needed: e.target.value})}
                    placeholder="e.g., Barbell, Bench"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="video_url">Video URL</Label>
                  <Input
                    id="video_url"
                    type="url"
                    value={exerciseForm.video_url}
                    onChange={(e) => setExerciseForm({...exerciseForm, video_url: e.target.value})}
                    placeholder="https://youtube.com/..."
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={exerciseForm.instructions}
                  onChange={(e) => setExerciseForm({...exerciseForm, instructions: e.target.value})}
                  placeholder="Step-by-step instructions for performing the exercise"
                  rows={5}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    setEditingExercise(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="gradient-green">
                  {editingExercise ? 'Update Exercise' : 'Create Exercise'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ExerciseBank; 