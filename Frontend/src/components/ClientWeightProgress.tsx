import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  TrendingUp, Weight, Calendar, Edit2, Camera, 
  LineChart, Target, Activity, Plus, Upload, Image
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useToast } from '../hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface ProgressEntry {
  id: number;
  client_id: number;
  date: string;
  weight: number;
  photo_path?: string;
  notes?: string;
  created_at: string;
}

interface ClientWeightProgressProps {
  clientId: string;
  progressEntries: ProgressEntry[];
  onProgressUpdate: () => void;
  isTrainer?: boolean;
}

const ClientWeightProgress: React.FC<ClientWeightProgressProps> = ({
  clientId,
  progressEntries,
  onProgressUpdate,
  isTrainer = false
}) => {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [editingEntry, setEditingEntry] = useState<ProgressEntry | null>(null);
  const [editForm, setEditForm] = useState({
    weight: '',
    notes: ''
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({
    weight: '',
    notes: '',
    photo: null as File | null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<ProgressEntry | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Sort entries by date
  const sortedEntries = [...progressEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Calculate statistics
  const latestEntry = sortedEntries[0];
  const previousEntry = sortedEntries[1];
  const weightChange = latestEntry?.weight && previousEntry?.weight 
    ? latestEntry.weight - previousEntry.weight 
    : 0;

  const startEdit = (entry: ProgressEntry) => {
    if (!isTrainer) return; // Only trainers can edit
    
    setEditingEntry(entry);
    setEditForm({
      weight: entry.weight.toString(),
      notes: entry.notes || ''
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAddForm({ ...addForm, photo: file });
    }
  };

  const loadPhotoWithAuth = async (photoPath: string) => {
    try {
      const token = localStorage.getItem('access_token');
      // Extract just the filename from the full path
      const filename = photoPath.split('/').pop();
      const response = await fetch(`${API_BASE_URL}/files/media/progress_photos/${filename}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPhotoUrl(url);
      } else {
        console.error('Failed to load photo:', response.status);
        setPhotoUrl(null);
      }
    } catch (error) {
      console.error('Error loading photo:', error);
      setPhotoUrl(null);
    }
  };

  const handleViewPhoto = (entry: ProgressEntry) => {
    setViewingPhoto(entry);
    if (entry.photo_path) {
      loadPhotoWithAuth(entry.photo_path);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.weight) {
      toast({
        title: "Error",
        description: t('weightProgress.weightRequired'),
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      
      formData.append('weight', addForm.weight);
      if (addForm.notes) {
        formData.append('notes', addForm.notes);
      }
      if (addForm.photo) {
        formData.append('photo', addForm.photo);
      }
      // If this is a trainer adding an entry for a client, include client_id
      if (isTrainer && clientId) {
        formData.append('client_id', clientId);
      }

      const response = await fetch(`${API_BASE_URL}/progress/weight`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: t('weightProgress.successAdd')
        });
        setShowAddDialog(false);
        setAddForm({ weight: '', notes: '', photo: null });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onProgressUpdate();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.detail || t('weightProgress.errorAdd'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding weight entry:', error);
      toast({
        title: "Error",
        description: t('weightProgress.errorAdd'),
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    try {
      const token = localStorage.getItem('access_token');
      // Create FormData for the PUT request
      const formData = new FormData();
      if (editForm.weight) {
        formData.append('weight', editForm.weight);
      }
      if (editForm.notes) {
        formData.append('notes', editForm.notes);
      }

      const response = await fetch(`${API_BASE_URL}/progress/entries/${editingEntry.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: t('weightProgress.successUpdate')
        });
        setEditingEntry(null);
        onProgressUpdate();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.detail || t('weightProgress.errorUpdate'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      toast({
        title: "Error",
        description: t('weightProgress.errorUpdate'),
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center px-4 pb-4 pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Weight className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('weightProgress.currentWeight')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {latestEntry?.weight ? `${latestEntry.weight} ${t('weightProgress.kg')}` : t('weightProgress.na')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center px-4 pb-4 pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('weightProgress.weightChange')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} {t('weightProgress.kg')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center px-4 pb-4 pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('weightProgress.totalEntries')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {sortedEntries.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <LineChart className="w-5 h-5 me-2" />
            {t('weightProgress.weightProgressChart')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-secondary/20 rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">{t('weightProgress.chartVisualization')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Progress Entries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>{t('weightProgress.progressHistory')}</CardTitle>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('weightProgress.addEntry')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {new Date(entry.date).toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{t('weightProgress.weight')}: {entry.weight} {t('weightProgress.kg')}</span>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                    )}
                    {entry.photo_path && (
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewPhoto(entry)}
                          className="flex items-center gap-1"
                        >
                          <Image className="w-3 h-3" />
                          {t('weightProgress.viewPhoto')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {entry.photo_path && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleViewPhoto(entry)}
                      title={t('weightProgress.viewPhoto')}
                    >
                      <Image className="w-4 h-4" />
                    </Button>
                  )}
                  {isTrainer && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(entry)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Weight Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('weightProgress.addEntry')}</DialogTitle>
            <DialogDescription>
              {t('weightProgress.addDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEntry} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-weight">{t('weightProgress.weightKg')}</Label>
              <Input
                id="add-weight"
                type="number"
                step="0.1"
                value={addForm.weight}
                onChange={(e) => setAddForm({...addForm, weight: e.target.value})}
                placeholder={t('weightProgress.enterWeight')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-notes">{t('weightProgress.notes')}</Label>
              <Input
                id="add-notes"
                value={addForm.notes}
                onChange={(e) => setAddForm({...addForm, notes: e.target.value})}
                placeholder={t('weightProgress.addNotes')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-photo">{t('weightProgress.progressPhoto')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="add-photo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              {addForm.photo && (
                <p className="text-sm text-muted-foreground">
                  {t('weightProgress.selectedFile')}: {addForm.photo.name}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setAddForm({ weight: '', notes: '', photo: null });
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                {t('weightProgress.cancel')}
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? t('weightProgress.uploading') : t('weightProgress.addEntry')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog for Trainers */}
      {isTrainer && (
        <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('weightProgress.editEntry')}</DialogTitle>
              <DialogDescription>
                {t('weightProgress.editDescription')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateEntry} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight">{t('weightProgress.weightKg')}</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={editForm.weight}
                  onChange={(e) => setEditForm({...editForm, weight: e.target.value})}
                  placeholder={t('weightProgress.enterWeight')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t('weightProgress.notes')}</Label>
                <Input
                  id="notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                  placeholder={t('weightProgress.addNotes')}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingEntry(null)}
                >
                  {t('weightProgress.cancel')}
                </Button>
                <Button type="submit">
                  {t('weightProgress.updateEntry')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Photo Viewing Dialog */}
      <Dialog open={!!viewingPhoto} onOpenChange={(open) => {
        if (!open) {
          setViewingPhoto(null);
          if (photoUrl) {
            URL.revokeObjectURL(photoUrl);
            setPhotoUrl(null);
          }
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('weightProgress.viewPhoto')}</DialogTitle>
            <DialogDescription>
              {viewingPhoto && `${t('weightProgress.weight')}: ${viewingPhoto.weight} ${t('weightProgress.kg')} - ${new Date(viewingPhoto.date).toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US')}`}
            </DialogDescription>
          </DialogHeader>
          {viewingPhoto && (
            <div className="space-y-4">
              <div className="relative">
                {photoUrl ? (
                  <img 
                    src={photoUrl}
                    alt={t('weightProgress.progressPhoto')}
                    className="w-full h-auto rounded-lg border"
                  />
                ) : (
                  <div className="w-full h-64 bg-secondary/20 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">{t('weightProgress.photoNotFound')}</p>
                  </div>
                )}
              </div>
              {viewingPhoto.notes && (
                <div className="p-3 bg-secondary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>{t('weightProgress.notes')}:</strong> {viewingPhoto.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientWeightProgress; 