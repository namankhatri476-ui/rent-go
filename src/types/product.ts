// Product types for rental e-commerce
export interface RentalPlan {
  id: string;
  duration: number; // months
  label: string;
  monthlyRent: number;
  securityDeposit: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  slug: string;
  description: string;
  features: string[];
  specifications: Record<string, string>;
  images: string[];
  rentalPlans: RentalPlan[];
  deliveryFee: number;
  installationFee: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  tags: string[];
}

export interface CartItem {
  product: Product;
  selectedPlan: RentalPlan;
  quantity: number;
  addProtectionPlan: boolean;
}

export interface CheckoutBreakdown {
  securityDeposit: number;
  deliveryFee: number;
  installationFee: number;
  payableNow: number;
  monthlyRent: number;
  gst: number;
  protectionPlan: number;
  monthlyTotal: number;
}

export const PROTECTION_PLAN_MONTHLY = 99; // ₹99/month for damage waiver
export const GST_RATE = 0.18; // 18% GST
