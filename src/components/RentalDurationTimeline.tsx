import { useMemo } from "react";

interface RentalDurationTimelineProps {
  maxDuration: number;
  currentDuration: number;
  onDurationChange: (duration: number) => void;
  rentalPlans: { duration_months: number; monthly_rent: number }[];
}

const RentalDurationTimeline = ({
  maxDuration,
  currentDuration,
  onDurationChange,
  rentalPlans,
}: RentalDurationTimelineProps) => {
  const milestones = useMemo(() => {
    const points = new Set<number>();
    points.add(1);
    rentalPlans.forEach(p => points.add(p.duration_months));
    // Add common milestones
    [3, 6, 12].forEach(m => { if (m <= maxDuration) points.add(m); });
    points.add(maxDuration);
    return Array.from(points).sort((a, b) => a - b);
  }, [maxDuration, rentalPlans]);

  const getPosition = (month: number) => ((month - 1) / (maxDuration - 1)) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Rental Duration</span>
        <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
          {currentDuration} {currentDuration === 1 ? 'Month' : 'Months'}
        </span>
      </div>

      <div className="relative pt-4 pb-8 px-2">
        {/* Track */}
        <div className="relative h-1.5 bg-muted rounded-full">
          {/* Filled track */}
          <div
            className="absolute h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${getPosition(currentDuration)}%` }}
          />
        </div>

        {/* Milestone dots */}
        {milestones.map((month) => {
          const pos = getPosition(month);
          const isActive = month <= currentDuration;
          const isCurrent = month === currentDuration;
          const hasPlan = rentalPlans.some(p => p.duration_months === month);

          return (
            <button
              key={month}
              type="button"
              onClick={() => onDurationChange(month)}
              className="absolute -translate-x-1/2 group"
              style={{ left: `${pos}%`, top: '6px' }}
            >
              {/* Dot */}
              <div
                className={`
                  w-4 h-4 rounded-full border-2 transition-all duration-200
                  ${isCurrent
                    ? 'bg-primary border-primary scale-125 shadow-md shadow-primary/30'
                    : isActive
                      ? 'bg-primary border-primary'
                      : hasPlan
                        ? 'bg-background border-primary/50 hover:border-primary hover:scale-110'
                        : 'bg-background border-border hover:border-muted-foreground hover:scale-110'
                  }
                `}
              />
              {/* Label */}
              <span
                className={`
                  absolute top-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap transition-colors
                  ${isCurrent ? 'text-primary font-bold' : isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}
                `}
              >
                {month}m
              </span>
            </button>
          );
        })}

        {/* Draggable slider (invisible, over the timeline for smooth dragging) */}
        <input
          type="range"
          min={1}
          max={maxDuration}
          step={1}
          value={currentDuration}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ top: '6px', height: '20px' }}
        />
      </div>
    </div>
  );
};

export default RentalDurationTimeline;
