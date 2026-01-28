import { Shield, Truck, RotateCcw, Headphones, Clock, CreditCard } from "lucide-react";

const TrustBadges = () => {
  const badges = [
    {
      icon: Shield,
      title: "100% Refundable",
      description: "Security deposit fully refundable"
    },
    {
      icon: Truck,
      title: "Free Delivery",
      description: "Doorstep delivery & installation"
    },
    {
      icon: RotateCcw,
      title: "Easy Returns",
      description: "Hassle-free return process"
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      description: "Round-the-clock assistance"
    },
    {
      icon: Clock,
      title: "Flexible Tenure",
      description: "3, 6, or 12 month plans"
    },
    {
      icon: CreditCard,
      title: "Auto-Pay Setup",
      description: "Convenient monthly billing"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {badges.map((badge) => (
        <div
          key={badge.title}
          className="flex flex-col items-center text-center p-4 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <badge.icon className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-semibold text-sm text-foreground">{badge.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
        </div>
      ))}
    </div>
  );
};

export default TrustBadges;
