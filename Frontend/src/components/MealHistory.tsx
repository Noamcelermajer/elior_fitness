import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface MealHistoryEntry {
  id: number;
  client_id: number;
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  is_complete: boolean;
}

interface AverageData {
  average_calories: number;
  total_days: number;
  period: string;
  detail_history: Array<{
    date: string;
    calories: number;
    is_complete: boolean;
  }>;
}

interface MealHistoryProps {
  clientId?: number;
}

const MealHistory: React.FC<MealHistoryProps> = ({ clientId }) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<MealHistoryEntry[]>([]);
  const [averageData, setAverageData] = useState<AverageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
    fetchAverage();
  }, [clientId]);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const url = clientId 
        ? `${API_BASE_URL}/v2/meals/history?client_id=${clientId}`
        : `${API_BASE_URL}/v2/meals/history`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch meal history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAverage = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const url = clientId
        ? `${API_BASE_URL}/v2/meals/history/average?client_id=${clientId}&days=7`
        : `${API_BASE_URL}/v2/meals/history/average?days=7`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAverageData(data);
      }
    } catch (error) {
      console.error('Failed to fetch average data:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Average Calories Summary */}
      {averageData && averageData.total_days > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Average Calories (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-4xl font-bold text-orange-500 mb-2">
                {averageData.average_calories} kcal
              </div>
              <p className="text-muted-foreground">
                {averageData.total_days} days tracked
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily History List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Meal History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No meal history yet
            </div>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {entry.is_complete ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{formatDate(entry.date)}</div>
                      <div className="text-sm text-muted-foreground">
                        {entry.total_calories} kcal
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div>P: {entry.total_protein}g</div>
                    <div>C: {entry.total_carbs}g</div>
                    <div>F: {entry.total_fat}g</div>
                    {entry.is_complete && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Complete
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MealHistory;

