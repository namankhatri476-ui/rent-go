import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Filter, SlidersHorizontal, Star, Loader2, MapPin, Truck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { printerProducts } from "@/data/products";

const Products = () => {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const { selectedLocation } = useLocation();
  const [searchParams] = useSearchParams();
  const categorySlug = searchParams.get('category');

  const { data: selectedCategory } = useQuery({
    queryKey: ['category-by-slug', categorySlug],
    queryFn: async () => {
      if (!categorySlug) return null;
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('slug', categorySlug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!categorySlug,
  });

  const { data: dbProducts, isLoading } = useQuery({
    queryKey: ['approved-products', selectedLocation?.id, selectedCategory?.id],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`*, categories (name), rental_plans (*), locations (name)`)
        .eq('status', 'approved')
        .eq('in_stock', true);
      if (selectedLocation?.id) query = query.eq('location_id', selectedLocation.id);
      if (selectedCategory?.id) query = query.eq('category_id', selectedCategory.id);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const products = useMemo(() => {
    const dbProductsList = dbProducts || [];
    const staticProducts = printerProducts
      .filter(p => !categorySlug || p.category.toLowerCase() === (selectedCategory?.name?.toLowerCase() || categorySlug.toLowerCase()))
      .map(p => ({
        id: p.id, name: p.name, brand: p.brand, slug: p.slug, description: p.description,
        images: p.images, rating: p.rating, review_count: p.reviewCount, tags: p.tags,
        rental_plans: p.rentalPlans.map(rp => ({
          id: rp.id, monthly_rent: rp.monthlyRent, duration_months: rp.duration,
          label: rp.label, security_deposit: rp.securityDeposit,
        })),
        categories: { name: p.category }, locations: null, isStatic: true,
      }));
    const dbSlugs = new Set(dbProductsList.map(p => p.slug));
    const uniqueStaticProducts = staticProducts.filter(p => !dbSlugs.has(p.slug));
    const allProducts = [...dbProductsList, ...uniqueStaticProducts];
    return selectedBrand ? allProducts.filter(p => p.brand === selectedBrand) : allProducts;
  }, [dbProducts, selectedBrand, categorySlug, selectedCategory]);

  const brands = useMemo(() => {
    const dbBrands = (dbProducts || []).map(p => p.brand).filter(Boolean);
    const staticBrands = printerProducts.map(p => p.brand);
    return [...new Set([...dbBrands, ...staticBrands])] as string[];
  }, [dbProducts]);

  const getLowestRent = (rentalPlans: any[]) => {
    if (!rentalPlans || rentalPlans.length === 0) return null;
    const activePlans = rentalPlans.filter(p => p.is_active !== false);
    if (activePlans.length === 0) return null;
    return Math.min(...activePlans.map(p => p.monthly_rent));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Page Header */}
      <section className="py-6 border-b border-border/50 bg-card">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <span className="text-border">/</span>
            <span className="text-foreground font-medium">Products</span>
          </nav>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                {selectedCategory?.name || 'Products'} on Rent {selectedLocation ? `in ${selectedLocation.name}` : ''}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {products?.length || 0} products available
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedLocation && (
                <Badge variant="secondary" className="gap-1 text-xs rounded-full">
                  <MapPin className="w-3 h-3" /> {selectedLocation.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Brand Filter */}
      <section className="py-3 border-b border-border/50 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button 
              onClick={() => setSelectedBrand(null)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                !selectedBrand ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              All Brands
            </button>
            {brands?.map((brand) => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedBrand === brand ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-8 flex-1">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : products?.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No products available at the moment.</p>
              <p className="text-sm text-muted-foreground mt-1">Check back later for new listings!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {products?.map((product) => {
                const lowestRent = getLowestRent(product.rental_plans);
                
                return (
                  <Link key={product.id} to={`/product/${product.slug}`} className="block group">
                    <div className="bg-card rounded-2xl border border-border/60 overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                      <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
                        )}
                        {product.tags?.[0] && (
                          <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground border-0 text-[10px]">{product.tags[0]}</Badge>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{product.brand}</p>
                        <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 mt-0.5">{product.name}</h3>
                        
                        <div className="flex items-center gap-1 mt-2">
                          <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                          <span className="text-xs font-medium">{product.rating || 0}</span>
                          <span className="text-[10px] text-muted-foreground">({product.review_count || 0})</span>
                        </div>

                        <div className="mt-auto pt-3">
                          {lowestRent && (
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-primary">₹{lowestRent.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground">/month</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Free Delivery</span>
                            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Protection</span>
                          </div>
                        </div>
                      </div>
                    </div>
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
