import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle, Package, Calendar, ArrowRight, FileText, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { verifyAndCreateOrders } from "@/services/checkoutService";

const OrderSuccess = () => {
  const location = useLocation();
  const passedOrderNumbers: string[] | undefined = location.state?.orderNumbers;
  
  const [orderNumbers, setOrderNumbers] = useState<string[]>(passedOrderNumbers || []);
  const [isVerifying, setIsVerifying] = useState(!passedOrderNumbers || passedOrderNumbers.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we have order numbers from navigation state, no need to verify
    if (passedOrderNumbers && passedOrderNumbers.length > 0) {
      return;
    }

    // Check if we're returning from Cashfree payment
    const pendingData = sessionStorage.getItem("pendingCheckout");
    if (pendingData) {
      verifyPaymentAndCreateOrders();
    } else {
      setIsVerifying(false);
    }
  }, []);

  const verifyPaymentAndCreateOrders = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyAndCreateOrders();
      if (result.success) {
        setOrderNumbers(result.orderNumbers);
        // Clear cart from localStorage
        try {
          localStorage.removeItem("cart-items");
        } catch {}
      } else {
        setError(result.error || "Payment verification failed");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Verifying your payment...</h2>
            <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="max-w-lg mx-auto text-center space-y-6 px-4">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Payment Failed</h1>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/checkout">
                <Button variant="hero" size="lg" className="w-full sm:w-auto">
                  Try Again
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Go Home
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto animate-scale-in">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <h1 className="text-3xl font-bold text-foreground">Order Placed Successfully!</h1>
              <p className="text-muted-foreground">Thank you for your order. Your payment has been confirmed.</p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 text-left space-y-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <span className="text-sm text-muted-foreground">Order Number{orderNumbers.length > 1 ? 's' : ''}</span>
                <div className="text-right">
                  {orderNumbers.map((num, idx) => (
                    <span key={idx} className="font-bold text-foreground block">{num}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Delivery</h3>
                    <p className="text-sm text-muted-foreground">Your product will be delivered within 2-3 business days</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Monthly Billing</h3>
                    <p className="text-sm text-muted-foreground">First rent will be charged on your next billing cycle</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6 text-left space-y-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground">Complete Your Order</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Thank you for your order! Please submit the required documents (Aadhaar, PAN, and 6-month Bank Statement) to complete the processing of your order.
              </p>
              <Link to="/my-account?tab=documents">
                <Button variant="outline" size="sm" className="gap-2 mt-2">
                  <FileText className="w-4 h-4" />
                  Upload Documents Now
                </Button>
              </Link>
            </div>

            <p className="text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.4s" }}>
              A confirmation email has been sent to your registered email address.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in" style={{ animationDelay: "0.5s" }}>
              <Link to="/my-account?tab=orders">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">View My Orders</Button>
              </Link>
              <Link to="/">
                <Button variant="hero" size="lg" className="gap-2 w-full sm:w-auto">
                  Continue Shopping
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderSuccess;
