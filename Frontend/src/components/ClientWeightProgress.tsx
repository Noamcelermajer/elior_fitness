import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  TrendingUp, Weight, Calendar, Edit2, Camera, 
  LineChart, Target, Activity
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useToast } from '../hooks/use-toast';

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
  const [editingEntry, setEditingEntry] = useState<ProgressEntry | null>(null);
  const [editForm, setEditForm] = useState({
    weight: '',
    notes: ''
  });

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
          description: "Progress entry updated successfully"
        });
        setEditingEntry(null);
        onProgressUpdate();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.detail || "Failed to update entry",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      toast({
        title: "Error",
        description: "Failed to update entry",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="h-32">
          <CardContent className="h-full flex items-center justify-center p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Weight className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Weight</p>
                <p className="text-2xl font-bold text-foreground">
                  {latestEntry?.weight ? `${latestEntry.weight} kg` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-32">
          <CardContent className="h-full flex items-center justify-center p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Weight Change</p>
                <p className="text-2xl font-bold text-foreground">
                  {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-32">
          <CardContent className="h-full flex items-center justify-center p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Entries</p>
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
            <LineChart className="w-5 h-5 mr-2" />
            Weight Progress Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-secondary/20 rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Weight progress chart visualization</p>
          </div>
        </CardContent>
      </Card>

      {/* Progress Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Progress History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Weight: {entry.weight} kg</span>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                    )}
                  </div>
                </div>
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
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog for Trainers */}
      {isTrainer && (
        <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Progress Entry</DialogTitle>
              <DialogDescription>
                Update the weight data if there was an error in the original entry.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateEntry} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={editForm.weight}
                  onChange={(e) => setEditForm({...editForm, weight: e.target.value})}
                  placeholder="Enter weight"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                  placeholder="Add any notes"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingEntry(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Update Entry
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ClientWeightProgress; 