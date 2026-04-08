import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import TermsAgreementModal from "@/components/TermsAgreementModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CheckoutSummary from "@/components/CheckoutSummary";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { processCheckout } from "@/services/checkoutService";
import { toast } from "sonner";

type PaymentMethod = "upi" | "card" | "netbanking";

const Checkout = () => {
  const { items, getBreakdown, clearCart } = useCart();
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const breakdown = getBreakdown();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsVersion, setTermsVersion] = useState<number | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const finalPayable = breakdown.payableNow - couponDiscount;

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    upiId: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
    bankName: ""
  });

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        fullName: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please sign in to checkout");
      navigate("/auth?redirect=/checkout");
    }
  }, [user, authLoading, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePayClick = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!user) {
      toast.error("Please sign in to checkout");
      navigate("/auth?redirect=/checkout");
      return;
    }

    if (!formData.fullName || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.state || !formData.pincode) {
      toast.error("Please fill in all required fields");
      return;
    }

    setShowTerms(true);
  };

  const handleTermsAccepted = async (version: number) => {
    setShowTerms(false);
    setTermsVersion(version);
    setIsProcessing(true);

    try {
      console.log("[Checkout] Starting payment flow...");
      const result = await processCheckout(
        user!.id,
        items,
        breakdown,
        {
          ...formData,
          paymentMethod,
        },
        version,
        couponDiscount
      );

      console.log("[Checkout] processCheckout result:", result);

      if (result.success && result.orderNumbers.length > 0) {
        clearCart();
        toast.success("🎉 Payment Successful! Order placed.", {
          description: `Order number${result.orderNumbers.length > 1 ? 's' : ''}: ${result.orderNumbers.join(", ")}`,
          duration: 5000,
        });
        navigate("/order-success", { state: { orderNumbers: result.orderNumbers } });
      } else {
        toast.error("❌ Payment Failed", {
          description: result.error || "Something went wrong. Please try again.",
          duration: 6000,
        });
      }
    } catch (error: any) {
      console.error("[Checkout] Error:", error);
      if (error.message === "Payment cancelled by user") {
        toast.info("Payment cancelled", {
          description: "You cancelled the payment. No charges were made.",
          duration: 4000,
        });
      } else {
        toast.error("❌ Payment Error", {
          description: error.message || "An unexpected error occurred. Please try again.",
          duration: 6000,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center space-y-6">
            <h1 className="text-2xl font-bold text-foreground">No items to checkout</h1>
            <Link to="/products">
              <Button variant="hero">Browse Products</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>

          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
            Checkout
          </h1>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div className="checkout-section">
                <h2 className="font-bold text-lg text-foreground mb-6">Delivery Details</h2>
                <form className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input id="fullName" name="fullName" placeholder="John Doe" value={formData.fullName} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" name="email" type="email" placeholder="john@example.com" value={formData.email} onChange={handleInputChange} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="+91 98765 43210" value={formData.phone} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Delivery Address *</Label>
                    <Input id="address" name="address" placeholder="House No, Street, Locality" value={formData.address} onChange={handleInputChange} required />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input id="city" name="city" placeholder="Mumbai" value={formData.city} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Input id="state" name="state" placeholder="Maharashtra" value={formData.state} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input id="pincode" name="pincode" placeholder="400001" value={formData.pincode} onChange={handleInputChange} required />
                    </div>
                  </div>
                </form>
              </div>


              <div className="lg:hidden">
                <Button variant="hero" size="xl" className="w-full" onClick={handlePayClick} disabled={isProcessing}>
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    `Pay ₹${finalPayable.toLocaleString()} Now`
                  )}
                </Button>
              </div>
            </div>

            <div>
              <CheckoutSummary onCouponChange={(disc) => setCouponDiscount(disc)} />
              <div className="hidden lg:block mt-6">
                <Button variant="hero" size="xl" className="w-full" onClick={handlePayClick} disabled={isProcessing}>
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    `Pay ₹${finalPayable.toLocaleString()} Now`
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  By placing this order, you agree to our{" "}
                  <Link to="/legal/terms-of-service" className="underline">Terms of Service</Link> and{" "}
                  <Link to="/legal/privacy-policy" className="underline">Privacy Policy</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <TermsAgreementModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={handleTermsAccepted}
      />
    </div>
  );
};

export default Checkout;
