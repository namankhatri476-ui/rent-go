import { Shield, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { PROTECTION_PLAN_MONTHLY } from "@/types/product";

const CheckoutSummary = () => {
  const { items, getBreakdown, updateProtectionPlan } = useCart();
  const breakdown = getBreakdown();

  if (items.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Payable Now Section */}
      <div className="checkout-section">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-bold text-lg text-foreground">Payable Now</h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Refundable Deposit</span>
            <span className="checkout-amount">₹{breakdown.securityDeposit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery + Packaging</span>
            <span className="checkout-amount">₹{breakdown.deliveryFee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Installation Charges</span>
            <span className="checkout-amount">₹{breakdown.installationFee.toLocaleString()}</span>
          </div>
          
          <div className="border-t border-border pt-3 mt-3">
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Total Payable Now</span>
              <span className="font-bold text-xl text-foreground">
                ₹{breakdown.payableNow.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Coupon Section */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter coupon code"
              className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            />
            <Button variant="secondary" size="sm">
              Apply
            </Button>
          </div>
        </div>
      </div>

      {/* Monthly Payable Section */}
      <div className="checkout-section border-accent/30 bg-accent/5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
            <Info className="w-4 h-4 text-accent" />
          </div>
          <h3 className="font-bold text-lg text-foreground">Monthly Payable</h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Monthly Rent</span>
            <span className="checkout-amount">₹{breakdown.monthlyRent.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">GST (18%)</span>
            <span className="checkout-amount">₹{breakdown.gst.toLocaleString()}</span>
          </div>

          {/* Protection Plan Option */}
          {items.map((item) => (
            <div key={item.product.id} className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border">
              <input
                type="checkbox"
                id={`protection-${item.product.id}`}
                checked={item.addProtectionPlan}
                onChange={(e) => updateProtectionPlan(item.product.id, e.target.checked)}
                className="mt-1 accent-accent"
              />
              <label htmlFor={`protection-${item.product.id}`} className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-success" />
                  <span className="font-medium text-sm text-foreground">
                    Damage Protection
                  </span>
                  <span className="text-sm text-success font-semibold">
                    +₹{PROTECTION_PLAN_MONTHLY}/mo
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cover accidental damages. No repair costs during rental.
                </p>
              </label>
            </div>
          ))}

          {breakdown.protectionPlan > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Protection Plan</span>
              <span className="checkout-amount">₹{breakdown.protectionPlan.toLocaleString()}</span>
            </div>
          )}
          
          <div className="border-t border-border pt-3 mt-3">
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Monthly Total</span>
              <span className="font-bold text-xl text-accent">
                ₹{breakdown.monthlyTotal.toLocaleString()}/mo
              </span>
            </div>
          </div>
        </div>

        {/* Note about monthly billing */}
        <div className="mt-4 p-3 bg-success/10 rounded-lg border border-success/20">
          <p className="text-xs text-success font-medium flex items-start gap-2">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
            Monthly rent will start from next billing cycle. No rent charged today.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSummary;
