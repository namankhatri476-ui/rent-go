import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface InteractiveRatingProps {
  currentRating: number;
  reviewCount: number;
  productId: string;
}

const InteractiveRating = ({ currentRating, reviewCount, productId }: InteractiveRatingProps) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);

  const displayRating = hoverRating || userRating || currentRating;

  const handleRate = (rating: number) => {
    setUserRating(rating);
    setHasRated(true);
    toast.success(`You rated this product ${rating} star${rating > 1 ? "s" : ""}!`, {
      description: "Thank you for your feedback",
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Stars */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => handleRate(star)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  star <= displayRating
                    ? "fill-accent text-accent"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Rating text */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-foreground">
            {hasRated ? userRating.toFixed(1) : (currentRating || 0).toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">
            ({hasRated ? reviewCount + 1 : reviewCount} review{reviewCount !== 1 ? "s" : ""})
          </span>
        </div>
      </div>

      {!hasRated && (
        <p className="text-[10px] text-muted-foreground">
          Click a star to rate this product
        </p>
      )}
      {hasRated && (
        <p className="text-[10px] text-primary font-medium">
          ✓ Your rating has been recorded
        </p>
      )}
    </div>
  );
};

export default InteractiveRating;
