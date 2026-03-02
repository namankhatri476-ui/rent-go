import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Star, Shield, Truck, RotateCcw, Check, ShoppingCart, Loader2, Clock, CreditCard, Package, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { useLocation } from "@/contexts/LocationContext";

interface RentalPlan {
  id: string;
  label: string;
  duration_months: number;
  monthly_rent: number;
  security_deposit: number;
  delivery_fee: number;
  installation_fee: number;
}

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { requireLocation } = useLocation();

  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [mode, setMode] = useState<'rent' | 'buy'>('rent');
  const [payAdvance, setPayAdvance] = useState(false);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product-detail', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`*, categories (name), rental_plans (*)`)
        .eq('slug', slug)
        .eq('status', 'approved')
        .single();
      if (error) throw error;
      return data;
    },
  });

  const rentalPlans = (product?.rental_plans || [])
    .filter((p: any) => p.is_active !== false)
    .sort((a: RentalPlan, b: RentalPlan) => a.duration_months - b.duration_months);
  
  const maxDuration = rentalPlans.length > 0 
    ? Math.max(...rentalPlans.map((p: RentalPlan) => p.duration_months)) 
    : 12;
  
  const currentDuration = selectedDuration ?? Math.min(6, maxDuration);

  const buyPrice = (product as any)?.buy_price || null;
  const advanceDiscountPercent = (product as any)?.advance_discount_percent || 0;
  const hasBuyOption = buyPrice && buyPrice > 0;
  
  const getDiscountedPrice = (duration: number) => {
    if (rentalPlans.length === 0) return { monthlyRent: 0, securityDeposit: 0, deliveryFee: 0, installationFee: 0 };
    const basePlan = rentalPlans[0];
    const baseRent = basePlan.monthly_rent;
    const securityDeposit = basePlan.security_deposit;
    const deliveryFee = basePlan.delivery_fee || 0;
    const installationFee = basePlan.installation_fee || 0;
    if (rentalPlans.length === 1 || duration <= 1) return { monthlyRent: baseRent, securityDeposit, deliveryFee, installationFee };
    const lastPlan = rentalPlans[rentalPlans.length - 1];
    const discountPerMonth = baseRent > 0 && lastPlan.duration_months > 1
      ? ((baseRent - lastPlan.monthly_rent) / baseRent * 100) / (lastPlan.duration_months - 1) : 0;
    const totalDiscount = Math.min(discountPerMonth * (duration - 1), 80);
    const monthlyRent = Math.round(baseRent * (1 - totalDiscount / 100));
    return { monthlyRent, securityDeposit, deliveryFee, installationFee };
  };

  const interpolatedPrice = useMemo(() => getDiscountedPrice(currentDuration), [currentDuration, rentalPlans]);

  const totalRentWithoutDiscount = interpolatedPrice.monthlyRent * currentDuration;
  const advanceDiscount = payAdvance ? Math.round(totalRentWithoutDiscount * advanceDiscountPercent / 100) : 0;
  const totalAdvancePayment = totalRentWithoutDiscount - advanceDiscount;
  
  const selectedPlan = rentalPlans.length > 0 
    ? rentalPlans.reduce((best: RentalPlan, plan: RentalPlan) => {
        if (plan.duration_months <= currentDuration && plan.duration_months > best.duration_months) return plan;
        return best;
      }, rentalPlans[0])
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Product Not Found</h1>
            <Link to="/products"><Button>Back to Products</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = (options?: { mode?: 'rent' | 'buy'; buyPrice?: number; payAdvance?: boolean; advanceDiscountPercent?: number }) => {
    if (!requireLocation()) { toast.info("Please select your city first"); return; }
    if (options?.mode === 'buy' && options.buyPrice) {
      const cartPlan = { id: 'buy-' + product.id, duration: 0, label: 'Buy', monthlyRent: 0, securityDeposit: 0 };
      const cartProduct = {
        id: product.id, name: product.name, brand: product.brand || '', category: product.categories?.name || '',
        slug: product.slug, description: product.description || '', features: product.features || [],
        specifications: (product.specifications as Record<string, string>) || {}, images: product.images || [],
        rentalPlans: [], deliveryFee: 0, installationFee: 0, rating: product.rating || 0,
        reviewCount: product.review_count || 0, inStock: product.in_stock, tags: product.tags || [],
      };
      addToCart(cartProduct, cartPlan, { mode: 'buy', buyPrice: options.buyPrice });
      return;
    }
    if (selectedPlan) {
      const cartPlan = {
        id: selectedPlan.id, duration: currentDuration,
        label: `${currentDuration} ${currentDuration === 1 ? 'Month' : 'Months'}`,
        monthlyRent: interpolatedPrice.monthlyRent, securityDeposit: interpolatedPrice.securityDeposit,
      };
      const cartProduct = {
        id: product.id, name: product.name, brand: product.brand || '', category: product.categories?.name || '',
        slug: product.slug, description: product.description || '', features: product.features || [],
        specifications: (product.specifications as Record<string, string>) || {}, images: product.images || [],
        rentalPlans: rentalPlans.map((p: RentalPlan) => ({ id: p.id, duration: p.duration_months, label: p.label, monthlyRent: p.monthly_rent, securityDeposit: p.security_deposit })),
        deliveryFee: interpolatedPrice.deliveryFee, installationFee: interpolatedPrice.installationFee,
        rating: product.rating || 0, reviewCount: product.review_count || 0, inStock: product.in_stock, tags: product.tags || [],
      };
      addToCart(cartProduct, cartPlan, { mode: 'rent', payAdvance, advanceDiscountPercent: payAdvance ? advanceDiscountPercent : 0 });
      toast.success("Added to cart!", { description: `${product.name} with ${currentDuration} month plan${payAdvance ? ' (advance payment)' : ''}` });
    }
  };

  const handleRentNow = () => { handleAddToCart(); navigate("/checkout"); };
  const handleBuyNow = () => {
    if (!requireLocation()) { toast.info("Please select your city first"); return; }
    handleAddToCart({ mode: 'buy', buyPrice });
    toast.success("Proceeding to buy!", { description: `${product.name} — ₹${buyPrice.toLocaleString()}` });
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-6">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <span className="text-border">/</span>
            <Link to="/products" className="hover:text-foreground transition-colors">Products</Link>
            <span className="text-border">/</span>
            <span className="text-foreground font-medium">{product.name}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* LEFT - Sticky Image Gallery */}
            <div className="lg:self-start lg:sticky lg:top-[100px]">
              <div className="space-y-3">
                <div className="aspect-square rounded-2xl overflow-hidden bg-muted border border-border/60">
                  {product.images?.[selectedImage] ? (
                    <img src={product.images[selectedImage]} alt={product.name} className="w-full h-full object-contain p-4" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
                  )}
                </div>
                {product.images?.length > 1 && (
                  <div className="flex gap-2">
                    {product.images.map((img: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                          selectedImage === index ? "border-primary shadow-sm" : "border-border/60 hover:border-border"
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT - Product Info (scrollable) */}
            <div className="space-y-5">
              {/* Tags */}
              {product.tags?.length > 0 && (
                <div className="flex gap-2">
                  {product.tags.map((tag: string) => (
                    <Badge key={tag} className="bg-accent/10 text-accent border-0 text-[10px] font-semibold">{tag}</Badge>
                  ))}
                </div>
              )}

              {/* Title & Brand */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{product.brand}</p>
                <h1 className="text-xl md:text-2xl font-bold text-foreground mt-1 leading-tight">{product.name}</h1>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating || 0) ? "fill-accent text-accent" : "text-muted"}`} />
                  ))}
                </div>
                <span className="text-sm font-medium">{product.rating || 0}</span>
                <span className="text-xs text-muted-foreground">({product.review_count || 0} reviews)</span>
              </div>

              {/* Buy / Rent Toggle */}
              {hasBuyOption && (
                <div className="flex rounded-xl overflow-hidden border border-border/60 bg-muted/50">
                  <button
                    onClick={() => setMode('rent')}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      mode === 'rent' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" /> Rent
                  </button>
                  <button
                    onClick={() => setMode('buy')}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      mode === 'buy' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Buy
                  </button>
                </div>
              )}

              {/* ===== BUY MODE ===== */}
              {mode === 'buy' && hasBuyOption && (
                <div className="space-y-4">
                  <div className="p-5 bg-muted/50 rounded-2xl border border-border/60">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-foreground">₹{buyPrice.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">one-time</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Full ownership · No monthly payments</p>
                  </div>

                  <Button size="lg" className="w-full gap-2 rounded-xl h-12 text-base" onClick={handleBuyNow}>
                    <CreditCard className="w-5 h-5" /> Buy Now — ₹{buyPrice.toLocaleString()}
                  </Button>

                  <div className="space-y-2.5">
                    {[
                      { icon: Truck, title: "Delivery in 1-2 days", sub: "Free delivery & installation", color: "text-primary" },
                      { icon: Shield, title: "1 Year Warranty", sub: "Manufacturer warranty included", color: "text-success" },
                      { icon: Package, title: "Brand New Product", sub: "Sealed pack with all accessories", color: "text-primary" },
                    ].map(item => (
                      <div key={item.title} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                        <item.icon className={`w-4 h-4 ${item.color} shrink-0`} />
                        <div>
                          <p className="font-medium text-xs text-foreground">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== RENT MODE ===== */}
              {mode === 'rent' && selectedPlan && (
                <>
                  {/* Price */}
                  <div className="p-5 bg-muted/50 rounded-2xl border border-border/60">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-foreground">₹{interpolatedPrice.monthlyRent.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      + ₹{interpolatedPrice.securityDeposit.toLocaleString()} refundable deposit · {currentDuration} {currentDuration === 1 ? 'month' : 'months'}
                    </p>
                    {rentalPlans.length > 1 && currentDuration > rentalPlans[0].duration_months && (
                      <p className="text-[10px] text-primary mt-1 font-semibold">💰 Longer tenure = lower monthly rent</p>
                    )}
                  </div>

                  {/* Duration Slider */}
                  {rentalPlans.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Rental Duration</span>
                        <span className="text-sm font-bold text-primary">{currentDuration} {currentDuration === 1 ? 'Month' : 'Months'}</span>
                      </div>
                      <div className="p-4 bg-muted/40 rounded-xl space-y-3">
                        <Slider
                          value={[currentDuration]}
                          onValueChange={(val) => setSelectedDuration(val[0])}
                          min={1} max={maxDuration} step={1} className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>1 Month</span>
                          <span>{maxDuration} Months</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Advance Payment */}
                  {currentDuration > 1 && advanceDiscountPercent > 0 && (
                    <div className="p-4 bg-accent/5 border border-accent/15 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-accent" />
                          <span className="font-medium text-xs text-foreground">Pay all {currentDuration} months upfront</span>
                        </div>
                        <Switch checked={payAdvance} onCheckedChange={setPayAdvance} />
                      </div>
                      {payAdvance ? (
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Total ({currentDuration} × ₹{interpolatedPrice.monthlyRent.toLocaleString()})</span>
                            <span>₹{totalRentWithoutDiscount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-success font-medium">
                            <span>Discount ({advanceDiscountPercent}%)</span>
                            <span>- ₹{advanceDiscount.toLocaleString()}</span>
                          </div>
                          <div className="border-t border-border pt-1.5 flex justify-between font-bold text-foreground">
                            <span>Pay Now</span>
                            <span>₹{totalAdvancePayment.toLocaleString()}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-accent font-semibold">
                          Save {advanceDiscountPercent}% — pay ₹{(totalRentWithoutDiscount - Math.round(totalRentWithoutDiscount * advanceDiscountPercent / 100)).toLocaleString()} instead of ₹{totalRentWithoutDiscount.toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <Button size="lg" className="flex-1 gap-2 rounded-xl h-12 text-base" onClick={handleRentNow} disabled={!selectedPlan}>
                      Rent Now
                    </Button>
                    <Button variant="outline" size="lg" className="flex-1 gap-2 rounded-xl h-12" onClick={() => handleAddToCart()} disabled={!selectedPlan}>
                      <ShoppingCart className="w-4 h-4" /> Add to Cart
                    </Button>
                  </div>

                  {/* Plan Details */}
                  <div className="space-y-2.5">
                    {[
                      { icon: Truck, title: "Delivery in 1-2 days", sub: `Delivery: ₹${interpolatedPrice.deliveryFee.toLocaleString()}${interpolatedPrice.installationFee > 0 ? ` · Install: ₹${interpolatedPrice.installationFee.toLocaleString()}` : ''}`, color: "text-primary" },
                      { icon: Shield, title: "Protection Plan Available", sub: "Optional ₹99/mo damage cover", color: "text-success" },
                      { icon: CreditCard, title: `Deposit: ₹${interpolatedPrice.securityDeposit.toLocaleString()} (refundable)`, sub: `Monthly: ₹${interpolatedPrice.monthlyRent.toLocaleString()}/mo + 18% GST`, color: "text-primary" },
                      { icon: RotateCcw, title: "Easy Returns", sub: "Cancel anytime with full deposit refund", color: "text-primary" },
                    ].map(item => (
                      <div key={item.title} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                        <item.icon className={`w-4 h-4 ${item.color} shrink-0`} />
                        <div>
                          <p className="font-medium text-xs text-foreground">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Trust Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: Truck, title: "Free Delivery", sub: "1-2 business days", color: "text-primary" },
                  { icon: Shield, title: "Warranty", sub: "Full product coverage", color: "text-success" },
                  { icon: RotateCcw, title: "Easy Returns", sub: "Hassle-free process", color: "text-primary" },
                  { icon: Check, title: "100% Refundable", sub: "Security deposit", color: "text-success" },
                ].map(item => (
                  <div key={item.title} className="flex items-center gap-2.5 p-3 bg-muted/40 rounded-xl">
                    <item.icon className={`w-4 h-4 ${item.color} shrink-0`} />
                    <div>
                      <p className="font-medium text-xs text-foreground">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Description & Features */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h2 className="text-lg font-bold text-foreground">About This Product</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
                
                {product.features?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-2">Key Features</h3>
                    <ul className="space-y-1.5">
                      {product.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Specifications */}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-foreground">Specifications</h2>
                  <div className="rounded-xl border border-border/60 overflow-hidden">
                    {Object.entries(product.specifications as Record<string, string>).map(([key, value], index) => (
                      <div key={key} className={`flex justify-between p-3 text-xs ${index % 2 === 0 ? "bg-muted/30" : "bg-card"}`}>
                        <span className="text-muted-foreground">{key}</span>
                        <span className="font-medium text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
