import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Star, Loader2, MapPin, Truck, Shield, SlidersHorizontal, X, AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { printerProducts } from "@/data/products";

const Products = () => {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const { selectedLocation } = useLocation();
  const [searchParams] = useSearchParams();
  const categorySlug = searchParams.get('category');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: categoryFromSlug } = useQuery({
    queryKey: ['category-by-slug', categorySlug],
    queryFn: async () => {
      if (!categorySlug) return null;
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, parent_id')
        .eq('slug', categorySlug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!categorySlug,
  });

  const { data: allCategories } = useQuery({
    queryKey: ['all-categories-with-subs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, parent_id')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const mainCategories = allCategories?.filter(c => !c.parent_id) || [];
  const getSubcategories = (parentId: string) =>
    allCategories?.filter(c => c.parent_id === parentId) || [];

  // Build active category IDs for filtering (includes selected + their subcategories)
  const activeCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    
    // From URL slug
    if (categoryFromSlug) {
      ids.add(categoryFromSlug.id);
      // If it's a main category, include its subcategories too
      if (!categoryFromSlug.parent_id) {
        getSubcategories(categoryFromSlug.id).forEach(sub => ids.add(sub.id));
      }
    }
    
    // From manual selection
    selectedCategories.forEach(id => {
      ids.add(id);
      // If a main category is selected, include its subcategories
      const subs = getSubcategories(id);
      subs.forEach(sub => ids.add(sub.id));
    });
    
    return ids;
  }, [selectedCategories, categoryFromSlug, allCategories]);

  const { data: dbProducts, isLoading } = useQuery({
    queryKey: ['approved-products', Array.from(activeCategoryIds)],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`*, categories (name), rental_plans (*)`)
        .eq('status', 'approved')
        .eq('in_stock', true);
      if (activeCategoryIds.size > 0) {
        query = query.in('category_id', Array.from(activeCategoryIds));
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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
    const activeCatNames = new Set(
      allCategories?.filter(c => activeCategoryIds.has(c.id)).map(c => c.name.toLowerCase()) || []
    );
    const staticProducts = printerProducts
      .filter(p => activeCategoryIds.size === 0 || activeCatNames.has(p.category.toLowerCase()))
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

    allProducts = allProducts.filter(p => {
      const plans = (p.rental_plans || []).filter((rp: any) => rp.is_active !== false);
      if (plans.length === 0) return true;
      const lowest = Math.min(...plans.map((rp: any) => rp.monthly_rent));
      return lowest >= priceRange[0] && lowest <= priceRange[1];
    });

    return allProducts;
  }, [dbProducts, activeCategoryIds, allCategories, priceRange]);

  const getLowestRent = (rentalPlans: any[]) => {
    if (!rentalPlans || rentalPlans.length === 0) return null;
    const activePlans = rentalPlans.filter(p => p.is_active !== false);
    if (activePlans.length === 0) return null;
    return Math.min(...activePlans.map(p => p.monthly_rent));
  };

  const isProductAvailableInLocation = (productId: string) => {
    if (!selectedLocation?.id) return true;
    if (!locationProductIds) return true;
    return locationProductIds.has(productId);
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const activeFilterCount = (selectedCategories.size > 0 ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] < 50000 ? 1 : 0);

  const clearFilters = () => {
    setSelectedCategories(new Set());
    setPriceRange([0, 50000]);
    setExpandedCategories(new Set());
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

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
                {categoryFromSlug?.name || 'Products'} on Rent {selectedLocation ? `in ${selectedLocation.name}` : ''}
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
            {/* Show category filter only when no category is selected */}
            {selectedCategories.size === 0 && !categoryFromSlug && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full text-xs gap-1.5">
                    <SlidersHorizontal className="w-3 h-3" />
                    Category
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <p className="text-xs font-semibold mb-2 text-foreground">Select a Category</p>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {mainCategories.map((cat) => {
                      const subs = getSubcategories(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => toggleCategory(cat.id)}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-accent/50 transition-colors flex items-center justify-between"
                        >
                          {cat.name}
                          {subs.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">{subs.length} sub</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* When a category is selected, show its name as a badge + subcategory chips inline */}
            {(selectedCategories.size > 0 || categoryFromSlug) && (() => {
              const activeCatId = categoryFromSlug?.id || Array.from(selectedCategories)[0];
              const activeCat = mainCategories.find(c => c.id === activeCatId) || categoryFromSlug;
              const subs = activeCatId ? getSubcategories(activeCatId) : [];
              return (
                <>
                  <Badge variant="secondary" className="gap-1.5 text-xs rounded-full pr-1">
                    {activeCat?.name || 'Category'}
                    <button
                      onClick={() => {
                        setSelectedCategories(new Set());
                      }}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                  {subs.map(sub => {
                    const isActive = selectedCategories.has(sub.id);
                    return (
                      <button
                        key={sub.id}
                        onClick={() => toggleCategory(sub.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-foreground border-border hover:border-primary/50'
                        }`}
                      >
                        {sub.name}
                      </button>
                    );
                  })}
                </>
              );
            })()}

            {/* Price Filter - always visible */}
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
                <Slider min={0} max={50000} step={500} value={priceRange} onValueChange={(val) => setPriceRange(val as [number, number])} className="mb-3" />
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
