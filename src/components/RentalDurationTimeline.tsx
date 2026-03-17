import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface RentalDurationTimelineProps {
  maxDuration: number;
  currentDuration: number;
  onDurationChange: (duration: number) => void;
  rentalPlans: { duration_months: number; monthly_rent: number }[];
}

const STANDARD_TENURES = [1, 3, 6, 11, 12, 24, 36];

const RentalDurationTimeline = ({
  maxDuration,
  currentDuration,
  onDurationChange,
  rentalPlans,
}: RentalDurationTimelineProps) => {
  // Get available tenures from rental plans, filtered to standard options
  const availableTenures = useMemo(() => {
    const planDurations = rentalPlans.map((p) => p.duration_months);
    // Show only tenures that exist in the vendor's rental plans
    const tenures = STANDARD_TENURES.filter((t) => planDurations.includes(t));
    // If vendor has custom tenures not in standard list, include them too
    planDurations.forEach((d) => {
      if (!tenures.includes(d)) tenures.push(d);
    });
    return tenures.sort((a, b) => a - b);
  }, [rentalPlans]);

  // Find the rent for a given tenure
  const getRentForTenure = (months: number) => {
    const plan = rentalPlans.find((p) => p.duration_months === months);
    return plan?.monthly_rent ?? 0;
  };

  // Find savings compared to shortest tenure
  const baseRent = availableTenures.length > 0 ? getRentForTenure(availableTenures[0]) : 0;

  if (availableTenures.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Choose Tenure</span>
        <span className="text-sm font-bold text-primary">
          {currentDuration} {currentDuration === 1 ? "month" : "months"}
        </span>
      </div>

      {/* Tenure Options Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {availableTenures.map((months) => {
          const isSelected = months === currentDuration;
          const rent = getRentForTenure(months);
          const savingsPercent =
            baseRent > 0 && rent < baseRent
              ? Math.round(((baseRent - rent) / baseRent) * 100)
              : 0;

          return (
            <button
              key={months}
              type="button"
              onClick={() => onDurationChange(months)}
              className={cn(
                "relative flex flex-col items-center justify-center py-3 px-2 rounded-xl border-2 transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border/60 bg-card hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              {/* Savings badge */}
              {savingsPercent > 0 && (
                <span className="absolute -top-2 right-1 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none">
                  {savingsPercent}% off
                </span>
              )}

              <span
                className={cn(
                  "text-base font-bold",
                  isSelected ? "text-primary" : "text-foreground"
                )}
              >
                {months}
              </span>
              <span
                className={cn(
                  "text-[10px] mt-0.5",
                  isSelected
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                )}
              >
                {months === 1 ? "month" : "months"}
              </span>
              <span
                className={cn(
                  "text-[10px] mt-1 font-semibold",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
              >
                ₹{rent.toLocaleString()}/mo
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RentalDurationTimeline;
