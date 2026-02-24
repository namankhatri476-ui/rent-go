import { Home, IndianRupee, Smile, RefreshCw } from "lucide-react";

const features = [
  {
    icon: Home,
    title: "Personalise Your Space",
    description: "Create a home that reflects you with our furniture and appliances.",
    bg: "bg-pink-100 dark:bg-pink-900/30",
  },
  {
    icon: IndianRupee,
    title: "Affordable Luxury",
    description: "Rent quality items — the longer you rent, the more you save!",
    bg: "bg-pink-200 dark:bg-pink-800/30",
  },
  {
    icon: Smile,
    title: "Hassle Free Experience",
    description: "Enjoy a smooth, stress-free rental experience with RentEase.",
    bg: "bg-pink-100 dark:bg-pink-900/30",
  },
  {
    icon: RefreshCw,
    title: "Flexible Rental Plans",
    description: "Our flexible plans let you exchange or return items easily.",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
];

const WhyRentSection = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Content */}
          <div>
            <p className="text-primary font-semibold mb-1">Why Rent?</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              The RentEase Experience
            </h2>
            <p className="text-muted-foreground mb-8">
              "Your Home, Your Style – The Smart Way to Rent!"
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className={`${feature.bg} rounded-xl p-5 transition-transform hover:-translate-y-1`}
                >
                  <div className="w-10 h-10 rounded-lg bg-background/60 flex items-center justify-center mb-3">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Decorative image area */}
          <div className="hidden lg:flex justify-center items-center relative">
            <div className="relative w-full max-w-md aspect-[4/5] rounded-2xl overflow-hidden bg-muted">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Home className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-xl font-bold text-foreground">Quality Products</p>
                  <p className="text-muted-foreground">From verified vendors across India</p>
                </div>
              </div>
            </div>
            {/* Decorative dots */}
            <div className="absolute -top-4 -right-4 grid grid-cols-5 gap-1.5">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-accent/60" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyRentSection;
