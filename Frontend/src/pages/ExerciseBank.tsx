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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  Dumbbell, Plus, Search, Filter, Edit, Trash2, 
  Video, FileText, Tag, Clock, Weight, Settings, Save, X, Image as ImageIcon
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
  image_path?: string;
  category?: string;
  created_by: number;
  created_at: string;
}

const staticMuscleGroups = [
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false); // Track if user clicked X to remove image
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [muscleGroups, setMuscleGroups] = useState<string[]>(staticMuscleGroups);
  const [dynamicMuscleGroups, setDynamicMuscleGroups] = useState<Array<{id: number, name: string}>>([]);
  const [muscleGroupDialogOpen, setMuscleGroupDialogOpen] = useState(false);
  const [editingMuscleGroup, setEditingMuscleGroup] = useState<{id: number, name: string} | null>(null);
  const [newMuscleGroupName, setNewMuscleGroupName] = useState('');
  const [muscleGroupError, setMuscleGroupError] = useState('');
  
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

  // Fetch dynamic muscle groups
  useEffect(() => {
    const fetchMuscleGroups = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/muscle-groups/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setDynamicMuscleGroups(data);
          // Combine static and dynamic muscle groups
          const dynamicGroupNames = data.map((mg: {id: number, name: string}) => mg.name.toLowerCase().replace(/\s+/g, '_'));
          const combined = [...staticMuscleGroups, ...dynamicGroupNames].filter((v, i, a) => a.indexOf(v) === i);
          setMuscleGroups(combined);
        }
      } catch (error) {
        console.error('Failed to load muscle groups:', error);
      }
    };
    fetchMuscleGroups();
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: t('common.error'),
          description: 'Please select an image file',
          variant: "destructive"
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t('common.error'),
          description: 'Image file size must be less than 10MB',
          variant: "destructive"
        });
        return;
      }
      
      setImageFile(file);
      setImageRemoved(false); // Reset removal flag when new image is selected
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('access_token');
      
      // If image is uploaded, use multipart/form-data
      if (imageFile) {
        const exerciseData = {
          ...exerciseForm,
          created_by: user?.id,
          video_url: exerciseForm.video_url || null,
        };
        
        const formDataToSend = new FormData();
        formDataToSend.append('exercise_json', JSON.stringify(exerciseData));
        formDataToSend.append('image', imageFile);
        
        const response = await fetch(`${API_BASE_URL}/exercises/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formDataToSend,
        });

        if (response.ok) {
          const newExercise = await response.json();
          setExercises([...exercises, newExercise]);
          setCreateDialogOpen(false);
          resetForm();
          setImageFile(null);
          setImagePreview(null);
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
      } else {
        // No image, use JSON
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
      
      // If new image is uploaded, use multipart/form-data
      if (imageFile) {
        const exerciseData = {
          ...exerciseForm,
          video_url: exerciseForm.video_url || null,
        };
        
        const formDataToSend = new FormData();
        formDataToSend.append('exercise_json', JSON.stringify(exerciseData));
        formDataToSend.append('image', imageFile);
        
        const response = await fetch(`${API_BASE_URL}/exercises/${editingExercise.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formDataToSend,
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
      } else {
        // No new image, use JSON
        // If image was removed (user clicked X), explicitly set image_path to null
        const exerciseData = {
          ...exerciseForm,
          video_url: exerciseForm.video_url || null,
          ...(imageRemoved && editingExercise?.image_path ? { image_path: null } : {})
        };
        
        const response = await fetch(`${API_BASE_URL}/exercises/${editingExercise.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(exerciseData)
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
    setImageFile(null);
    setImagePreview(null);
    setImageRemoved(false);
    setMediaType('video');
  };

  const handleCreateMuscleGroup = async () => {
    if (!newMuscleGroupName.trim()) {
      setMuscleGroupError('Muscle group name is required');
      return;
    }
    
    setMuscleGroupError('');
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/muscle-groups/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newMuscleGroupName.trim() }),
      });

      if (response.ok) {
        const newGroup = await response.json();
        setDynamicMuscleGroups([...dynamicMuscleGroups, newGroup]);
        const dynamicGroupNames = [...dynamicMuscleGroups, newGroup].map(mg => mg.name.toLowerCase().replace(/\s+/g, '_'));
        const combined = [...staticMuscleGroups, ...dynamicGroupNames].filter((v, i, a) => a.indexOf(v) === i);
        setMuscleGroups(combined);
        setNewMuscleGroupName('');
        setEditingMuscleGroup(null);
        toast({
          title: t('common.success'),
          description: 'Muscle group created successfully'
        });
      } else {
        const errorData = await response.json();
        setMuscleGroupError(errorData.detail || 'Failed to create muscle group');
      }
    } catch (error) {
      setMuscleGroupError('Network error occurred');
    }
  };

  const handleUpdateMuscleGroup = async () => {
    if (!editingMuscleGroup || !newMuscleGroupName.trim()) {
      setMuscleGroupError('Muscle group name is required');
      return;
    }
    
    setMuscleGroupError('');
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/muscle-groups/${editingMuscleGroup.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newMuscleGroupName.trim() }),
      });

      if (response.ok) {
        const updatedGroup = await response.json();
        setDynamicMuscleGroups(dynamicMuscleGroups.map(mg => mg.id === updatedGroup.id ? updatedGroup : mg));
        const dynamicGroupNames = dynamicMuscleGroups.map(mg => 
          mg.id === updatedGroup.id 
            ? updatedGroup.name.toLowerCase().replace(/\s+/g, '_')
            : mg.name.toLowerCase().replace(/\s+/g, '_')
        );
        const combined = [...staticMuscleGroups, ...dynamicGroupNames].filter((v, i, a) => a.indexOf(v) === i);
        setMuscleGroups(combined);
        setNewMuscleGroupName('');
        setEditingMuscleGroup(null);
        toast({
          title: t('common.success'),
          description: 'Muscle group updated successfully'
        });
      } else {
        const errorData = await response.json();
        setMuscleGroupError(errorData.detail || 'Failed to update muscle group');
      }
    } catch (error) {
      setMuscleGroupError('Network error occurred');
    }
  };

  const handleDeleteMuscleGroup = async (id: number) => {
    if (!confirm('Are you sure you want to delete this muscle group? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/muscle-groups/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok || response.status === 204) {
        setDynamicMuscleGroups(dynamicMuscleGroups.filter(mg => mg.id !== id));
        const dynamicGroupNames = dynamicMuscleGroups.filter(mg => mg.id !== id).map(mg => mg.name.toLowerCase().replace(/\s+/g, '_'));
        const combined = [...staticMuscleGroups, ...dynamicGroupNames].filter((v, i, a) => a.indexOf(v) === i);
        setMuscleGroups(combined);
        if (editingMuscleGroup?.id === id) {
          setEditingMuscleGroup(null);
          setNewMuscleGroupName('');
        }
        toast({
          title: t('common.success'),
          description: 'Muscle group deleted successfully'
        });
      } else {
        const errorData = await response.json();
        toast({
          title: t('common.error'),
          description: errorData.detail || 'Failed to delete muscle group',
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: 'Network error occurred',
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (group: {id: number, name: string}) => {
    setEditingMuscleGroup(group);
    setNewMuscleGroupName(group.name);
    setMuscleGroupError('');
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
    
    // Set media type based on what exists
    setImageRemoved(false); // Reset removal flag when starting to edit
    if (exercise.video_url) {
      setMediaType('video');
      setImageFile(null);
      setImagePreview(null);
    } else if (exercise.image_path) {
      setMediaType('image');
      setImageFile(null); // No new file selected yet
      // Construct URL for existing image
      let imageUrl: string;
      // Check if path already contains API URL or is a full URL
      if (exercise.image_path.startsWith('http://') || exercise.image_path.startsWith('https://') || exercise.image_path.startsWith(API_BASE_URL)) {
        imageUrl = exercise.image_path;
      } else {
        // Extract filename from path (handles both / and \ separators)
        const imageFileName = exercise.image_path.split('/').pop() || exercise.image_path.split('\\').pop();
        imageUrl = `${API_BASE_URL}/files/media/exercise_images/${imageFileName}`;
      }
      setImagePreview(imageUrl);
    } else {
      setMediaType('video');
      setImageFile(null);
      setImagePreview(null);
    }
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
            <Dialog open={muscleGroupDialogOpen} onOpenChange={setMuscleGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  type="button" 
                  variant="outline"
                  className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base whitespace-nowrap"
                >
                  <Settings className="w-4 h-4 me-2 flex-shrink-0" />
                  <span className="truncate">{t('exerciseBank.manageMuscleGroups')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{t('exerciseBank.manageMuscleGroups')}</DialogTitle>
                  <DialogDescription>
                    Create, edit, or delete custom muscle groups
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Create/Edit Form */}
                  <div className="space-y-2">
                    <Label htmlFor="new_muscle_group_name">
                      {editingMuscleGroup ? 'Edit Muscle Group' : 'Create New Muscle Group'}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="new_muscle_group_name"
                        value={newMuscleGroupName}
                        onChange={(e) => {
                          setNewMuscleGroupName(e.target.value);
                          setMuscleGroupError('');
                        }}
                        placeholder="Enter muscle group name"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            if (editingMuscleGroup) {
                              handleUpdateMuscleGroup();
                            } else {
                              handleCreateMuscleGroup();
                            }
                          }
                        }}
                      />
                      {editingMuscleGroup ? (
                        <>
                          <Button
                            type="button"
                            onClick={handleUpdateMuscleGroup}
                            disabled={!newMuscleGroupName.trim()}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingMuscleGroup(null);
                              setNewMuscleGroupName('');
                              setMuscleGroupError('');
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleCreateMuscleGroup}
                          disabled={!newMuscleGroupName.trim()}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Create
                        </Button>
                      )}
                    </div>
                    {muscleGroupError && (
                      <p className="text-sm text-red-500">{muscleGroupError}</p>
                    )}
                  </div>

                  {/* List of Dynamic Muscle Groups */}
                  {dynamicMuscleGroups.length > 0 && (
                    <div className="space-y-2">
                      <Label>Your Custom Muscle Groups</Label>
                      <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                        {dynamicMuscleGroups.map((group) => (
                          <div
                            key={group.id}
                            className="flex items-center justify-between p-3 hover:bg-muted/50"
                          >
                            <span className="font-medium">{group.name}</span>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(group)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMuscleGroup(group.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
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
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-3">
              <DialogTitle className="text-lg">
                {editingExercise ? t('exerciseBank.editExercise') : t('exerciseBank.addNewExercise')}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {editingExercise 
                  ? t('exerciseBank.editDescription')
                  : t('exerciseBank.createDescription')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editingExercise ? handleUpdateExercise : handleCreateExercise} 
                  className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm">{t('exerciseBank.exerciseName')}</Label>
                  <Input
                    id="name"
                    value={exerciseForm.name}
                    onChange={(e) => setExerciseForm({...exerciseForm, name: e.target.value})}
                    placeholder={t('exerciseBank.exerciseNamePlaceholder')}
                    className="h-9 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="muscle_group" className="text-sm">{t('exerciseBank.muscleGroup')}</Label>
                  <Select 
                    value={exerciseForm.muscle_group} 
                    onValueChange={(value) => setExerciseForm({...exerciseForm, muscle_group: value})}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={t('exerciseBank.selectMuscleGroup')} />
                    </SelectTrigger>
                    <SelectContent>
                      {muscleGroups.map(group => (
                        <SelectItem key={group} value={group}>
                          {t(`exerciseBank.muscleGroups.${group}`) || group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm">{t('exerciseBank.description')}</Label>
                <Textarea
                  id="description"
                  value={exerciseForm.description}
                  onChange={(e) => setExerciseForm({...exerciseForm, description: e.target.value})}
                  placeholder={t('exerciseBank.descriptionPlaceholder')}
                  rows={2}
                  className="text-sm resize-none"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="equipment_needed" className="text-sm">{t('exerciseBank.equipmentNeeded')}</Label>
                  <Input
                    id="equipment_needed"
                    value={exerciseForm.equipment_needed}
                    onChange={(e) => setExerciseForm({...exerciseForm, equipment_needed: e.target.value})}
                    placeholder={t('exerciseBank.equipmentPlaceholder')}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor={mediaType === 'video' ? 'video_url' : 'exercise_image'} className="text-sm">
                    {mediaType === 'video' ? t('exerciseBank.videoUrl') : t('exerciseBank.exerciseImageOptional')}
                  </Label>
                  <div className="flex gap-2 items-center">
                    <ToggleGroup 
                      type="single" 
                      value={mediaType} 
                      onValueChange={(value) => {
                        if (value === 'video' || value === 'image') {
                          setMediaType(value);
                          // Clear the other field when switching
                          if (value === 'video') {
                            setImageFile(null);
                            setImagePreview(null);
                            // If switching to video and there was an existing image, mark it as removed
                            if (editingExercise?.image_path) {
                              setImageRemoved(true);
                            }
                          } else {
                            setExerciseForm({...exerciseForm, video_url: ''});
                            setImageRemoved(false); // Reset removal flag when switching to image
                          }
                        }
                      }}
                      className="flex-shrink-0"
                    >
                      <ToggleGroupItem value="video" aria-label="Video URL" size="sm">
                        <Video className="w-4 h-4" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="image" aria-label="Upload Image" size="sm">
                        <ImageIcon className="w-4 h-4" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                    {mediaType === 'video' ? (
                      <Input
                        id="video_url"
                        type="url"
                        value={exerciseForm.video_url}
                        onChange={(e) => setExerciseForm({...exerciseForm, video_url: e.target.value})}
                        placeholder={t('exerciseBank.videoUrlPlaceholder')}
                        className="flex-1 h-9 text-sm"
                      />
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          id="exercise_image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="cursor-pointer flex-1 h-9 text-sm"
                        />
                        {imagePreview && (
                          <div className="relative flex-shrink-0">
                            <img
                              src={imagePreview}
                              alt="Exercise preview"
                              className="w-16 h-16 object-cover rounded-lg border"
                              onError={(e) => {
                                // If image fails to load, hide the preview
                                console.error('Failed to load image preview:', imagePreview);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setImageFile(null);
                                setImagePreview(null);
                                // Mark that user intentionally removed the image
                                if (editingExercise?.image_path) {
                                  setImageRemoved(true);
                                }
                              }}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 text-xs z-10"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-sm">{t('exerciseBank.category')}</Label>
                <Input
                  id="category"
                  value={exerciseForm.category}
                  onChange={(e) => setExerciseForm({...exerciseForm, category: e.target.value})}
                  placeholder={t('exerciseBank.categoryPlaceholder')}
                  className="h-9 text-sm"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="instructions" className="text-sm">{t('exerciseBank.instructions')}</Label>
                <Textarea
                  id="instructions"
                  value={exerciseForm.instructions}
                  onChange={(e) => setExerciseForm({...exerciseForm, instructions: e.target.value})}
                  placeholder={t('exerciseBank.instructionsPlaceholder')}
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    setEditingExercise(null);
                    resetForm();
                  }}
                >
                  {t('exerciseBank.cancel')}
                </Button>
                <Button type="submit" size="sm" className="gradient-green">
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