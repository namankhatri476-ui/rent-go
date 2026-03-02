import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import TrustBadges from "@/components/TrustBadges";
import HeroSlider from "@/components/HeroSlider";
import WhyRentSection from "@/components/WhyRentSection";
import StatsSection from "@/components/StatsSection";
import { printerProducts } from "@/data/products";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";

const Index = () => {
  const { user, isVendor, isAdmin } = useAuth();
  const { selectedLocation } = useLocation();

  useEffect(() => {
    document.title = "RentEase | Home";
  }, []);

  // Fetch dynamic categories from DB
  const { data: categories } = useQuery({
    queryKey: ['homepage-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name')
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  // Fetch featured products from DB filtered by selected location
  const { data: featuredProducts } = useQuery({
    queryKey: ['featured-products', selectedLocation?.id],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          categories (name),
          rental_plans (*)
        `)
        .eq('status', 'approved')
        .eq('in_stock', true);

      // Filter by location if one is selected
      if (selectedLocation?.id) {
        query = query.eq('location_id', selectedLocation.id);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  // Use DB products if available, otherwise fall back to static
  const displayProducts = featuredProducts && featuredProducts.length > 0
    ? featuredProducts
    : null;

  // Category icon mapping
  const getCategoryIcon = (name: string) => {
    return <Printer className="w-8 h-8" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      {/* Hero Slider */}
      <HeroSlider />

      {/* Trust Badges */}
      <section className="py-12 border-b border-border">
        <div className="container mx-auto px-4">
          <TrustBadges />
        </div>
      </section>

      {/* Dynamic Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="section-header text-3xl md:text-4xl mb-4">Browse Categories</h2>
            <p className="section-subheader mx-auto">
              {categories && categories.length > 0 
                ? 'Explore our rental categories' 
                : 'Start with printers, more categories coming soon!'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {categories && categories.length > 0 ? (
              categories.slice(0, 3).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.slug}`}
                  className="group relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground transition-transform hover:-translate-y-1"
                >
                  <div className="absolute top-4 right-4">
                    <Badge variant="accent">Available</Badge>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-primary-foreground/10 flex items-center justify-center mb-4">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} className="w-8 h-8 object-cover rounded" />
                    ) : (
                      getCategoryIcon(cat.name)
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{cat.name}</h3>
                  <p className="text-primary-foreground/80 text-sm mb-4">
                    {cat.description || 'Browse products'}
                  </p>
                  <span className="text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Explore <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              ))
            ) : (
              // Fallback static categories
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
                <p className="text-primary-foreground/80 text-sm mb-4">Laser, Inkjet & Multifunction</p>
                <span className="text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                  Explore <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h2 className="section-header text-2xl md:text-3xl">Featured Products</h2>
              <p className="text-muted-foreground mt-2">Top-rated products for home and office</p>
            </div>
            <Link to="/products">
              <Button variant="outline" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayProducts ? (
              displayProducts.map((product) => {
                const activePlans = (product.rental_plans || []).filter((rp: any) => rp.is_active !== false);
                const lowestRent = activePlans.length > 0
                  ? Math.min(...activePlans.map((rp: any) => rp.monthly_rent))
                  : null;
                
                return (
                  <Link key={product.id} to={`/product/${product.slug}`} className="block">
                    <div className="group overflow-hidden rounded-xl border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-card">
                      <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
                        )}
                        {product.tags?.[0] && (
                          <Badge className="absolute top-3 left-3" variant="accent">{product.tags[0]}</Badge>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{product.brand}</p>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
                        {lowestRent && (
                          <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-lg font-bold text-primary">₹{lowestRent.toLocaleString()}</span>
                            <span className="text-sm text-muted-foreground">/month</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              printerProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* How It Works Preview */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="section-header text-3xl md:text-4xl mb-4">How Renting Works</h2>
            <p className="section-subheader mx-auto">Simple 4-step process to get started</p>
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

      {/* Why Rent Section */}
      <WhyRentSection />

      {/* Stats Section */}
      <StatsSection />

      <Footer />
    </div>
  );
};

export default Index;
