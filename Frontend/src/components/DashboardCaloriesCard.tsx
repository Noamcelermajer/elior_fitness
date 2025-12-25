import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardCaloriesCardProps {
  consumed: number;
  target: number;
  onViewDetailsClick?: () => void;
}

export const DashboardCaloriesCard: React.FC<DashboardCaloriesCardProps> = ({
  consumed,
  target,
  onViewDetailsClick
}) => {
  const { t } = useTranslation();

  const percentage = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const roundedConsumed = Math.round(consumed);
  const roundedTarget = Math.round(target);

  // SVG circle parameters
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card 
      className="bg-gradient-to-br from-card to-secondary border-border/50 shadow-xl hover:shadow-2xl transition-all cursor-pointer"
      onClick={onViewDetailsClick}
    >
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('dashboard.caloriesTracker', 'CALORIES TRACKER')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Text Display */}
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">
            {roundedConsumed} {t('meals.kcal', 'KCAL')} | {roundedTarget} {t('meals.kcal', 'KCAL')}
          </p>
        </div>

        {/* Circular Progress */}
        <div className="flex justify-center">
          <div className="relative w-32 h-32">
            <svg width="128" height="128" className="transform -rotate-90">
              {/* Background Circle */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/30"
              />
              
              {/* Progress Circle */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>
            
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-foreground">
                {Math.round(percentage)}%
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Progress Bar (Optional) */}
        <div className="flex items-end justify-end gap-1 h-24">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">100%</span>
            <div className="w-3 h-full bg-secondary rounded-full relative overflow-hidden">
              <div 
                className="absolute bottom-0 w-full bg-primary transition-all duration-500"
                style={{ height: `${percentage}%` }}
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">50%</span>
            <div className="w-3 h-full bg-secondary rounded-full relative overflow-hidden">
              <div 
                className="absolute bottom-0 w-full bg-primary/50 transition-all duration-500"
                style={{ height: percentage >= 50 ? '100%' : '0%' }}
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">0%</span>
            <div className="w-3 h-full bg-secondary rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

