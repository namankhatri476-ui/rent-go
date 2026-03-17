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
  const ALLOWED_TENURES = [1, 3, 6, 11, 12, 24, 36];

  // Only show allowed tenure options up to maxDuration
  const months = useMemo(() => {
    return ALLOWED_TENURES.filter(m => m <= maxDuration);
  }, [maxDuration]);

  const getPosition = (month: number) =>
    ((month - 1) / (maxDuration - 1)) * 100;

  const filledWidth = maxDuration > 1 ? getPosition(currentDuration) : 100;

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
            className="absolute h-full bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.max(0, Math.min(filledWidth, 100))}%` }}
          />
        </div>

        {/* Month dots */}
        {months.map((month) => {
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
              {/* Circle dot */}
              <div
                className={`
                  w-5 h-5 rounded-full border-[3px] transition-all duration-200
                  ${
                    isCurrent
                      ? "bg-card border-primary scale-110 shadow-md"
                      : isActive
                      ? "bg-card border-primary"
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
                      ? "text-primary font-bold"
                      : isActive
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                `}
              >
                {month}
              </span>
            </button>
          );
        })}

        {/* Invisible range slider for smooth dragging */}
        <input
          type="range"
          min={1}
          max={maxDuration}
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
