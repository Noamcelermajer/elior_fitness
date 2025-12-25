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

  // Calculate macro distribution from TARGET and show consumed portions
  const calculateMacroSegments = () => {
    if (!macros || target === 0) {
      return null;
    }

    // Calculate calories from target macros
    // Each gram: protein/carbs = 4 cal, fat = 9 cal
    const proteinTargetCalories = macros.protein.target * 4;
    const carbsTargetCalories = macros.carbs.target * 4;
    const fatTargetCalories = macros.fat.target * 9;
    const totalTargetMacroCalories = proteinTargetCalories + carbsTargetCalories + fatTargetCalories;

    if (totalTargetMacroCalories === 0) {
      return null;
    }

    // Percentage of each macro in the TARGET (this defines the wheel segments)
    const proteinTargetPercent = (proteinTargetCalories / totalTargetMacroCalories) * 100;
    const carbsTargetPercent = (carbsTargetCalories / totalTargetMacroCalories) * 100;
    const fatTargetPercent = (fatTargetCalories / totalTargetMacroCalories) * 100;

    // Calculate consumed calories
    const proteinConsumedCalories = macros.protein.consumed * 4;
    const carbsConsumedCalories = macros.carbs.consumed * 4;
    const fatConsumedCalories = macros.fat.consumed * 9;

    // Calculate what percentage of each macro target was consumed
    const proteinConsumedRatio = proteinTargetCalories > 0 
      ? Math.min(proteinConsumedCalories / proteinTargetCalories, 1)
      : 0;
    const carbsConsumedRatio = carbsTargetCalories > 0
      ? Math.min(carbsConsumedCalories / carbsTargetCalories, 1)
      : 0;
    const fatConsumedRatio = fatTargetCalories > 0
      ? Math.min(fatConsumedCalories / fatTargetCalories, 1)
      : 0;

    // Calculate consumed percentage of the wheel (based on target segment size)
    const proteinConsumedPercent = proteinTargetPercent * proteinConsumedRatio;
    const carbsConsumedPercent = carbsTargetPercent * carbsConsumedRatio;
    const fatConsumedPercent = fatTargetPercent * fatConsumedRatio;

    return {
      protein: {
        targetPercent: proteinTargetPercent,
        consumedPercent: proteinConsumedPercent,
        startPercent: 0,
        color: 'rgb(59, 130, 246)' // Blue
      },
      carbs: {
        targetPercent: carbsTargetPercent,
        consumedPercent: carbsConsumedPercent,
        startPercent: proteinTargetPercent,
        color: 'rgb(34, 197, 94)' // Green
      },
      fat: {
        targetPercent: fatTargetPercent,
        consumedPercent: fatConsumedPercent,
        startPercent: proteinTargetPercent + carbsTargetPercent,
        color: 'rgb(234, 179, 8)' // Yellow
      }
    };
  };

  const macroSegments = calculateMacroSegments();

  // SVG circle parameters
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  
  // Helper function to create arc path for pie slice
  const createArc = (startPercent: number, endPercent: number) => {
    if (endPercent <= startPercent || endPercent - startPercent < 0.1) {
      return '';
    }
    
    const startAngle = (startPercent / 100) * 2 * Math.PI - Math.PI / 2; // Start from top
    const endAngle = (endPercent / 100) * 2 * Math.PI - Math.PI / 2;
    
    const x1 = 64 + radius * Math.cos(startAngle);
    const y1 = 64 + radius * Math.sin(startAngle);
    const x2 = 64 + radius * Math.cos(endAngle);
    const y2 = 64 + radius * Math.sin(endAngle);
    
    const largeArcFlag = (endAngle - startAngle) > Math.PI ? 1 : 0;
    
    return `M 64 64 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  // Get border color based on dominant macro
  const getBorderColor = () => {
    if (!macroSegments) {
      return 'border-orange-500/30';
    }
    
    const maxConsumed = Math.max(
      macroSegments.protein.consumedPercent,
      macroSegments.carbs.consumedPercent,
      macroSegments.fat.consumedPercent
    );
    
    if (maxConsumed === macroSegments.protein.consumedPercent && maxConsumed > 0) {
      return 'border-blue-500/30';
    } else if (maxConsumed === macroSegments.carbs.consumedPercent && maxConsumed > 0) {
      return 'border-green-500/30';
    } else if (maxConsumed === macroSegments.fat.consumedPercent && maxConsumed > 0) {
      return 'border-yellow-500/30';
    } else {
      return 'border-orange-500/30';
    }
  };

  return (
    <Card 
      className={cn(
        "bg-gradient-to-br from-card to-secondary border-2 shadow-xl hover:shadow-2xl transition-all",
        getBorderColor()
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

        {/* Circular Progress with Macro Segments */}
        <div className="flex justify-center">
          <div className="relative w-32 h-32">
            <svg width="128" height="128" viewBox="0 0 128 128" className="transform -rotate-90">
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
              
              {/* Macro Segments - Pie Chart */}
              {macroSegments ? (
                <>
                  {/* Protein Segment - shows consumed portion */}
                  {macroSegments.protein.consumedPercent > 0 && (
                    <path
                      d={createArc(
                        macroSegments.protein.startPercent,
                        macroSegments.protein.startPercent + macroSegments.protein.consumedPercent
                      )}
                      fill={macroSegments.protein.color}
                      opacity="0.85"
                      className="transition-all duration-500"
                    />
                  )}
                  {/* Carbs Segment - shows consumed portion */}
                  {macroSegments.carbs.consumedPercent > 0 && (
                    <path
                      d={createArc(
                        macroSegments.carbs.startPercent,
                        macroSegments.carbs.startPercent + macroSegments.carbs.consumedPercent
                      )}
                      fill={macroSegments.carbs.color}
                      opacity="0.85"
                      className="transition-all duration-500"
                    />
                  )}
                  {/* Fat Segment - shows consumed portion */}
                  {macroSegments.fat.consumedPercent > 0 && (
                    <path
                      d={createArc(
                        macroSegments.fat.startPercent,
                        macroSegments.fat.startPercent + macroSegments.fat.consumedPercent
                      )}
                      fill={macroSegments.fat.color}
                      opacity="0.85"
                      className="transition-all duration-500"
                    />
                  )}
                </>
              ) : (
                // Fallback: Simple progress circle
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (percentage / 100) * circumference}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              )}
            </svg>
            
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-2xl font-bold text-foreground">
                {Math.round(percentage)}%
              </div>
            </div>
          </div>
        </div>

        {/* Macro Legend */}
        {macroSegments && (
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: macroSegments.protein.color }} />
              <span className="text-muted-foreground">חלבון</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: macroSegments.carbs.color }} />
              <span className="text-muted-foreground">פחמימות</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: macroSegments.fat.color }} />
              <span className="text-muted-foreground">שומן</span>
            </div>
          </div>
        )}

        {/* Meals Access Button */}
        <Button
          onClick={onViewDetailsClick}
          className="w-full bg-primary hover:bg-primary/90 text-background font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all"
        >
          <Utensils className="w-4 h-4" />
          <span>{t('meals.meals', 'ארוחות')}</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

