import { supabase } from "@/integrations/supabase/client";
import { CartItem, CheckoutBreakdown, GST_RATE } from "@/types/product";

export interface CheckoutFormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  paymentMethod: string;
}

export interface OrderResult {
  success: boolean;
  orderNumbers: string[];
  error?: string;
}

/**
 * Save or update user address in the database
 */
export async function saveAddress(
  userId: string,
  formData: CheckoutFormData
): Promise<{ addressId: string | null; error: string | null }> {
  try {
    // Check if user has an existing default address
    const { data: existingAddress } = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .maybeSingle();

    if (existingAddress) {
      // Update existing address
      const { error } = await supabase
        .from("addresses")
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          address_line1: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        })
        .eq("id", existingAddress.id);

      if (error) throw error;
      return { addressId: existingAddress.id, error: null };
    } else {
      // Create new address
      const { data, error } = await supabase
        .from("addresses")
        .insert({
          user_id: userId,
          full_name: formData.fullName,
          phone: formData.phone,
          address_line1: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          is_default: true,
          label: "Home",
        })
        .select("id")
        .single();

      if (error) throw error;
      return { addressId: data.id, error: null };
    }
  } catch (error: any) {
    console.error("Error saving address:", error);
    return { addressId: null, error: error.message };
  }
}

/**
 * Create orders for all cart items
 * In rental model, each cart item becomes a separate order
 */
export async function createOrders(
  userId: string,
  addressId: string,
  items: CartItem[],
  breakdown: CheckoutBreakdown,
  paymentMethod: string
): Promise<OrderResult> {
  const orderNumbers: string[] = [];
  
  try {
    for (const item of items) {
      const monthlyRent = item.selectedPlan.monthlyRent;
      const gst = Math.round(monthlyRent * GST_RATE);
      const protectionFee = item.addProtectionPlan ? 99 : 0;
      const monthlyTotal = monthlyRent + gst + protectionFee;
      
      // Calculate platform commission (30% default)
      const commissionRate = 0.30;
      const platformCommission = Math.round(monthlyRent * commissionRate);
      const vendorPayout = monthlyRent - platformCommission;

      // For demo purposes, we'll use a placeholder vendor_id
      // In production, this would come from the product's vendor
      const { data: defaultVendor } = await supabase
        .from("vendors")
        .select("id")
        .limit(1)
        .maybeSingle();

      // For demo, we need to handle the case where we don't have database products
      // We'll create a mock product reference or use existing ones
      const { data: existingProduct } = await supabase
        .from("products")
        .select("id, vendor_id")
        .limit(1)
        .maybeSingle();

      // Get or create a rental plan reference
      let rentalPlanId: string;
      let vendorId: string;
      let productId: string;

      if (existingProduct) {
        productId = existingProduct.id;
        vendorId = existingProduct.vendor_id;
        
        // Get existing rental plan or create one
        const { data: existingPlan } = await supabase
          .from("rental_plans")
          .select("id")
          .eq("product_id", productId)
          .limit(1)
          .maybeSingle();
        
        if (existingPlan) {
          rentalPlanId = existingPlan.id;
        } else {
          // Create a rental plan for this product
          const { data: newPlan, error: planError } = await supabase
            .from("rental_plans")
            .insert({
              product_id: productId,
              duration_months: item.selectedPlan.duration,
              monthly_rent: item.selectedPlan.monthlyRent,
              security_deposit: item.selectedPlan.securityDeposit,
              label: item.selectedPlan.label,
              delivery_fee: item.product.deliveryFee,
              installation_fee: item.product.installationFee,
            })
            .select("id")
            .single();
          
          if (planError) throw planError;
          rentalPlanId = newPlan.id;
        }
      } else {
        // No products in database - this is a demo/development scenario
        // We need to skip order creation or inform the user
        throw new Error("No products available in database. Please add products through the vendor dashboard first.");
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Create the order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_id: userId,
          vendor_id: vendorId,
          product_id: productId,
          rental_plan_id: rentalPlanId,
          address_id: addressId,
          quantity: item.quantity,
          security_deposit: item.selectedPlan.securityDeposit,
          delivery_fee: item.product.deliveryFee,
          installation_fee: item.product.installationFee,
          payable_now_total: item.selectedPlan.securityDeposit + item.product.deliveryFee + item.product.installationFee,
          monthly_rent: monthlyRent,
          monthly_gst: gst,
          protection_plan_fee: protectionFee,
          monthly_total: monthlyTotal,
          rental_duration_months: item.selectedPlan.duration,
          platform_commission: platformCommission,
          vendor_payout: vendorPayout,
          status: "pending",
        })
        .select("id, order_number")
        .single();

      if (orderError) throw orderError;
      orderNumbers.push(order.order_number);

      // Create initial payment record
      const payableNow = item.selectedPlan.securityDeposit + 
                         item.product.deliveryFee + 
                         item.product.installationFee;

      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          order_id: order.id,
          amount: payableNow,
          payment_method: paymentMethod,
          status: "completed", // In production, this would be set by payment gateway webhook
          payment_date: new Date().toISOString(),
          payment_gateway: "demo", // Would be razorpay/stripe in production
        });

      if (paymentError) throw paymentError;
    }

    return { success: true, orderNumbers };
  } catch (error: any) {
    console.error("Error creating orders:", error);
    return { success: false, orderNumbers: [], error: error.message };
  }
}

/**
 * Complete checkout process
 */
export async function processCheckout(
  userId: string,
  items: CartItem[],
  breakdown: CheckoutBreakdown,
  formData: CheckoutFormData
): Promise<OrderResult> {
  // 1. Save address
  const { addressId, error: addressError } = await saveAddress(userId, formData);
  if (addressError || !addressId) {
    return { success: false, orderNumbers: [], error: addressError || "Failed to save address" };
  }

  // 2. Create orders
  const result = await createOrders(
    userId,
    addressId,
    items,
    breakdown,
    formData.paymentMethod
  );

  return result;
}
