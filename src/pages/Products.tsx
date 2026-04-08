import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Star, Loader2, MapPin, Truck, Shield, SlidersHorizontal, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { printerProducts } from "@/data/products";

const Products = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const { selectedLocation } = useLocation();
  const [searchParams] = useSearchParams();
  const categorySlug = searchParams.get('category');

  const { data: categoryFromSlug } = useQuery({
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

  const { data: categories } = useQuery({
    queryKey: ['all-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const activeCategoryId = selectedCategory || categoryFromSlug?.id || null;

  // Fetch ALL approved products (no location filtering — show everything)
  const { data: dbProducts, isLoading } = useQuery({
    queryKey: ['approved-products', activeCategoryId],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`*, categories (name), rental_plans (*)`)
        .eq('status', 'approved')
        .eq('in_stock', true);
      if (activeCategoryId) query = query.eq('category_id', activeCategoryId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch which products are available in user's selected location
  const { data: locationProductIds } = useQuery({
    queryKey: ['location-product-ids', selectedLocation?.id],
    queryFn: async () => {
      if (!selectedLocation?.id) return null;
      const { data: plData } = await supabase
        .from('product_locations')
        .select('product_id')
        .eq('location_id', selectedLocation.id);
      return new Set((plData || []).map(pl => pl.product_id));
    },
    enabled: !!selectedLocation?.id,
  });

  const products = useMemo(() => {
    const dbProductsList = dbProducts || [];
    const activeCatName = categories?.find(c => c.id === activeCategoryId)?.name || categoryFromSlug?.name;
    const staticProducts = printerProducts
      .filter(p => !activeCategoryId || p.category.toLowerCase() === (activeCatName?.toLowerCase() || ''))
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
    let allProducts = [...dbProductsList, ...uniqueStaticProducts];

    // Price filter
    allProducts = allProducts.filter(p => {
      const plans = (p.rental_plans || []).filter((rp: any) => rp.is_active !== false);
      if (plans.length === 0) return true;
      const lowest = Math.min(...plans.map((rp: any) => rp.monthly_rent));
      return lowest >= priceRange[0] && lowest <= priceRange[1];
    });

    return allProducts;
  }, [dbProducts, activeCategoryId, categories, categoryFromSlug, priceRange]);

  const getLowestRent = (rentalPlans: any[]) => {
    if (!rentalPlans || rentalPlans.length === 0) return null;
    const activePlans = rentalPlans.filter(p => p.is_active !== false);
    if (activePlans.length === 0) return null;
    return Math.min(...activePlans.map(p => p.monthly_rent));
  };

  const isProductAvailableInLocation = (productId: string) => {
    if (!selectedLocation?.id) return true; // No location selected = show all as available
    if (!locationProductIds) return true; // Still loading
    return locationProductIds.has(productId);
  };

  const activeFilterCount = (activeCategoryId && !categorySlug ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] < 50000 ? 1 : 0);

  const clearFilters = () => {
    setSelectedCategory(null);
    setPriceRange([0, 50000]);
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
                {categoryFromSlug?.name || (categories?.find(c => c.id === activeCategoryId)?.name) || 'Products'} on Rent {selectedLocation ? `in ${selectedLocation.name}` : ''}
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

      {/* Filters */}
      <section className="py-3 border-b border-border/50 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full text-xs gap-1.5">
                  <SlidersHorizontal className="w-3 h-3" />
                  Category
                  {activeCategoryId && !categorySlug && <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full">1</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="start">
                <p className="text-xs font-semibold mb-2 text-foreground">Filter by Category</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {categories?.map((cat) => (
                    <div key={cat.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cat-${cat.id}`}
                        checked={activeCategoryId === cat.id}
                        onCheckedChange={(checked) => setSelectedCategory(checked ? cat.id : null)}
                      />
                      <Label htmlFor={`cat-${cat.id}`} className="text-xs cursor-pointer">{cat.name}</Label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Price Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full text-xs gap-1.5">
                  <SlidersHorizontal className="w-3 h-3" />
                  Price
                  {(priceRange[0] > 0 || priceRange[1] < 50000) && <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full">1</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4" align="start">
                <p className="text-xs font-semibold mb-3 text-foreground">Monthly Rent Range</p>
                <Slider
                  min={0}
                  max={50000}
                  step={500}
                  value={priceRange}
                  onValueChange={(val) => setPriceRange(val as [number, number])}
                  className="mb-3"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>₹{priceRange[0].toLocaleString()}</span>
                  <span>₹{priceRange[1].toLocaleString()}</span>
                </div>
              </PopoverContent>
            </Popover>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="rounded-full text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
                <X className="w-3 h-3" /> Clear filters
              </Button>
            )}
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
                const available = isProductAvailableInLocation(product.id);
                
                return (
                  <Link key={product.id} to={`/product/${product.slug}`} className="block group">
                    <div className={`bg-card rounded-2xl border border-border/60 overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-300 h-full flex flex-col ${!available ? 'opacity-80' : ''}`}>
                      <div className="aspect-[4/3] relative overflow-hidden bg-white">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
                        )}
                        {product.tags?.[0] && (
                          <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground border-0 text-[10px]">{product.tags[0]}</Badge>
                        )}
                        {!available && selectedLocation && (
                          <div className="absolute bottom-0 left-0 right-0 bg-destructive/90 text-destructive-foreground text-[10px] font-medium py-1.5 px-3 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" />
                            Not available in {selectedLocation.name}
                          </div>
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
