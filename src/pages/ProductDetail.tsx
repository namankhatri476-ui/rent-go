import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Shield, Truck, RotateCcw, Check, ShoppingCart, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RentalPlanSelector from "@/components/RentalPlanSelector";
import { getProductBySlug } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const product = getProductBySlug(slug || "");
  const { addToCart } = useCart();

  const [selectedPlan, setSelectedPlan] = useState(product?.rentalPlans[1]); // Default to 6 months
  const [selectedImage, setSelectedImage] = useState(0);

  if (!product) {
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

  const handleAddToCart = () => {
    if (selectedPlan) {
      addToCart(product, selectedPlan);
      toast.success("Added to cart!", {
        description: `${product.name} with ${selectedPlan.label} plan`,
      });
    }
  };

  const handleRentNow = () => {
    if (selectedPlan) {
      addToCart(product, selectedPlan);
      navigate("/checkout");
    }
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
            <Link to="/products" className="hover:text-foreground transition-colors">Printers</Link>
            <span>/</span>
            <span className="text-foreground">{product.name}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-muted">
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-3">
                {product.images.map((img, index) => (
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
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Tags */}
              <div className="flex gap-2">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="accent">{tag}</Badge>
                ))}
              </div>

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
                        i < Math.floor(product.rating)
                          ? "fill-accent text-accent"
                          : "text-muted"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{product.rating}</span>
                <span className="text-sm text-muted-foreground">
                  ({product.reviewCount} reviews)
                </span>
              </div>

              {/* Price Display */}
              {selectedPlan && (
                <div className="p-4 bg-secondary rounded-xl">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      ₹{selectedPlan.monthlyRent}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    + ₹{selectedPlan.securityDeposit.toLocaleString()} refundable deposit
                  </p>
                </div>
              )}

              {/* Rental Plan Selector */}
              {selectedPlan && (
                <RentalPlanSelector
                  plans={product.rentalPlans}
                  selectedPlan={selectedPlan}
                  onSelect={setSelectedPlan}
                />
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="hero" 
                  size="xl" 
                  className="flex-1 gap-2"
                  onClick={handleRentNow}
                >
                  Rent Now
                </Button>
                <Button 
                  variant="outline" 
                  size="xl" 
                  className="flex-1 gap-2"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </Button>
              </div>

              {/* Trust Points */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Truck className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm text-foreground">Free Delivery</p>
                    <p className="text-xs text-muted-foreground">₹{product.deliveryFee} installation</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Shield className="w-5 h-5 text-success" />
                  <div>
                    <p className="font-medium text-sm text-foreground">Protection Plan</p>
                    <p className="text-xs text-muted-foreground">Optional ₹99/mo</p>
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
                  <Check className="w-5 h-5 text-success" />
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
            {/* Description */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">About This Product</h2>
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              
              <h3 className="font-semibold text-foreground mt-6">Key Features</h3>
              <ul className="space-y-2">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Specifications */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">Specifications</h2>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {Object.entries(product.specifications).map(([key, value], index) => (
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
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
