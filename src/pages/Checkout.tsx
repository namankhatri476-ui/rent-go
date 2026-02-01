import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Smartphone, Building2, CheckCircle, Loader2 } from "lucide-react";
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

  // Pre-fill form with user profile data
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

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please sign in to checkout");
      navigate("/auth?redirect=/checkout");
    }
  }, [user, authLoading, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please sign in to checkout");
      navigate("/auth?redirect=/checkout");
      return;
    }

    if (!formData.fullName || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.state || !formData.pincode) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsProcessing(true);

    try {
      const result = await processCheckout(
        user.id,
        items,
        breakdown,
        {
          ...formData,
          paymentMethod,
        }
      );

      if (result.success) {
        clearCart();
        toast.success("Order placed successfully!", {
          description: `Order numbers: ${result.orderNumbers.join(", ")}`
        });
        navigate("/order-success", { state: { orderNumbers: result.orderNumbers } });
      } else {
        toast.error("Failed to place order", {
          description: result.error || "Please try again"
        });
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error("An error occurred", {
        description: error.message || "Please try again"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Show loading state while checking auth
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
          {/* Back Link */}
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
            {/* Left Column - Form */}
            <div className="space-y-8">
              {/* Delivery Details */}
              <div className="checkout-section">
                <h2 className="font-bold text-lg text-foreground mb-6">Delivery Details</h2>
                <form className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Delivery Address *</Label>
                    <Input
                      id="address"
                      name="address"
                      placeholder="House No, Street, Locality"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        placeholder="Mumbai"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        name="state"
                        placeholder="Maharashtra"
                        value={formData.state}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input
                        id="pincode"
                        name="pincode"
                        placeholder="400001"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </form>
              </div>

              {/* Payment Method */}
              <div className="checkout-section">
                <h2 className="font-bold text-lg text-foreground mb-6">Payment Method</h2>
                
                <div className="space-y-4">
                  {/* Payment Options */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("upi")}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        paymentMethod === "upi"
                          ? "border-primary bg-secondary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Smartphone className="w-6 h-6 mx-auto mb-2 text-foreground" />
                      <span className="text-sm font-medium text-foreground">UPI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        paymentMethod === "card"
                          ? "border-primary bg-secondary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <CreditCard className="w-6 h-6 mx-auto mb-2 text-foreground" />
                      <span className="text-sm font-medium text-foreground">Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("netbanking")}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        paymentMethod === "netbanking"
                          ? "border-primary bg-secondary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Building2 className="w-6 h-6 mx-auto mb-2 text-foreground" />
                      <span className="text-sm font-medium text-foreground">Bank</span>
                    </button>
                  </div>

                  {/* Payment Details */}
                  <div className="pt-4">
                    {paymentMethod === "upi" && (
                      <div className="space-y-2">
                        <Label htmlFor="upiId">UPI ID</Label>
                        <Input
                          id="upiId"
                          name="upiId"
                          placeholder="yourname@upi"
                          value={formData.upiId}
                          onChange={handleInputChange}
                        />
                      </div>
                    )}

                    {paymentMethod === "card" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="cardNumber">Card Number</Label>
                          <Input
                            id="cardNumber"
                            name="cardNumber"
                            placeholder="1234 5678 9012 3456"
                            value={formData.cardNumber}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cardExpiry">Expiry Date</Label>
                            <Input
                              id="cardExpiry"
                              name="cardExpiry"
                              placeholder="MM/YY"
                              value={formData.cardExpiry}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cardCvv">CVV</Label>
                            <Input
                              id="cardCvv"
                              name="cardCvv"
                              type="password"
                              placeholder="***"
                              value={formData.cardCvv}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMethod === "netbanking" && (
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Select Bank</Label>
                        <Input
                          id="bankName"
                          name="bankName"
                          placeholder="Enter bank name"
                          value={formData.bankName}
                          onChange={handleInputChange}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Auto-debit Notice */}
                <div className="mt-6 p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-foreground">Auto-Pay Enabled</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Monthly rent will be auto-debited starting next month. You can cancel anytime.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button (Mobile) */}
              <div className="lg:hidden">
                <Button
                  variant="hero"
                  size="xl"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : `Pay ₹${breakdown.payableNow.toLocaleString()} Now`}
                </Button>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div>
              <CheckoutSummary />

              {/* Submit Button (Desktop) */}
              <div className="hidden lg:block mt-6">
                <Button
                  variant="hero"
                  size="xl"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : `Pay ₹${breakdown.payableNow.toLocaleString()} Now`}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  By placing this order, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
