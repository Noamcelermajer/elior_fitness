import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Scale, Camera, TrendingDown, TrendingUp, Plus, Calendar, Upload, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface ProgressEntry {
  id: number;
  client_id: number;
  date: string;
  weight: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  notes: string;
  photo_path: string;
  created_at: string;
}

const ProgressTrackingV2 = () => {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newBodyFat, setNewBodyFat] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchProgressData();
    }
  }, [user]);

  const fetchProgressData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/progress/?client_id=${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProgressData(data.sort((a: ProgressEntry, b: ProgressEntry) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ));
      }
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
      setError('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const addEntry = async () => {
    if (!newWeight) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('weight', newWeight);
      formData.append('date', new Date().toISOString());
      
      if (newBodyFat) {
        formData.append('body_fat_percentage', newBodyFat);
      }
      if (newNotes) {
        formData.append('notes', newNotes);
      }
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const response = await fetch(`${API_BASE_URL}/progress/weight`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const newEntry = await response.json();
        setProgressData([...progressData, newEntry].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ));
        
        // Reset form
        setNewWeight('');
        setNewBodyFat('');
        setNewNotes('');
        setPhotoFile(null);
        setPhotoPreview(null);
        setIsAddingEntry(false);
      } else {
        setError('Failed to add entry');
      }
    } catch (error) {
      console.error('Failed to add entry:', error);
      setError('Failed to add entry');
    }
  };

  const currentWeight = progressData[progressData.length - 1]?.weight || 0;
  const startWeight = progressData[0]?.weight || 0;
  const weightChange = currentWeight - startWeight;
  const weightChangePercentage = startWeight > 0 ? ((weightChange / startWeight) * 100).toFixed(1) : '0.0';

  // Prepare chart data
  const chartData = progressData.map(entry => ({
    date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: entry.weight,
    fullDate: entry.date,
  }));

  // Photos with progress data
  const photosWithData = progressData.filter(entry => entry.photo_path);

  if (loading) {
    return (
      <div className="pb-20 lg:pb-8">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Loading progress data...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-card to-secondary px-4 lg:px-6 py-6 lg:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gradient">Progress Tracking</h1>
              <p className="text-muted-foreground mt-1">Monitor your weight and visual progress</p>
            </div>
            <Dialog open={isAddingEntry} onOpenChange={setIsAddingEntry}>
              <DialogTrigger asChild>
                <Button className="gradient-blue text-background">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Progress Entry</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="weight">Weight (kg) *</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 75.5"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="body-fat">Body Fat % (optional)</Label>
                    <Input
                      id="body-fat"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 18.5"
                      value={newBodyFat}
                      onChange={(e) => setNewBodyFat(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="How are you feeling? Any observations..."
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Progress Photo (optional)</Label>
                    {photoPreview ? (
                      <div className="relative mt-2">
                        <img 
                          src={photoPreview} 
                          alt="Preview" 
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={removePhoto}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <label htmlFor="photo-upload" className="cursor-pointer">
                          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-accent transition-colors">
                            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Click to upload photo</p>
                            <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                          </div>
                        </label>
                        <input
                          id="photo-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsAddingEntry(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 gradient-green text-background"
                      onClick={addEntry}
                      disabled={!newWeight}
                    >
                      Add Entry
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Weight</p>
                  <p className="text-3xl font-bold text-foreground">{currentWeight || '-'} kg</p>
                </div>
                <Scale className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${weightChange < 0 ? 'from-green-500/10 to-green-600/10 border-green-500/20' : 'from-red-500/10 to-red-600/10 border-red-500/20'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Change</p>
                  <div className="flex items-center space-x-2">
                    <p className={`text-3xl font-bold ${weightChange < 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                    </p>
                    {weightChange < 0 ? (
                      <TrendingDown className="w-6 h-6 text-green-500" />
                    ) : (
                      <TrendingUp className="w-6 h-6 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Progress</p>
                  <p className={`text-3xl font-bold ${weightChange < 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {weightChangePercentage}%
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chart">Weight Chart</TabsTrigger>
            <TabsTrigger value="photos">Progress Photos</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Weight Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    No weight data yet. Add your first entry to start tracking!
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Weight History */}
            <Card>
              <CardHeader>
                <CardTitle>Weight History</CardTitle>
              </CardHeader>
              <CardContent>
                {progressData.length > 0 ? (
                  <div className="space-y-3">
                    {progressData.slice().reverse().map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{entry.weight} kg</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                            {entry.notes && (
                              <p className="text-sm text-muted-foreground italic mt-1">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                        {entry.photo_path && (
                          <Badge variant="outline">
                            <Camera className="w-3 h-3 mr-1" />
                            Photo
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No entries yet. Add your first weigh-in!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="w-5 h-5 mr-2" />
                  Progress Photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {photosWithData.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {photosWithData.map((entry) => (
                      <Card key={entry.id} className="overflow-hidden">
                        <img 
                          src={entry.photo_path?.startsWith('http') ? entry.photo_path : `${API_BASE_URL.replace('/api', '')}${entry.photo_path}`}
                          alt={`Progress ${entry.date}`}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            console.error('Failed to load image:', entry.photo_path);
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="w-full h-48 bg-muted flex items-center justify-center hidden">
                          <div className="text-center text-muted-foreground">
                            <Camera className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">Photo not available</p>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-bold text-lg">{entry.weight} kg</p>
                            <Badge variant="outline">
                              {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Badge>
                          </div>
                          {entry.notes && (
                            <p className="text-sm text-muted-foreground">{entry.notes}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No Progress Photos Yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Add photos to your weigh-ins to track your visual progress!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {error && (
          <Card className="bg-destructive/10 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-center">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProgressTrackingV2;

