import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Filter, SlidersHorizontal, Star, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Products = () => {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const { selectedLocation } = useLocation();

  // Fetch approved products from Supabase
  const { data: products, isLoading } = useQuery({
    queryKey: ['approved-products', selectedBrand, selectedLocation?.id],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          categories (name),
          rental_plans (*),
          locations (name)
        `)
        .eq('status', 'approved')
        .eq('in_stock', true);

      if (selectedBrand) {
        query = query.eq('brand', selectedBrand);
      }

      if (selectedLocation?.id) {
        query = query.eq('location_id', selectedLocation.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get unique brands for filter
  const { data: brands } = useQuery({
    queryKey: ['product-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('brand')
        .eq('status', 'approved')
        .not('brand', 'is', null);
      if (error) throw error;
      const uniqueBrands = [...new Set(data.map(p => p.brand).filter(Boolean))];
      return uniqueBrands as string[];
    },
  });

  const getLowestRent = (rentalPlans: any[]) => {
    if (!rentalPlans || rentalPlans.length === 0) return null;
    return Math.min(...rentalPlans.map(p => p.monthly_rent));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Page Header */}
      <section className="py-8 border-b border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <span className="text-foreground">Products</span>
          </nav>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Products on Rent {selectedLocation ? `in ${selectedLocation.name}` : ''}
              </h1>
              <p className="text-muted-foreground mt-1">
                {products?.length || 0} products available
                {selectedLocation && ` in ${selectedLocation.name}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {selectedLocation && (
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="w-3 h-3" />
                  {selectedLocation.name}
                </Badge>
              )}
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Sort
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Tags */}
      <section className="py-4 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Badge 
              variant={!selectedBrand ? "default" : "outline"} 
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedBrand(null)}
            >
              All Brands
            </Badge>
            {brands?.map((brand) => (
              <Badge 
                key={brand}
                variant={selectedBrand === brand ? "default" : "outline"} 
                className="cursor-pointer whitespace-nowrap hover:bg-secondary"
                onClick={() => setSelectedBrand(brand)}
              >
                {brand}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-8 flex-1">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : products?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No products available at the moment.</p>
              <p className="text-sm text-muted-foreground mt-2">Check back later for new listings!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products?.map((product) => {
                const lowestRent = getLowestRent(product.rental_plans);
                
                return (
                  <Link 
                    key={product.id} 
                    to={`/product/${product.slug}`}
                    className="block"
                  >
                    <Card className="group overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg h-full">
                      <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No Image
                          </div>
                        )}
                        {product.tags?.[0] && (
                          <Badge className="absolute top-3 left-3" variant="accent">
                            {product.tags[0]}
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="mb-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {product.brand}
                          </p>
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {product.name}
                          </h3>
                        </div>
                        
                        {/* Rating */}
                        <div className="flex items-center gap-1 mb-3">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{product.rating || 0}</span>
                          <span className="text-xs text-muted-foreground">
                            ({product.review_count || 0})
                          </span>
                        </div>

                        {/* Price */}
                        {lowestRent && (
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-primary">
                              ₹{lowestRent.toLocaleString()}
                            </span>
                            <span className="text-sm text-muted-foreground">/month</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Products;