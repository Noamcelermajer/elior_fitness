import React from 'react';

interface MacroCircleProps {
  label: string;
  consumed: number;
  target: number;
  unit?: string;
  color: string;
  icon?: React.ReactNode;
}

const MacroCircle: React.FC<MacroCircleProps> = ({
  label,
  consumed,
  target,
  unit = 'g',
  color,
}) => {
  const percentage = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const roundedConsumed = Math.round(consumed);
  const roundedTarget = Math.round(target);
  const roundedRemaining = Math.max(roundedTarget - roundedConsumed, 0);
  
  // SVG circle parameters
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center space-y-3">
      {/* Label */}
      <h3 className="text-base font-medium" style={{ color }}>{label}</h3>
      
      {/* Circular Progress */}
      <div className="relative">
        <svg width="180" height="180" className="transform -rotate-90">
          {/* Background Circle */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="14"
            className="text-muted/30"
          />
          
          {/* Progress Circle */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-foreground">
            {roundedConsumed}
          </div>
          <div className="text-sm text-muted-foreground">
            /{roundedTarget}{unit}
          </div>
        </div>
      </div>
      
      {/* Remaining */}
      <div className="text-sm text-muted-foreground">
        {roundedRemaining}{unit} left
      </div>
    </div>
  );
};

export default MacroCircle;

