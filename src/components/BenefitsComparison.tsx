import { Check, X } from "lucide-react";
import moveInSaleImg from "@/assets/move-in-sale.png";

const features = [
  { label: "No Lump Sum Payment", purchase: false, emi: true, rentpr: true },
  { label: "Monthly Pay Solution", purchase: false, emi: true, rentpr: true },
  { label: "Free Relocation (within city and between cities)", purchase: false, emi: false, rentpr: true },
  { label: "Free Repair", purchase: false, emi: false, rentpr: true },
  { label: "No Commitment", purchase: false, emi: false, rentpr: true },
];

const CheckIcon = () => (
  <div className="w-7 h-7 rounded-full border-2 border-primary flex items-center justify-center">
    <Check className="w-4 h-4 text-primary" strokeWidth={3} />
  </div>
);

const CrossIcon = () => (
  <div className="w-7 h-7 rounded-full border-2 border-destructive flex items-center justify-center">
    <X className="w-4 h-4 text-destructive" strokeWidth={3} />
  </div>
);

const BenefitsComparison = () => {
  return (
    <section className="py-14 md:py-20 bg-muted/30">
      <div className="mx-auto px-4 max-w-[1400px]">
        {/* Heading */}
        <div className="mb-10 flex items-center gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Here's why <span className="text-primary italic">Rentpr is a perfect choice</span>
          </h2>
          <div className="hidden md:block h-[3px] w-16 bg-foreground rounded-full mt-1" />
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-10 items-start">
          {/* Left: Comparison Table */}
          <div>
            {/* Desktop Table */}
            <div className="hidden md:block">
              {/* Header */}
              <div className="grid grid-cols-[1fr_120px_120px_140px] items-center pb-4 border-b border-border">
                <div />
                <span className="text-sm font-semibold text-muted-foreground text-center">Purchase</span>
                <span className="text-sm font-semibold text-muted-foreground text-center">EMI</span>
                <div className="flex justify-center">
                  <span className="text-sm font-bold text-primary bg-primary/5 px-4 py-1.5 rounded-lg border border-primary/20">
                    Rentpr
                  </span>
                </div>
              </div>

              {/* Rows */}
              {features.map((feature, index) => (
                <div
                  key={feature.label}
                  className={`grid grid-cols-[1fr_120px_120px_140px] items-center py-5 ${
                    index < features.length - 1 ? "border-b border-border/50" : ""
                  }`}
                >
                  <span className="text-[15px] text-foreground font-medium">{feature.label}</span>
                  <div className="flex justify-center">
                    {feature.purchase ? <CheckIcon /> : <CrossIcon />}
                  </div>
                  <div className="flex justify-center">
                    {feature.emi ? <CheckIcon /> : <CrossIcon />}
                  </div>
                  <div className="flex justify-center">
                    <CheckIcon />
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {features.map((feature) => (
                <div key={feature.label} className="bg-card rounded-xl border border-border/60 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckIcon />
                    <span className="text-sm font-semibold text-foreground">{feature.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/50 py-2">
                      <div className="flex justify-center mb-1">
                        {feature.purchase ? <CheckIcon /> : <CrossIcon />}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">Purchase</span>
                    </div>
                    <div className="rounded-lg bg-muted/50 py-2">
                      <div className="flex justify-center mb-1">
                        {feature.emi ? <CheckIcon /> : <CrossIcon />}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">EMI</span>
                    </div>
                    <div className="rounded-lg bg-primary/5 py-2">
                      <div className="flex justify-center mb-1">
                        <CheckIcon />
                      </div>
                      <span className="text-[10px] text-primary font-bold">Rentpr</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Promo Image */}
          <div className="hidden lg:flex justify-center">
            <img
              src={moveInSaleImg}
              alt="The Great Move-in Sale - Up to 20% OFF on Rentpr"
              className="w-full max-w-[360px] rounded-2xl shadow-xl object-cover"
            />
          </div>
        </div>

        {/* Mobile promo image */}
        <div className="lg:hidden mt-8 flex justify-center">
          <img
            src={moveInSaleImg}
            alt="The Great Move-in Sale - Up to 20% OFF on Rentpr"
            className="w-full max-w-[320px] rounded-2xl shadow-lg object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export default BenefitsComparison;
