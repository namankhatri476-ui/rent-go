import { useState } from "react";
import { Shield, Check, Info, CreditCard, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import CouponInput, { type CouponDiscount } from "@/components/CouponInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CheckoutSummaryProps {
  onCouponChange?: (discount: number, couponId: string | null) => void;
}

const CheckoutSummary = ({ onCouponChange }: CheckoutSummaryProps) => {
  const { items, getBreakdown, updateProtectionPlan } = useCart();
  const breakdown = getBreakdown();
  const [warningProductId, setWarningProductId] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponDiscount | null>(null);

  const calculateCouponDiscount = (coupon: CouponDiscount | null): number => {
    if (!coupon) return 0;
    const base = breakdown.payableNow;
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = Math.round(base * coupon.discount_value / 100);
      if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);
    } else {
      discount = coupon.discount_value;
    }
    return Math.min(discount, base);
  };

  const couponDiscount = calculateCouponDiscount(appliedCoupon);

  const handleCouponApply = (coupon: CouponDiscount | null) => {
    setAppliedCoupon(coupon);
    const disc = calculateCouponDiscount(coupon);
    onCouponChange?.(disc, coupon?.couponId || null);
  };

  const buyItems = items.filter(i => i.mode === 'buy');
  const rentItems = items.filter(i => i.mode === 'rent');
  const advanceItems = rentItems.filter(i => i.payAdvance);
  const monthlyItems = rentItems.filter(i => !i.payAdvance);

  if (items.length === 0) return null;

  const handleProtectionToggle = (productId: string, checked: boolean) => {
    if (!checked) {
      setWarningProductId(productId);
    } else {
      updateProtectionPlan(productId, true);
    }
  };

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
          {buyItems.map(item => (
            <div key={item.product.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                Buy: {item.product.name}
              </span>
              <span className="checkout-amount">₹{(item.buyPrice || 0).toLocaleString()}</span>
            </div>
          ))}

          {rentItems.length > 0 && breakdown.securityDeposit > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Refundable Deposit</span>
              <span className="checkout-amount">₹{breakdown.securityDeposit.toLocaleString()}</span>
            </div>
          )}

          {advanceItems.length > 0 && (
            <>
              {advanceItems.map(item => {
                const totalRent = item.selectedPlan.monthlyRent * item.selectedPlan.duration;
                const discount = Math.round(totalRent * (item.advanceDiscountPercent || 0) / 100);
                return (
                  <div key={`advance-${item.product.id}`} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Advance Rent: {item.product.name} ({item.selectedPlan.duration} mo)
                      </span>
                      <span className="checkout-amount">₹{totalRent.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Advance Discount ({item.advanceDiscountPercent}%)</span>
                        <span>- ₹{discount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {breakdown.deliveryFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery + Packaging</span>
              <span className="checkout-amount">₹{breakdown.deliveryFee.toLocaleString()}</span>
            </div>
          )}
          {breakdown.installationFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Installation Charges</span>
              <span className="checkout-amount">₹{breakdown.installationFee.toLocaleString()}</span>
            </div>
          )}
          
          <div className="border-t border-border pt-3 mt-3">
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Total Payable Now</span>
              <span className="font-bold text-xl text-foreground">
                ₹{breakdown.payableNow.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {couponDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Coupon Discount ({appliedCoupon?.code})</span>
            <span>- ₹{couponDiscount.toLocaleString()}</span>
          </div>
        )}

        <div className="border-t border-border pt-3 mt-3">
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Total Payable Now</span>
              <span className="font-bold text-xl text-foreground">
                ₹{(breakdown.payableNow - couponDiscount).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <CouponInput
          orderTotal={breakdown.payableNow}
          onApply={handleCouponApply}
          appliedCoupon={appliedCoupon}
        />
      </div>

      {/* Monthly Payable Section */}
      {monthlyItems.length > 0 && (
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
            {monthlyItems.map((item) => (
              <div key={item.product.id} className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border">
                <input
                  type="checkbox"
                  id={`protection-${item.product.id}`}
                  checked={item.addProtectionPlan}
                  onChange={(e) => handleProtectionToggle(item.product.id, e.target.checked)}
                  className="mt-1 accent-accent"
                />
                <label htmlFor={`protection-${item.product.id}`} className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-sm text-foreground">
                      Damage Protection
                    </span>
                    <span className="text-sm text-green-600 font-semibold">
                      +₹{item.protectionPlanPrice}/mo
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

          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-700 dark:text-green-400 font-medium flex items-start gap-2">
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
              Monthly rent will start from next billing cycle. No rent charged today.
            </p>
          </div>
        </div>
      )}

      {breakdown.advanceDiscount > 0 && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-700 dark:text-green-400 font-medium flex items-start gap-2">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
            You're saving ₹{breakdown.advanceDiscount.toLocaleString()} with advance payment!
          </p>
        </div>
      )}

      {/* Protection Plan Warning Dialog */}
      <Dialog open={!!warningProductId} onOpenChange={() => setWarningProductId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Protection Plan Disabled
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              By opting out of the Protection Plan, you may be responsible for damages, repairs, or replacement costs during the rental period.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="default"
              className="flex-1"
              onClick={() => {
                if (warningProductId) updateProtectionPlan(warningProductId, true);
                setWarningProductId(null);
              }}
            >
              Keep Protection Plan
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (warningProductId) updateProtectionPlan(warningProductId, false);
                setWarningProductId(null);
              }}
            >
              Continue Without Protection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckoutSummary;
