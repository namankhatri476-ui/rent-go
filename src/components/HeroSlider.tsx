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
    bg: "from-primary/90 to-primary/70",
    accent: "bg-accent",
  },
  {
    title: "Flexible Rental Plans",
    subtitle: "Choose 3, 6, or 12 month plans — the longer you rent, the more you save!",
    cta: "View Plans",
    ctaLink: "/products",
    bg: "from-accent/90 to-accent/70",
    accent: "bg-primary",
  },
  {
    title: "Hassle-Free Experience",
    subtitle: "Free doorstep delivery, installation & 24/7 support included",
    cta: "Get Started",
    ctaLink: "/products",
    bg: "from-primary/80 to-accent/60",
    accent: "bg-success",
  },
];

const HeroSlider = () => {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="relative w-full overflow-hidden">
      <div className="relative h-[340px] md:h-[420px] lg:h-[480px]">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 flex items-center transition-all duration-700 ease-in-out ${
              i === current ? "opacity-100 translate-x-0" : i < current ? "opacity-0 -translate-x-full" : "opacity-0 translate-x-full"
            }`}
          >
            <div className={`w-full h-full bg-gradient-to-r ${slide.bg} flex items-center`}>
              <div className="container mx-auto px-4">
                <div className="max-w-2xl space-y-4 md:space-y-6">
                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-tight">
                    {slide.title}
                  </h1>
                  <p className="text-lg md:text-xl text-primary-foreground/85 max-w-lg">
                    {slide.subtitle}
                  </p>
                  <Link to={slide.ctaLink}>
                    <Button variant="accent" size="xl" className="gap-2 mt-2">
                      {slide.cta}
                      <ArrowRight className="w-5 h-5" />
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
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground hover:bg-background transition-colors"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground hover:bg-background transition-colors"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-3 h-3 rounded-full transition-all ${
              i === current ? "bg-accent w-8" : "bg-primary-foreground/40"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSlider;
