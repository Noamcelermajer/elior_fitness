import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useTranslation } from 'react-i18next';

interface Exercise {
  id: number;
  name: string;
  description: string;
  muscle_group: string;
  equipment_needed?: string;
  instructions?: string;
  video_url?: string;
  category?: string;
  created_by: number;
  created_at: string;
}

const muscleGroups = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 
  'legs', 'glutes', 'core', 'cardio', 'full body'
];

const ExerciseBank = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
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
    video_url: '',
    category: ''
  });

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_BASE_URL}/exercises/`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched exercises:', data);
        setExercises(Array.isArray(data) ? data : []);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch exercises:', response.status, errorText);
        toast({
          title: t('common.error'),
          description: t('exerciseBank.errorLoad'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
      toast({
        title: t('common.error'),
        description: t('exerciseBank.errorLoad'),
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
      const response = await fetch(`${API_BASE_URL}/exercises/`, {
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
          title: t('common.success'),
          description: t('exerciseBank.successCreated')
        });
      } else {
        const error = await response.json();
        toast({
          title: t('common.error'),
          description: error.detail || t('exerciseBank.errorCreate'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating exercise:', error);
      toast({
        title: t('common.error'),
        description: t('exerciseBank.errorCreate'),
        variant: "destructive"
      });
    }
  };

  const handleUpdateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExercise) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/exercises/${editingExercise.id}`, {
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
          title: t('common.success'),
          description: t('exerciseBank.successUpdated')
        });
      } else {
        const error = await response.json();
        toast({
          title: t('common.error'),
          description: error.detail || t('exerciseBank.errorUpdate'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
      toast({
        title: t('common.error'),
        description: t('exerciseBank.errorUpdate'),
        variant: "destructive"
      });
    }
  };

  const handleDeleteExercise = async (exerciseId: number) => {
    if (!confirm(t('exerciseBank.deleteConfirm'))) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/exercises/${exerciseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setExercises(exercises.filter(ex => ex.id !== exerciseId));
        toast({
          title: t('common.success'),
          description: t('exerciseBank.successDeleted')
        });
      } else {
        // Try to parse error message from response
        let errorMessage = t('exerciseBank.errorDelete');
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            if (errorData.detail) {
              errorMessage = errorData.detail;
            }
          } else {
            const text = await response.text();
            if (text) {
              errorMessage = text;
            }
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        
        toast({
          title: t('common.error'),
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast({
        title: t('common.error'),
        description: t('exerciseBank.errorDelete'),
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
      video_url: '',
      category: ''
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
      video_url: exercise.video_url || '',
      category: exercise.category || ''
    });
  };

  if (loading) {
    return (
      <Layout currentPage="exercises">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="text-muted-foreground">{t('exerciseBank.loading')}</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="exercises">
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('exerciseBank.title')}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{t('exerciseBank.subtitle')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => navigate('/create-workout-plan-v2?createSplit=true')} 
              variant="outline"
              className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base whitespace-nowrap"
            >
              <Plus className="w-4 h-4 me-2 flex-shrink-0" />
              <span className="truncate">{t('exerciseBank.createWorkoutSplit', 'צור פיצול אימון')}</span>
            </Button>
            <Button 
              onClick={() => setCreateDialogOpen(true)} 
              className="gradient-green w-full sm:w-auto px-4 py-2 text-sm sm:text-base whitespace-nowrap"
            >
              <Plus className="w-4 h-4 me-2 flex-shrink-0" />
              <span className="truncate">{t('exerciseBank.addExercise')}</span>
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-x-4 mb-6 mt-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10"
                  placeholder={t('exerciseBank.searchPlaceholder')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full md:w-[220px]">
                <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                  <SelectTrigger className="h-10 w-full" />
                  <SelectContent>
                    <SelectItem value="all">{t('exerciseBank.allMuscleGroups')}</SelectItem>
                    {muscleGroups.map(group => (
                      <SelectItem key={group} value={group}>{t(`exerciseBank.muscleGroups.${group}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exercise List by Muscle Group */}
        <div className="space-y-6">
          {Object.keys(groupedExercises).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">{t('exerciseBank.noExercises', 'אין תרגילים')}</p>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || selectedMuscleGroup !== 'all' 
                    ? t('exerciseBank.noExercisesFiltered', 'לא נמצאו תרגילים התואמים לחיפוש שלך')
                    : t('exerciseBank.noExercisesDescription', 'עדיין לא נוצרו תרגילים. צור תרגיל חדש כדי להתחיל.')}
                </p>
                {!searchTerm && selectedMuscleGroup === 'all' && (
                  <Button onClick={() => setCreateDialogOpen(true)} className="gradient-green">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('exerciseBank.addExercise')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedExercises).map(([muscleGroup, groupExercises]) => (
              <div key={muscleGroup}>
                <h2 className="text-xl font-semibold mb-3 flex items-center">
                  <Tag className="w-5 h-5 me-2" />
                  {t(`exerciseBank.muscleGroups.${muscleGroup}`)}
                  <Badge variant="secondary" className="ms-2">{groupExercises.length}</Badge>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupExercises.map((exercise) => (
                    <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="text-lg">{exercise.name}</span>
                          <div className="flex gap-1">
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
                            <Weight className="w-4 h-4 me-2 text-muted-foreground" />
                            <span>{exercise.equipment_needed}</span>
                          </div>
                        )}
                        
                        {exercise.video_url && (
                          <div className="flex items-center text-sm">
                            <Video className="w-4 h-4 me-2 text-muted-foreground" />
                            <a href={exercise.video_url} target="_blank" rel="noopener noreferrer" 
                               className="text-primary hover:underline">
                              {t('exerciseBank.videoTutorial')}
                            </a>
                          </div>
                        )}
                        
                        {exercise.instructions && (
                          <div className="flex items-start text-sm">
                            <FileText className="w-4 h-4 me-2 text-muted-foreground mt-0.5" />
                            <p className="text-muted-foreground line-clamp-2">{exercise.instructions}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
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
                {editingExercise ? t('exerciseBank.editExercise') : t('exerciseBank.addNewExercise')}
              </DialogTitle>
              <DialogDescription>
                {editingExercise 
                  ? t('exerciseBank.editDescription')
                  : t('exerciseBank.createDescription')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editingExercise ? handleUpdateExercise : handleCreateExercise} 
                  className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('exerciseBank.exerciseName')}</Label>
                  <Input
                    id="name"
                    value={exerciseForm.name}
                    onChange={(e) => setExerciseForm({...exerciseForm, name: e.target.value})}
                    placeholder={t('exerciseBank.exerciseNamePlaceholder')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="muscle_group">{t('exerciseBank.muscleGroup')}</Label>
                  <Select 
                    value={exerciseForm.muscle_group} 
                    onValueChange={(value) => setExerciseForm({...exerciseForm, muscle_group: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('exerciseBank.selectMuscleGroup')} />
                    </SelectTrigger>
                    <SelectContent>
                      {muscleGroups.map(group => (
                        <SelectItem key={group} value={group}>
                          {t(`exerciseBank.muscleGroups.${group}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">{t('exerciseBank.description')}</Label>
                <Textarea
                  id="description"
                  value={exerciseForm.description}
                  onChange={(e) => setExerciseForm({...exerciseForm, description: e.target.value})}
                  placeholder={t('exerciseBank.descriptionPlaceholder')}
                  rows={3}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="equipment_needed">{t('exerciseBank.equipmentNeeded')}</Label>
                  <Input
                    id="equipment_needed"
                    value={exerciseForm.equipment_needed}
                    onChange={(e) => setExerciseForm({...exerciseForm, equipment_needed: e.target.value})}
                    placeholder={t('exerciseBank.equipmentPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="video_url">{t('exerciseBank.videoUrl')}</Label>
                  <Input
                    id="video_url"
                    type="url"
                    value={exerciseForm.video_url}
                    onChange={(e) => setExerciseForm({...exerciseForm, video_url: e.target.value})}
                    placeholder={t('exerciseBank.videoUrlPlaceholder')}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">{t('exerciseBank.category')}</Label>
                <Input
                  id="category"
                  value={exerciseForm.category}
                  onChange={(e) => setExerciseForm({...exerciseForm, category: e.target.value})}
                  placeholder={t('exerciseBank.categoryPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('exerciseBank.categoryHint')}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instructions">{t('exerciseBank.instructions')}</Label>
                <Textarea
                  id="instructions"
                  value={exerciseForm.instructions}
                  onChange={(e) => setExerciseForm({...exerciseForm, instructions: e.target.value})}
                  placeholder={t('exerciseBank.instructionsPlaceholder')}
                  rows={5}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    setEditingExercise(null);
                    resetForm();
                  }}
                >
                  {t('exerciseBank.cancel')}
                </Button>
                <Button type="submit" className="gradient-green">
                  {editingExercise ? t('exerciseBank.updateExercise') : t('exerciseBank.createExercise')}
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