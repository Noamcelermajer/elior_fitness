import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Plus, X, Upload, Image as ImageIcon, Settings, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';

const MUSCLE_GROUPS = [
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

const EQUIPMENT_OPTIONS = [
  'None (Bodyweight)', 'Dumbbells', 'Barbell', 'Kettlebell', 'Resistance Bands',
  'Cable Machine', 'Smith Machine', 'Pull-up Bar', 'Bench', 'Incline Bench',
  'Decline Bench', 'Leg Press Machine', 'Lat Pulldown Machine', 'Treadmill',
  'Stationary Bike', 'Rowing Machine', 'Elliptical', 'Other'
];

const CreateExercise = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/exercises/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const categories = Array.from(
            new Set(
              (Array.isArray(data) ? data : [])
                .map((exercise: any) => exercise.category)
                .filter((category: string | null | undefined): category is string => Boolean(category))
            )
          );
          setExistingCategories(categories);
        }
      } catch (categoryError) {
        console.error('Failed to load exercise categories:', categoryError);
      }
    };

    loadCategories();
  }, []);


  // Redirect non-trainers away from trainer-only pages
  useEffect(() => {
    if (user) {
      if (user.role === 'CLIENT') {
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate]);

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
          const combined = [
            ...MUSCLE_GROUPS,
            ...data.map((mg: {id: number, name: string}) => ({ value: mg.name.toLowerCase().replace(/\s+/g, '_'), label: mg.name }))
          ].filter((v, i, a) => a.findIndex(t => t.value === v.value) === i); // Remove duplicates
          setMuscleGroups(combined);
        }
      } catch (error) {
        console.error('Failed to load muscle groups:', error);
      }
    };
    fetchMuscleGroups();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    muscle_group: '',
    equipment_needed: '',
    instructions: '',
    video_url: '',
    difficulty_level: 'beginner',
    estimated_duration: '',
    calories_burned: '',
    tips: '',
    category: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<Array<{value: string, label: string}>>(MUSCLE_GROUPS);
  const [dynamicMuscleGroups, setDynamicMuscleGroups] = useState<Array<{id: number, name: string}>>([]);
  const [muscleGroupDialogOpen, setMuscleGroupDialogOpen] = useState(false);
  const [editingMuscleGroup, setEditingMuscleGroup] = useState<{id: number, name: string} | null>(null);
  const [newMuscleGroupName, setNewMuscleGroupName] = useState('');
  const [muscleGroupError, setMuscleGroupError] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image file size must be less than 10MB');
        return;
      }
      
      setImageFile(file);
      setError('');
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      
      // If image is uploaded, use multipart/form-data
      if (imageFile) {
        const exerciseData = {
          ...formData,
          created_by: user?.id,
          calories_burned: formData.calories_burned ? parseInt(formData.calories_burned) : null,
          estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : null,
          category: formData.category || null,
          video_url: formData.video_url || null,
        };
        
        const formDataToSend = new FormData();
        formDataToSend.append('exercise_json', JSON.stringify(exerciseData));
        formDataToSend.append('image', imageFile);
        
        const response = await fetch(`${API_BASE_URL}/exercises/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type - browser will set it with boundary for FormData
          },
          body: formDataToSend,
        });

        if (response.ok) {
          navigate('/trainer-dashboard?tab=exercises');
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Failed to create exercise');
        }
      } else {
        // No image, use JSON
        const response = await fetch(`${API_BASE_URL}/exercises/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            created_by: user?.id,
            calories_burned: formData.calories_burned ? parseInt(formData.calories_burned) : null,
            estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : null,
            category: formData.category || null,
          }),
        });

        if (response.ok) {
          navigate('/trainer-dashboard?tab=exercises');
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Failed to create exercise');
        }
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return formData.name && formData.description && formData.muscle_group;
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
        const combined = [
          ...MUSCLE_GROUPS,
          ...dynamicMuscleGroups.map(mg => ({ value: mg.name.toLowerCase().replace(/\s+/g, '_'), label: mg.name })),
          { value: newGroup.name.toLowerCase().replace(/\s+/g, '_'), label: newGroup.name }
        ].filter((v, i, a) => a.findIndex(t => t.value === v.value) === i); // Remove duplicates
        setMuscleGroups(combined);
        setNewMuscleGroupName('');
        setEditingMuscleGroup(null);
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
        const combined = [
          ...MUSCLE_GROUPS,
          ...dynamicMuscleGroups.map(mg => 
            mg.id === updatedGroup.id 
              ? { value: updatedGroup.name.toLowerCase().replace(/\s+/g, '_'), label: updatedGroup.name }
              : { value: mg.name.toLowerCase().replace(/\s+/g, '_'), label: mg.name }
          )
        ].filter((v, i, a) => a.findIndex(t => t.value === v.value) === i); // Remove duplicates
        setMuscleGroups(combined);
        setNewMuscleGroupName('');
        setEditingMuscleGroup(null);
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
        const combined = [
          ...MUSCLE_GROUPS,
          ...dynamicMuscleGroups.filter(mg => mg.id !== id).map(mg => ({ value: mg.name.toLowerCase().replace(/\s+/g, '_'), label: mg.name }))
        ];
        setMuscleGroups(combined);
        if (editingMuscleGroup?.id === id) {
          setEditingMuscleGroup(null);
          setNewMuscleGroupName('');
        }
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Failed to delete muscle group');
      }
    } catch (error) {
      alert('Network error occurred');
    }
  };

  const openEditDialog = (group: {id: number, name: string}) => {
    setEditingMuscleGroup(group);
    setNewMuscleGroupName(group.name);
    setMuscleGroupError('');
  };

  return (
    <Layout currentPage="dashboard">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Create New Exercise</h1>
              <p className="text-muted-foreground">Add a new exercise to your database</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Exercise Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Push-ups, Deadlift, Squats"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="muscle_group">Primary Muscle Group *</Label>
                    <Dialog open={muscleGroupDialogOpen} onOpenChange={setMuscleGroupDialogOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="h-8">
                          <Settings className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Manage Muscle Groups</DialogTitle>
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
                  </div>
                  <Select value={formData.muscle_group} onValueChange={(value) => handleInputChange('muscle_group', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select muscle group" />
                    </SelectTrigger>
                    <SelectContent>
                      {muscleGroups.map(group => (
                        <SelectItem key={group.value} value={group.value}>{group.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

                <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the exercise, what muscles it targets, and its benefits..."
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="equipment">Equipment Needed</Label>
                  <Select value={formData.equipment_needed} onValueChange={(value) => handleInputChange('equipment_needed', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_OPTIONS.map(equipment => (
                        <SelectItem key={equipment} value={equipment}>{equipment}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select value={formData.difficulty_level} onValueChange={(value) => handleInputChange('difficulty_level', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  list="exercise-category-options"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  placeholder="e.g., Strength, Mobility, Hypertrophy"
                />
                <datalist id="exercise-category-options">
                  {existingCategories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">
                  Choose an existing category or type a new one.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instructions">Step-by-Step Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => handleInputChange('instructions', e.target.value)}
                  placeholder="Provide detailed step-by-step instructions on how to perform the exercise correctly..."
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tips">Tips & Safety Notes</Label>
                <Textarea
                  id="tips"
                  value={formData.tips}
                  onChange={(e) => handleInputChange('tips', e.target.value)}
                  placeholder="Add any important tips, common mistakes to avoid, or safety considerations..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.estimated_duration}
                    onChange={(e) => handleInputChange('estimated_duration', e.target.value)}
                    placeholder="e.g., 5"
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="calories">Calories Burned (per set)</Label>
                  <Input
                    id="calories"
                    type="number"
                    value={formData.calories_burned}
                    onChange={(e) => handleInputChange('calories_burned', e.target.value)}
                    placeholder="e.g., 10"
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video_url">Video URL (optional)</Label>
                  <Input
                    id="video_url"
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => handleInputChange('video_url', e.target.value)}
                    placeholder="https://youtube.com/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Video takes priority over image. Falls back to image if no video, then Rick Roll.
                  </p>
                </div>
              </div>
              
              {/* Image Upload Section - always visible */}
              <div className="space-y-2">
                <Label htmlFor="exercise_image">Exercise Image (optional)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="exercise_image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Exercise preview"
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload an image. Will show if no video URL is provided. Falls back to Rick Roll if neither is provided.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-red-600">
                  <X className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/trainer-dashboard')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid() || loading}
              className="gradient-green"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span>Create Exercise</span>
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CreateExercise; 