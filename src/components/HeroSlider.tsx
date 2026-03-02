import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const slides = [
  {
    title: "Rent Printers for Your Office",
    subtitle: "Affordable monthly plans with free delivery & installation",
    cta: "Browse Printers",
    ctaLink: "/products",
    gradient: "from-[hsl(168,78%,22%)] via-[hsl(168,65%,30%)] to-[hsl(168,50%,40%)]",
  },
  {
    title: "Flexible Rental Plans",
    subtitle: "Choose 3, 6, or 12 month plans — the longer you rent, the more you save!",
    cta: "View Plans",
    ctaLink: "/products",
    gradient: "from-[hsl(220,25%,18%)] via-[hsl(220,20%,25%)] to-[hsl(168,40%,30%)]",
  },
  {
    title: "Hassle-Free Experience",
    subtitle: "Free doorstep delivery, installation & 24/7 support included",
    cta: "Get Started",
    ctaLink: "/products",
    gradient: "from-[hsl(24,80%,45%)] via-[hsl(24,70%,40%)] to-[hsl(168,50%,30%)]",
  },
];

const HeroSlider = () => {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const goTo = useCallback((index: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrent(index);
    setTimeout(() => setIsAnimating(false), 600);
  }, [isAnimating]);

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="relative w-full overflow-hidden">
      <div className="relative h-[320px] md:h-[400px] lg:h-[460px]">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-all duration-600 ease-out ${
              i === current 
                ? "opacity-100 scale-100" 
                : "opacity-0 scale-105"
            }`}
          >
            <div className={`w-full h-full bg-gradient-to-br ${slide.gradient} flex items-center`}>
              {/* Decorative circles */}
              <div className="absolute right-[-5%] top-[-10%] w-[40%] h-[120%] rounded-full bg-white/[0.04]" />
              <div className="absolute right-[10%] bottom-[-20%] w-[25%] h-[80%] rounded-full bg-white/[0.03]" />
              
              <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-xl space-y-5">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-[1.15] tracking-tight">
                    {slide.title}
                  </h1>
                  <p className="text-base md:text-lg text-white/80 max-w-md leading-relaxed">
                    {slide.subtitle}
                  </p>
                  <Link to={slide.ctaLink}>
                    <Button 
                      size="lg" 
                      className="bg-white text-foreground hover:bg-white/90 shadow-lg rounded-full gap-2 mt-1 font-semibold"
                    >
                      {slide.cta}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Progress dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? "bg-white w-8" : "bg-white/40 w-1.5"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSlider;
