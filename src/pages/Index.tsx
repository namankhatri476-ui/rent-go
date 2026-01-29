import { Link } from "react-router-dom";
import { ArrowRight, Printer, Laptop, Sofa, CheckCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import TrustBadges from "@/components/TrustBadges";
import { printerProducts } from "@/data/products";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, isVendor, isAdmin } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="hero-gradient py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge variant="success" className="mb-4">
              <CheckCircle className="w-3 h-3 mr-1" />
              Multi-Vendor Rental Marketplace
            </Badge>
            
            <h1 className="section-header text-4xl md:text-5xl lg:text-6xl">
              Rent Quality Products,{" "}
              <span className="text-gradient-primary">From Verified Vendors</span>
            </h1>
            
            <p className="section-subheader mx-auto text-lg md:text-xl">
              India's trusted marketplace connecting you with verified vendors offering printers, electronics, furniture, and more on flexible rental plans.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/products">
                <Button variant="hero" size="xl" className="gap-2 w-full sm:w-auto">
                  Browse Products
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to={user ? (isVendor ? "/vendor" : "/vendor/register") : "/auth"}>
                <Button variant="hero-outline" size="xl" className="w-full sm:w-auto gap-2">
                  <Building2 className="w-5 h-5" />
                  Become a Vendor
                </Button>
              </Link>
            </div>
            
            {/* Quick Links for logged in users */}
            {user && (isVendor || isAdmin) && (
              <div className="flex justify-center gap-4 pt-4">
                {isAdmin && (
                  <Link to="/admin">
                    <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                      Go to Admin Dashboard →
                    </Badge>
                  </Link>
                )}
                {isVendor && (
                  <Link to="/vendor">
                    <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                      Go to Vendor Dashboard →
                    </Badge>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 border-b border-border">
        <div className="container mx-auto px-4">
          <TrustBadges />
        </div>
      </section>

      {/* Categories Preview */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="section-header text-3xl md:text-4xl mb-4">
              Browse Categories
            </h2>
            <p className="section-subheader mx-auto">
              Start with printers, more categories coming soon!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Printers - Active */}
            <Link 
              to="/products" 
              className="group relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground transition-transform hover:-translate-y-1"
            >
              <div className="absolute top-4 right-4">
                <Badge variant="accent">Available</Badge>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-primary-foreground/10 flex items-center justify-center mb-4">
                <Printer className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Printers</h3>
              <p className="text-primary-foreground/80 text-sm mb-4">
                Laser, Inkjet & Multifunction
              </p>
              <span className="text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                Explore <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            {/* Electronics - Coming Soon */}
            <div className="relative overflow-hidden rounded-2xl bg-muted p-6 opacity-75">
              <div className="absolute top-4 right-4">
                <Badge variant="muted">Coming Soon</Badge>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-muted-foreground/10 flex items-center justify-center mb-4">
                <Laptop className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-muted-foreground mb-2">Electronics</h3>
              <p className="text-muted-foreground/80 text-sm">
                Laptops, Monitors & More
              </p>
            </div>

            {/* Furniture - Coming Soon */}
            <div className="relative overflow-hidden rounded-2xl bg-muted p-6 opacity-75">
              <div className="absolute top-4 right-4">
                <Badge variant="muted">Coming Soon</Badge>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-muted-foreground/10 flex items-center justify-center mb-4">
                <Sofa className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-muted-foreground mb-2">Furniture</h3>
              <p className="text-muted-foreground/80 text-sm">
                Desks, Chairs & Storage
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h2 className="section-header text-2xl md:text-3xl">
                Featured Printers
              </h2>
              <p className="text-muted-foreground mt-2">
                Top-rated printers for home and office
              </p>
            </div>
            <Link to="/products">
              <Button variant="outline" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {printerProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Preview */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="section-header text-3xl md:text-4xl mb-4">
              How Renting Works
            </h2>
            <p className="section-subheader mx-auto">
              Simple 4-step process to get started
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { step: "1", title: "Choose Product", desc: "Browse & select from verified vendors" },
              { step: "2", title: "Select Plan", desc: "Pick 3, 6, or 12 month rental duration" },
              { step: "3", title: "Pay Deposit", desc: "One-time deposit + delivery charges only" },
              { step: "4", title: "Get Delivered", desc: "Free doorstep delivery & installation" }
            ].map((item, index) => (
              <div key={index} className="relative text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {index < 3 && (
                  <div className="hidden md:block absolute top-7 left-[60%] w-[80%] border-t-2 border-dashed border-border" />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/how-it-works">
              <Button variant="default" size="lg" className="gap-2">
                Learn More
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Vendor CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-primary/80">
        <div className="container mx-auto px-4 text-center">
          <Building2 className="w-16 h-16 text-primary-foreground mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Start Selling on RentEase
          </h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
            Join our growing community of verified vendors. List your products, reach more customers, and grow your rental business.
          </p>
          <Link to={user ? (isVendor ? "/vendor" : "/vendor/register") : "/auth"}>
            <Button variant="accent" size="xl" className="gap-2">
              Register as Vendor
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Customer CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Start Renting?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Join thousands of happy customers. No long-term commitments, 
            flexible plans, and hassle-free experience.
          </p>
          <Link to="/products">
            <Button variant="hero" size="xl" className="gap-2">
              Get Started Today
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
