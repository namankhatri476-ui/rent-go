import { Check, X, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const features = [
  { label: "No Lump Sum Payment", purchase: false, emi: false, rentease: true },
  { label: "Monthly Pay Solution", purchase: false, emi: true, rentease: true },
  { label: "Free Relocation (Within City)", purchase: false, emi: false, rentease: true },
  { label: "Free Relocation (Between Cities)", purchase: false, emi: false, rentease: true },
  { label: "Free Repair & Maintenance", purchase: false, emi: false, rentease: true },
  { label: "No Long-term Commitment", purchase: false, emi: false, rentease: true },
  { label: "Easy Returns & Upgrades", purchase: false, emi: false, rentease: true },
];

const BenefitsComparison = () => {
  return (
    <section className="py-14 md:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Why Choose Us
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2">
            Renting is the <span className="text-primary">Smart Choice</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            See how RentEase compares to buying or EMI options
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 max-w-5xl mx-auto items-start">
          {/* Comparison Table */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
              {/* Table Header */}
              <div className="grid grid-cols-4 gap-0 bg-muted/50 border-b border-border/60">
                <div className="p-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Feature
                  </span>
                </div>
                <div className="p-4 text-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Purchase
                  </span>
                </div>
                <div className="p-4 text-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    EMI
                  </span>
                </div>
                <div className="p-4 text-center bg-primary/5">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    RentEase
                  </span>
                </div>
              </div>

              {/* Rows */}
              {features.map((feature, index) => (
                <div
                  key={feature.label}
                  className={`grid grid-cols-4 gap-0 ${
                    index < features.length - 1 ? "border-b border-border/40" : ""
                  }`}
                >
                  <div className="p-4 flex items-center">
                    <span className="text-sm text-foreground font-medium">
                      {feature.label}
                    </span>
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    {feature.purchase ? (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-primary" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-destructive" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    {feature.emi ? (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-primary" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-destructive" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-center bg-primary/5">
                    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-primary" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Promo Banner */}
          <div className="lg:col-span-2">
            <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 text-primary-foreground overflow-hidden">
              {/* Decorative */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/5 rounded-full -translate-y-10 translate-x-10" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-foreground/5 rounded-full translate-y-8 -translate-x-8" />

              <div className="relative z-10 space-y-5">
                <div className="inline-flex items-center gap-1.5 bg-primary-foreground/15 rounded-full px-3 py-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Special Offer
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-primary-foreground/80">
                    Move-in Sale
                  </p>
                  <p className="text-4xl font-extrabold mt-1">
                    Up to <span className="text-accent">20% OFF</span>
                  </p>
                  <p className="text-sm text-primary-foreground/70 mt-2">
                    On all furniture & appliance rentals. Limited time offer!
                  </p>
                </div>

                <Link to="/products">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="gap-2 rounded-xl font-bold w-full"
                  >
                    Browse Products <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-primary-foreground/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-extrabold">₹0</p>
                    <p className="text-[10px] text-primary-foreground/70 mt-0.5">
                      Delivery Charges
                    </p>
                  </div>
                  <div className="bg-primary-foreground/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-extrabold">100%</p>
                    <p className="text-[10px] text-primary-foreground/70 mt-0.5">
                      Refundable Deposit
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsComparison;
