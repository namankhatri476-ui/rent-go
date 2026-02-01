import { Link, useLocation } from "react-router-dom";
import { CheckCircle, Package, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const OrderSuccess = () => {
  const location = useLocation();
  const orderNumbers: string[] = location.state?.orderNumbers || [`RE${Date.now().toString().slice(-8)}`];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto text-center space-y-6">
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto animate-scale-in">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>

            {/* Title */}
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <h1 className="text-3xl font-bold text-foreground">
                Order Placed Successfully!
              </h1>
              <p className="text-muted-foreground">
                Thank you for your order. We've received your payment.
              </p>
            </div>

            {/* Order Details Card */}
            <div 
              className="bg-card rounded-2xl border border-border p-6 text-left space-y-4 animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
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
                    <p className="text-sm text-muted-foreground">
                      Your product will be delivered within 2-3 business days
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Monthly Billing</h3>
                    <p className="text-sm text-muted-foreground">
                      First rent will be charged on your next billing cycle
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Info */}
            <p 
              className="text-sm text-muted-foreground animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              A confirmation email has been sent to your registered email address.
            </p>

            {/* Actions */}
            <div 
              className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in"
              style={{ animationDelay: "0.4s" }}
            >
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
