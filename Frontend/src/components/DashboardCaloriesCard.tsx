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

  // Calculate macro distribution from TARGET (not consumed)
  const calculateMacroSegments = () => {
    if (!macros || target === 0) {
      return null;
    }

    const totalTargetMacros = macros.protein.target + macros.carbs.target + macros.fat.target;
    if (totalTargetMacros === 0) {
      return null;
    }

    // Calculate percentage of each macro from total target calories
    // Each gram: protein/carbs = 4 cal, fat = 9 cal
    const proteinCalories = macros.protein.target * 4;
    const carbsCalories = macros.carbs.target * 4;
    const fatCalories = macros.fat.target * 9;
    const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

    if (totalMacroCalories === 0) {
      return null;
    }

    // Percentage of each macro in the target
    const proteinPercent = (proteinCalories / totalMacroCalories) * 100;
    const carbsPercent = (carbsCalories / totalMacroCalories) * 100;
    const fatPercent = (fatCalories / totalMacroCalories) * 100;

    // Calculate consumed percentages
    const proteinConsumedCalories = macros.protein.consumed * 4;
    const carbsConsumedCalories = macros.carbs.consumed * 4;
    const fatConsumedCalories = macros.fat.consumed * 9;

    const proteinConsumedPercent = totalMacroCalories > 0 
      ? Math.min((proteinConsumedCalories / totalMacroCalories) * 100, proteinPercent)
      : 0;
    const carbsConsumedPercent = totalMacroCalories > 0
      ? Math.min((carbsConsumedCalories / totalMacroCalories) * 100, carbsPercent)
      : 0;
    const fatConsumedPercent = totalMacroCalories > 0
      ? Math.min((fatConsumedCalories / totalMacroCalories) * 100, fatPercent)
      : 0;

    return {
      protein: {
        targetPercent: proteinPercent,
        consumedPercent: proteinConsumedPercent,
        color: 'rgb(59, 130, 246)' // Blue
      },
      carbs: {
        targetPercent: carbsPercent,
        consumedPercent: carbsConsumedPercent,
        color: 'rgb(34, 197, 94)' // Green
      },
      fat: {
        targetPercent: fatPercent,
        consumedPercent: fatConsumedPercent,
        color: 'rgb(234, 179, 8)' // Yellow
      }
    };
  };

  const macroSegments = calculateMacroSegments();

  // SVG circle parameters
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  
  // Helper function to create arc path
  const createArc = (startPercent: number, endPercent: number) => {
    const startAngle = (startPercent / 100) * 360 - 90; // Start from top
    const endAngle = (endPercent / 100) * 360 - 90;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = 64 + radius * Math.cos(startRad);
    const y1 = 64 + radius * Math.sin(startRad);
    const x2 = 64 + radius * Math.cos(endRad);
    const y2 = 64 + radius * Math.sin(endRad);
    
    const largeArcFlag = endPercent - startPercent > 50 ? 1 : 0;
    
    return `M 64 64 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

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

        {/* Circular Progress with Macro Segments */}
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
              
              {/* Macro Segments */}
              {macroSegments ? (
                <>
                  {/* Protein Segment */}
                  <path
                    d={createArc(0, macroSegments.protein.consumedPercent)}
                    fill={macroSegments.protein.color}
                    opacity="0.8"
                    className="transition-all duration-500"
                  />
                  {/* Carbs Segment */}
                  <path
                    d={createArc(
                      macroSegments.protein.targetPercent,
                      macroSegments.protein.targetPercent + macroSegments.carbs.consumedPercent
                    )}
                    fill={macroSegments.carbs.color}
                    opacity="0.8"
                    className="transition-all duration-500"
                  />
                  {/* Fat Segment */}
                  <path
                    d={createArc(
                      macroSegments.protein.targetPercent + macroSegments.carbs.targetPercent,
                      macroSegments.protein.targetPercent + macroSegments.carbs.targetPercent + macroSegments.fat.consumedPercent
                    )}
                    fill={macroSegments.fat.color}
                    opacity="0.8"
                    className="transition-all duration-500"
                  />
                  
                  {/* Progress Ring - shows consumed amount */}
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (percentage / 100) * circumference}
                    strokeLinecap="round"
                    className="text-muted/20 transition-all duration-500"
                  />
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
            <div className="absolute inset-0 flex flex-col items-center justify-center">
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

