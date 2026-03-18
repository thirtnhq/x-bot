import { cn } from '@/lib/utils';

interface ScoreBarProps {
  score: number;
  label?: string;
  className?: string;
  showValue?: boolean;
}

export function ScoreBar({ score, label, className, showValue = true }: ScoreBarProps) {
  let colorClass = 'bg-red-500'; // Below 60
  if (score >= 80) colorClass = 'bg-green-500';
  else if (score >= 60) colorClass = 'bg-yellow-500';

  let emoji = '🔴';
  if (score >= 80) emoji = '🟢';
  else if (score >= 60) emoji = '🟡';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && <span className="text-sm font-medium w-16 text-gray-300">{label}:</span>}
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={cn('h-full transition-all duration-500', colorClass)}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
      {showValue && (
        <span className="text-sm font-bold w-12 text-right">
          {emoji} {score}
        </span>
      )}
    </div>
  );
}
