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

  // Fetch product from Supabase
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product-detail', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (name),
          rental_plans (*)
        `)
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
  
  // Calculate price using base price + discount % per additional month
  const getDiscountedPrice = (duration: number): { monthlyRent: number; securityDeposit: number; deliveryFee: number; installationFee: number } => {
    if (rentalPlans.length === 0) return { monthlyRent: 0, securityDeposit: 0, deliveryFee: 0, installationFee: 0 };
    
    const basePlan = rentalPlans[0];
    const baseRent = basePlan.monthly_rent;
    const securityDeposit = basePlan.security_deposit;
    const deliveryFee = basePlan.delivery_fee || 0;
    const installationFee = basePlan.installation_fee || 0;
    
    if (rentalPlans.length === 1 || duration <= 1) {
      return { monthlyRent: baseRent, securityDeposit, deliveryFee, installationFee };
    }
    
    const lastPlan = rentalPlans[rentalPlans.length - 1];
    const discountPerMonth = baseRent > 0 && lastPlan.duration_months > 1
      ? ((baseRent - lastPlan.monthly_rent) / baseRent * 100) / (lastPlan.duration_months - 1)
      : 0;
    
    const totalDiscount = Math.min(discountPerMonth * (duration - 1), 80);
    const monthlyRent = Math.round(baseRent * (1 - totalDiscount / 100));
    
    return { monthlyRent, securityDeposit, deliveryFee, installationFee };
  };

  const interpolatedPrice = useMemo(() => getDiscountedPrice(currentDuration), [currentDuration, rentalPlans]);

  // Advance payment calculations
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
            <Link to="/products">
              <Button>Back to Products</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = (options?: { mode?: 'rent' | 'buy'; buyPrice?: number; payAdvance?: boolean; advanceDiscountPercent?: number }) => {
    if (!requireLocation()) {
      toast.info("Please select your city first");
      return;
    }
    if (options?.mode === 'buy' && options.buyPrice) {
      const cartPlan = {
        id: 'buy-' + product.id,
        duration: 0,
        label: 'Buy',
        monthlyRent: 0,
        securityDeposit: 0,
      };
      const cartProduct = {
        id: product.id,
        name: product.name,
        brand: product.brand || '',
        category: product.categories?.name || '',
        slug: product.slug,
        description: product.description || '',
        features: product.features || [],
        specifications: (product.specifications as Record<string, string>) || {},
        images: product.images || [],
        rentalPlans: [],
        deliveryFee: 0,
        installationFee: 0,
        rating: product.rating || 0,
        reviewCount: product.review_count || 0,
        inStock: product.in_stock,
        tags: product.tags || [],
      };
      addToCart(cartProduct, cartPlan, { mode: 'buy', buyPrice: options.buyPrice });
      return;
    }
    if (selectedPlan) {
      const cartPlan = {
        id: selectedPlan.id,
        duration: currentDuration,
        label: `${currentDuration} ${currentDuration === 1 ? 'Month' : 'Months'}`,
        monthlyRent: interpolatedPrice.monthlyRent,
        securityDeposit: interpolatedPrice.securityDeposit,
      };
      
      const cartProduct = {
        id: product.id,
        name: product.name,
        brand: product.brand || '',
        category: product.categories?.name || '',
        slug: product.slug,
        description: product.description || '',
        features: product.features || [],
        specifications: (product.specifications as Record<string, string>) || {},
        images: product.images || [],
        rentalPlans: rentalPlans.map((p: RentalPlan) => ({
          id: p.id,
          duration: p.duration_months,
          label: p.label,
          monthlyRent: p.monthly_rent,
          securityDeposit: p.security_deposit,
        })),
        deliveryFee: interpolatedPrice.deliveryFee,
        installationFee: interpolatedPrice.installationFee,
        rating: product.rating || 0,
        reviewCount: product.review_count || 0,
        inStock: product.in_stock,
        tags: product.tags || [],
      };

      addToCart(cartProduct, cartPlan, {
        mode: 'rent',
        payAdvance,
        advanceDiscountPercent: payAdvance ? advanceDiscountPercent : 0,
      });
      toast.success("Added to cart!", {
        description: `${product.name} with ${currentDuration} month plan${payAdvance ? ' (advance payment)' : ''}`,
      });
    }
  };

  const handleRentNow = () => {
    handleAddToCart();
    navigate("/checkout");
  };

  const handleBuyNow = () => {
    if (!requireLocation()) {
      toast.info("Please select your city first");
      return;
    }
    handleAddToCart({ mode: 'buy', buyPrice });
    toast.success("Proceeding to buy!", {
      description: `${product.name} — ₹${buyPrice.toLocaleString()}`,
    });
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <Link to="/products" className="hover:text-foreground transition-colors">Products</Link>
            <span>/</span>
            <span className="text-foreground">{product.name}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-muted">
                {product.images?.[selectedImage] ? (
                  <img
                    src={product.images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No Image
                  </div>
                )}
              </div>
              {product.images?.length > 1 && (
                <div className="flex gap-3">
                  {product.images.map((img: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedImage === index ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Tags */}
              {product.tags?.length > 0 && (
                <div className="flex gap-2">
                  {product.tags.map((tag: string) => (
                    <Badge key={tag} variant="accent">{tag}</Badge>
                  ))}
                </div>
              )}

              {/* Title & Brand */}
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {product.brand}
                </p>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1">
                  {product.name}
                </h1>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating || 0)
                          ? "fill-accent text-accent"
                          : "text-muted"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{product.rating || 0}</span>
                <span className="text-sm text-muted-foreground">
                  ({product.review_count || 0} reviews)
                </span>
              </div>

              {/* Buy / Rent Toggle */}
              {hasBuyOption && (
                <div className="flex rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setMode('rent')}
                    className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                      mode === 'rent' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Rent
                  </button>
                  <button
                    onClick={() => setMode('buy')}
                    className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                      mode === 'buy' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Buy
                  </button>
                </div>
              )}

              {/* ===== BUY MODE ===== */}
              {mode === 'buy' && hasBuyOption && (
                <div className="space-y-5">
                  <div className="p-5 bg-secondary rounded-xl">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">
                        ₹{buyPrice.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">one-time</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Full ownership · No monthly payments
                    </p>
                  </div>

                  {/* Buy Action */}
                  <Button 
                    variant="hero" 
                    size="xl" 
                    className="w-full gap-2"
                    onClick={handleBuyNow}
                  >
                    <CreditCard className="w-5 h-5" />
                    Buy Now — ₹{buyPrice.toLocaleString()}
                  </Button>

                  {/* Buy details */}
                  <div className="space-y-3 p-4 bg-muted rounded-xl">
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm text-foreground">Delivery in 1-2 days</p>
                        <p className="text-xs text-muted-foreground">Free delivery & installation</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-sm text-foreground">1 Year Warranty</p>
                        <p className="text-xs text-muted-foreground">Manufacturer warranty included</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm text-foreground">Brand New Product</p>
                        <p className="text-xs text-muted-foreground">Sealed pack with all accessories</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== RENT MODE ===== */}
              {mode === 'rent' && selectedPlan && (
                <>
                  {/* Price Display */}
                  <div className="p-4 bg-secondary rounded-xl">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">
                        ₹{interpolatedPrice.monthlyRent.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      + ₹{interpolatedPrice.securityDeposit.toLocaleString()} refundable deposit
                      {" · "}{currentDuration} {currentDuration === 1 ? 'month' : 'months'} tenure
                    </p>
                    {rentalPlans.length > 1 && currentDuration > rentalPlans[0].duration_months && (
                      <p className="text-xs text-primary mt-1 font-medium">
                        💰 Longer tenure = lower monthly rent
                      </p>
                    )}
                  </div>

                  {/* Rental Duration Slider */}
                  {rentalPlans.length > 0 && (
                    <div className="space-y-4">
                      <p className="font-medium text-foreground">Select Rental Duration</p>
                      <div className="p-5 bg-muted rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            <span className="text-sm text-muted-foreground">Duration</span>
                          </div>
                          <span className="text-lg font-bold text-foreground">
                            {currentDuration} {currentDuration === 1 ? 'Month' : 'Months'}
                          </span>
                        </div>
                        <Slider
                          value={[currentDuration]}
                          onValueChange={(val) => setSelectedDuration(val[0])}
                          min={1}
                          max={maxDuration}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1 Month</span>
                          <span>{maxDuration} Months</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Advance Payment Option */}
                  {currentDuration > 1 && advanceDiscountPercent > 0 && (
                    <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-accent" />
                          <span className="font-medium text-sm text-foreground">
                            Pay all {currentDuration} months upfront
                          </span>
                        </div>
                        <Switch checked={payAdvance} onCheckedChange={setPayAdvance} />
                      </div>
                      {payAdvance && (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Total Rent ({currentDuration} × ₹{interpolatedPrice.monthlyRent.toLocaleString()})</span>
                            <span>₹{totalRentWithoutDiscount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-green-600 font-medium">
                            <span>Advance Discount ({advanceDiscountPercent}%)</span>
                            <span>- ₹{advanceDiscount.toLocaleString()}</span>
                          </div>
                          <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                            <span>Pay Now</span>
                            <span>₹{totalAdvancePayment.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                      {!payAdvance && (
                        <p className="text-xs text-accent font-medium">
                          Save {advanceDiscountPercent}% — pay ₹{(totalRentWithoutDiscount - Math.round(totalRentWithoutDiscount * advanceDiscountPercent / 100)).toLocaleString()} instead of ₹{totalRentWithoutDiscount.toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="hero" 
                      size="xl" 
                      className="flex-1 gap-2"
                      onClick={handleRentNow}
                      disabled={!selectedPlan}
                    >
                      Rent Now
                    </Button>
                    <Button 
                      variant="outline" 
                      size="xl" 
                      className="flex-1 gap-2"
                      onClick={() => handleAddToCart()}
                      disabled={!selectedPlan}
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </Button>
                  </div>

                  {/* Rental Plan Details */}
                  <div className="space-y-3 p-4 bg-muted rounded-xl">
                    <p className="font-medium text-sm text-foreground mb-2">Rental Plan Details</p>
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm text-foreground">Delivery in 1-2 days</p>
                        <p className="text-xs text-muted-foreground">
                          Delivery fee: ₹{interpolatedPrice.deliveryFee.toLocaleString()}
                          {interpolatedPrice.installationFee > 0 && ` · Installation: ₹${interpolatedPrice.installationFee.toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-sm text-foreground">Protection Plan Available</p>
                        <p className="text-xs text-muted-foreground">Optional ₹99/mo damage cover</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          Advance: ₹{interpolatedPrice.securityDeposit.toLocaleString()} (refundable)
                        </p>
                        <p className="text-xs text-muted-foreground">Monthly: ₹{interpolatedPrice.monthlyRent.toLocaleString()}/mo + 18% GST</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <RotateCcw className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm text-foreground">Easy Returns</p>
                        <p className="text-xs text-muted-foreground">Cancel anytime with full deposit refund</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Trust Points (shown in both modes) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Truck className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm text-foreground">Free Delivery</p>
                    <p className="text-xs text-muted-foreground">1-2 business days</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Shield className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-sm text-foreground">Warranty</p>
                    <p className="text-xs text-muted-foreground">Full product coverage</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <RotateCcw className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm text-foreground">Easy Returns</p>
                    <p className="text-xs text-muted-foreground">Hassle-free process</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-sm text-foreground">100% Refundable</p>
                    <p className="text-xs text-muted-foreground">Security deposit</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Specs */}
          <div className="mt-12 grid lg:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">About This Product</h2>
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              
              {product.features?.length > 0 && (
                <>
                  <h3 className="font-semibold text-foreground mt-6">Key Features</h3>
                  <ul className="space-y-2">
                    {product.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">Specifications</h2>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  {Object.entries(product.specifications as Record<string, string>).map(([key, value], index) => (
                    <div
                      key={key}
                      className={`flex justify-between p-4 ${
                        index % 2 === 0 ? "bg-muted/50" : ""
                      }`}
                    >
                      <span className="text-sm text-muted-foreground">{key}</span>
                      <span className="text-sm font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;