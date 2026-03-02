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
    rentalPlans.forEach((p) => points.add(p.duration_months));
    [3, 6, 12].forEach((m) => {
      if (m <= maxDuration) points.add(m);
    });
    if (!points.has(1)) points.add(1);
    points.add(maxDuration);
    return Array.from(points).sort((a, b) => a - b);
  }, [maxDuration, rentalPlans]);

  const getPosition = (month: number) =>
    ((month - milestones[0]) / (milestones[milestones.length - 1] - milestones[0])) * 100;

  const filledWidth = getPosition(currentDuration);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Choose tenure</span>
        <span className="text-sm font-bold text-foreground">
          {currentDuration} {currentDuration === 1 ? "month" : "months"}
        </span>
      </div>

      {/* Timeline Track */}
      <div className="relative pt-3 pb-8 px-1">
        {/* Background track */}
        <div className="relative h-2 bg-muted rounded-full">
          {/* Filled track */}
          <div
            className="absolute h-full bg-destructive rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.max(0, Math.min(filledWidth, 100))}%` }}
          />
        </div>

        {/* Milestone dots */}
        {milestones.map((month) => {
          const pos = getPosition(month);
          const isActive = month <= currentDuration;
          const isCurrent = month === currentDuration;

          return (
            <button
              key={month}
              type="button"
              onClick={() => onDurationChange(month)}
              className="absolute -translate-x-1/2 group"
              style={{ left: `${pos}%`, top: "4px" }}
            >
              {/* Circle dot - white with border when inactive, white filled on active track */}
              <div
                className={`
                  w-5 h-5 rounded-full border-[3px] transition-all duration-200
                  ${
                    isCurrent
                      ? "bg-card border-destructive scale-110 shadow-md"
                      : isActive
                      ? "bg-card border-destructive"
                      : "bg-card border-muted-foreground/30 hover:border-muted-foreground/50 hover:scale-105"
                  }
                `}
              />
              {/* Label */}
              <span
                className={`
                  absolute top-7 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap transition-colors font-medium
                  ${
                    isCurrent
                      ? "text-destructive font-bold"
                      : isActive
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                `}
              >
                {month}+
              </span>
            </button>
          );
        })}

        {/* Invisible range slider for smooth dragging */}
        <input
          type="range"
          min={milestones[0]}
          max={milestones[milestones.length - 1]}
          step={1}
          value={currentDuration}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ top: "4px", height: "24px" }}
        />
      </div>
    </div>
  );
};

export default RentalDurationTimeline;
