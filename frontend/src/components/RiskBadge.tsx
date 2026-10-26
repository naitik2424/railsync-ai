import React from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, AlertCircle } from 'lucide-react';

interface RiskBadgeProps {
  level?: string;
  probability?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showProbability?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level = 'Low',
  probability,
  size = 'md',
  showProbability = true,
}) => {
  const getStyles = () => {
    switch (level) {
      case 'Critical':
        return {
          bg: 'bg-red-500/15 border-red-500/40 text-red-400',
          dot: 'bg-red-500',
          icon: <ShieldAlert className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
        };
      case 'High':
        return {
          bg: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
          dot: 'bg-amber-500',
          icon: <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
        };
      case 'Medium':
        return {
          bg: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400',
          dot: 'bg-yellow-500',
          icon: <AlertCircle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
        };
      case 'Low':
      default:
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
          dot: 'bg-emerald-500',
          icon: <CheckCircle className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
        };
    }
  };

  const styles = getStyles();
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${styles.bg} ${sizeClasses}`}
    >
      {styles.icon}
      <span>{level}</span>
      {showProbability && probability !== undefined && probability !== null && (
        <span className="opacity-80 font-mono text-[11px]">
          ({Math.round(probability * 100)}%)
        </span>
      )}
    </span>
  );
};
