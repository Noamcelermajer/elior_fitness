
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Scale, Camera, TrendingDown, TrendingUp, Plus, Calendar } from 'lucide-react';

const ProgressTracking = () => {
  const [newWeight, setNewWeight] = useState('');
  const [weightData, setWeightData] = useState([
    { date: '2024-01-01', weight: 180, month: 'Jan' },
    { date: '2024-01-15', weight: 178, month: 'Jan' },
    { date: '2024-02-01', weight: 176, month: 'Feb' },
    { date: '2024-02-15', weight: 175, month: 'Feb' },
    { date: '2024-03-01', weight: 173, month: 'Mar' },
    { date: '2024-03-15', weight: 171, month: 'Mar' },
    { date: '2024-04-01', weight: 170, month: 'Apr' }
  ]);

  const [photos, setPhotos] = useState([
    { id: 1, date: '2024-01-01', url: null, weight: 180, notes: 'Starting point' },
    { id: 2, date: '2024-02-01', url: null, weight: 176, notes: 'First month progress' },
    { id: 3, date: '2024-03-01', url: null, weight: 173, notes: 'Two months in' },
    { id: 4, date: '2024-04-01', url: null, weight: 170, notes: 'Three months progress' }
  ]);

  const currentWeight = weightData[weightData.length - 1]?.weight || 0;
  const startWeight = weightData[0]?.weight || 0;
  const weightChange = currentWeight - startWeight;
  const weightChangePercentage = ((weightChange / startWeight) * 100).toFixed(1);

  const addWeight = () => {
    if (newWeight && !isNaN(Number(newWeight))) {
      const today = new Date().toISOString().split('T')[0];
      const month = new Date().toLocaleDateString('en-US', { month: 'short' });
      
      setWeightData([...weightData, {
        date: today,
        weight: Number(newWeight),
        month: month
      }]);
      setNewWeight('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Progress Tracking</h1>
          <p className="text-gray-600 mt-1">Monitor your weight and visual progress over time</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Entry
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Weight</p>
                <p className="text-3xl font-bold text-blue-600">{currentWeight} lbs</p>
              </div>
              <Scale className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Change</p>
                <div className="flex items-center space-x-2">
                  <p className={`text-3xl font-bold ${weightChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {weightChange > 0 ? '+' : ''}{weightChange} lbs
                  </p>
                  {weightChange < 0 ? (
                    <TrendingDown className="w-6 h-6 text-green-600" />
                  ) : (
                    <TrendingUp className="w-6 h-6 text-red-600" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Progress Photos</p>
                <p className="text-3xl font-bold text-purple-600">{photos.length}</p>
              </div>
              <Camera className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="weight" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weight">Weight Tracking</TabsTrigger>
          <TabsTrigger value="photos">Progress Photos</TabsTrigger>
        </TabsList>

        <TabsContent value="weight" className="space-y-6">
          {/* Add Weight Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Scale className="w-5 h-5 text-blue-600" />
                <span>Log New Weight</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end space-x-4">
                <div className="flex-1">
                  <Label htmlFor="weight">Weight (lbs)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="Enter your weight"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button onClick={addWeight} disabled={!newWeight}>
                  Add Weight
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Weight Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Weight Progress Chart</CardTitle>
              <CardDescription>Track your weight changes over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip 
                      formatter={(value) => [`${value} lbs`, 'Weight']}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Weight History */}
          <Card>
            <CardHeader>
              <CardTitle>Weight History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {weightData.slice().reverse().map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{new Date(entry.date).toLocaleDateString()}</span>
                    </div>
                    <Badge variant="outline" className="text-base font-semibold">
                      {entry.weight} lbs
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="space-y-6">
          {/* Upload Photo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-purple-600" />
                <span>Add Progress Photo</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">Upload Progress Photo</p>
                <p className="text-gray-600 mb-4">Click to select or drag and drop your photo here</p>
                <Button variant="outline">Choose Photo</Button>
              </div>
            </CardContent>
          </Card>

          {/* Photo Gallery */}
          <Card>
            <CardHeader>
              <CardTitle>Progress Gallery</CardTitle>
              <CardDescription>Visual timeline of your transformation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative">
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                      {photo.url ? (
                        <img 
                          src={photo.url} 
                          alt={`Progress photo from ${photo.date}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="text-center text-gray-500">
                          <Camera className="w-12 h-12 mx-auto mb-2" />
                          <p className="text-sm">No photo</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(photo.date).toLocaleDateString()}
                        </span>
                        <Badge variant="outline">{photo.weight} lbs</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{photo.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProgressTracking;
