import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, Utensils, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardCaloriesCardProps {
  consumed: number;
  target: number;
  macros?: {
    protein: { consumed: number; target: number };
    carbs: { consumed: number; target: number };
    fat: { consumed: number; target: number };
  };
  onViewDetailsClick?: () => void;
}

export const DashboardCaloriesCard: React.FC<DashboardCaloriesCardProps> = ({
  consumed,
  target,
  macros,
  onViewDetailsClick
}) => {
  const { t } = useTranslation();

  const percentage = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const roundedConsumed = Math.round(consumed);
  const roundedTarget = Math.round(target);

  // Calculate macro distribution percentages
  const getMacroColor = () => {
    if (!macros || target === 0) {
      return 'hsl(var(--primary))'; // Default orange
    }

    const totalMacros = macros.protein.consumed + macros.carbs.consumed + macros.fat.consumed;
    if (totalMacros === 0) {
      return 'hsl(var(--primary))'; // Default orange
    }

    const proteinPercent = (macros.protein.consumed / totalMacros) * 100;
    const carbsPercent = (macros.carbs.consumed / totalMacros) * 100;
    const fatPercent = (macros.fat.consumed / totalMacros) * 100;

    // Determine dominant macro and return color
    if (proteinPercent >= carbsPercent && proteinPercent >= fatPercent) {
      // Protein dominant - blue/red gradient
      return 'rgb(59, 130, 246)'; // Blue
    } else if (carbsPercent >= fatPercent) {
      // Carbs dominant - green/orange gradient
      return 'rgb(34, 197, 94)'; // Green
    } else {
      // Fat dominant - yellow/orange gradient
      return 'rgb(234, 179, 8)'; // Yellow
    }
  };

  const getGradientColor = () => {
    if (!macros || target === 0) {
      return { gradient: 'from-orange-500 to-orange-600', border: 'border-orange-500/30' };
    }

    const totalMacros = macros.protein.consumed + macros.carbs.consumed + macros.fat.consumed;
    if (totalMacros === 0) {
      return { gradient: 'from-orange-500 to-orange-600', border: 'border-orange-500/30' };
    }

    const proteinPercent = (macros.protein.consumed / totalMacros) * 100;
    const carbsPercent = (macros.carbs.consumed / totalMacros) * 100;
    const fatPercent = (macros.fat.consumed / totalMacros) * 100;

    // Determine dominant macro and return gradient
    if (proteinPercent >= carbsPercent && proteinPercent >= fatPercent) {
      return { gradient: 'from-blue-500 to-blue-600', border: 'border-blue-500/30' };
    } else if (carbsPercent >= fatPercent) {
      return { gradient: 'from-green-500 to-green-600', border: 'border-green-500/30' };
    } else {
      return { gradient: 'from-yellow-500 to-yellow-600', border: 'border-yellow-500/30' };
    }
  };

  const circleColor = getMacroColor();
  const gradientColors = getGradientColor();

  // SVG circle parameters
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card 
      className={cn(
        "bg-gradient-to-br from-card to-secondary border-2 shadow-xl hover:shadow-2xl transition-all",
        gradientColors.border
      )}
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
                stroke={circleColor}
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
                className={cn("absolute bottom-0 w-full transition-all duration-500", `bg-gradient-to-t ${gradientColors.gradient}`)}
                style={{ height: `${percentage}%` }}
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">50%</span>
            <div className="w-3 h-full bg-secondary rounded-full relative overflow-hidden">
              <div 
                className={cn("absolute bottom-0 w-full transition-all duration-500", `bg-gradient-to-t ${gradientColors.gradient} opacity-50`)}
                style={{ height: percentage >= 50 ? '100%' : '0%' }}
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">0%</span>
            <div className="w-3 h-full bg-secondary rounded-full" />
          </div>
        </div>

        {/* Meals Access Button */}
        <Button
          onClick={onViewDetailsClick}
          className={cn("w-full text-background font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all", `bg-gradient-to-r ${gradientColors.gradient} hover:opacity-90`)}
        >
          <Utensils className="w-4 h-4" />
          <span>{t('meals.meals', 'ארוחות')}</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

