import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, CheckCircle2, Clock } from 'lucide-react';
import { DailyCheckInForm } from './DailyCheckInForm';
import { API_BASE_URL } from '@/config/api';
import { cn } from '@/lib/utils';

interface CheckInSummary {
  today_status: 'completed' | 'pending' | 'none';
  current_streak: number;
  last_7_days_completion: number;
  completion_rate: number;
  avg_weight?: number | null;
  avg_steps?: number | null;
  avg_sleep_hours?: number | null;
  avg_hunger_level?: number | null;
  total_check_ins: number;
  first_check_in?: string | null;
  last_check_in?: string | null;
}

interface TodayCheckIn {
  id: number;
  client_id: number;
  date: string;
  weight?: number | null;
  steps?: number | null;
  walked_10000_steps?: boolean | null;
  sun_exposure_10min?: boolean | null;
  hunger_level?: number | null;
  sleep_hours?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export const DailyCheckInCard: React.FC = () => {
  const { t } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);
  const [todayCheckIn, setTodayCheckIn] = useState<TodayCheckIn | null>(null);
  const [summary, setSummary] = useState<CheckInSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTodayCheckIn = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/check-ins/today`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTodayCheckIn(data);
      } else if (response.status === 404) {
        setTodayCheckIn(null);
      }
    } catch (error) {
      console.error('Failed to fetch today check-in:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/check-ins/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayCheckIn();
    fetchSummary();
  }, []);

  const handleFormSuccess = () => {
    fetchTodayCheckIn();
    fetchSummary();
  };

  const getStatusBadge = () => {
    if (!summary) return null;

    if (summary.today_status === 'completed') {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {t('checkIn.completed')}
        </Badge>
      );
    } else if (summary.today_status === 'pending') {
      return (
        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
          <Clock className="w-3 h-3 mr-1" />
          {t('checkIn.pending')}
        </Badge>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">{t('common.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card
        className={cn(
          "bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300 animate-fade-in-up",
          summary?.today_status === 'completed' && "border-green-500/30 bg-green-500/10",
          summary?.today_status === 'pending' && "border-orange-500/30 bg-orange-500/10"
        )}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-foreground">
              {t('checkIn.title')}
            </CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary && (
            <>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-lg font-semibold text-orange-400">
                  {summary.current_streak} {t('checkIn.streak')}
                </span>
              </div>

              {summary.last_check_in && (
                <div className="text-sm text-muted-foreground">
                  {t('checkIn.lastCheckIn')}: {new Date(summary.last_check_in).toLocaleDateString()}
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                {t('checkIn.completionRate')}: {summary.completion_rate.toFixed(1)}%
              </div>
            </>
          )}

          <Button
            onClick={() => setFormOpen(true)}
            className="gradient-orange text-background w-full py-3 font-semibold hover:scale-105 transition-all"
            disabled={summary?.today_status === 'completed'}
          >
            {summary?.today_status === 'completed' 
              ? t('checkIn.alreadyCompleted')
              : t('checkIn.submit')
            }
          </Button>
        </CardContent>
      </Card>

      <DailyCheckInForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
      />
    </>
  );
};

