import { supabase } from "@/integrations/supabase/client";
import { CartItem, CheckoutBreakdown, GST_RATE } from "@/types/product";
import { initiateCashfreePayment, verifyCashfreePayment, confirmOrderAfterPayment } from "@/services/cashfreeService";

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
  pendingPayment?: boolean;
}

/**
 * Save or update user address in the database
 */
export async function saveAddress(
  userId: string,
  formData: CheckoutFormData
): Promise<{ addressId: string | null; error: string | null }> {
  try {
    const { data: existingAddress } = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .maybeSingle();

    if (existingAddress) {
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
 * Ensure product exists in database
 */
async function ensureProductExists(
  userId: string,
  item: CartItem
): Promise<{ productId: string; vendorId: string; rentalPlanId: string } | null> {
  const productSlug = item.product.slug;
  
  let { data: existingProduct } = await supabase
    .from("products")
    .select("id, vendor_id")
    .eq("slug", productSlug)
    .maybeSingle();

  let vendorId: string;
  let productId: string;

  if (existingProduct) {
    productId = existingProduct.id;
    vendorId = existingProduct.vendor_id;
  } else {
    let { data: vendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!vendor) {
      const { data: anyVendor } = await supabase
        .from("vendors")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (anyVendor) {
        vendorId = anyVendor.id;
      } else {
        const { data: newVendor, error: vendorError } = await supabase
          .from("vendors")
          .insert({
            user_id: userId,
            business_name: "Demo Rentals",
            business_email: "demo@rentals.com",
            status: "approved",
          })
          .select("id")
          .single();

        if (vendorError) {
          console.error("Error creating vendor:", vendorError);
          return null;
        }
        vendorId = newVendor.id;
      }
    } else {
      vendorId = vendor.id;
    }

    const { data: newProduct, error: productError } = await supabase
      .from("products")
      .insert({
        vendor_id: vendorId,
        name: item.product.name,
        slug: productSlug,
        brand: item.product.brand,
        description: item.product.description,
        features: item.product.features,
        images: item.product.images,
        specifications: item.product.specifications,
        tags: item.product.tags,
        rating: item.product.rating,
        review_count: item.product.reviewCount,
        in_stock: item.product.inStock,
        stock_quantity: 10,
        status: "approved",
      })
      .select("id")
      .single();

    if (productError) {
      console.error("Error creating product:", productError);
      return null;
    }
    productId = newProduct.id;
  }

  let { data: existingPlan } = await supabase
    .from("rental_plans")
    .select("id")
    .eq("product_id", productId)
    .eq("duration_months", item.selectedPlan.duration)
    .maybeSingle();

  let rentalPlanId: string;

  if (existingPlan) {
    rentalPlanId = existingPlan.id;
  } else {
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
        is_active: true,
      })
      .select("id")
      .single();

    if (planError) {
      console.error("Error creating rental plan:", planError);
      return null;
    }
    rentalPlanId = newPlan.id;
  }

  return { productId, vendorId, rentalPlanId };
}

/**
 * NEW FLOW: Payment first, then order creation
 * 
 * 1. Initiate Cashfree payment (get payment session)
 * 2. Redirect user to Cashfree payment page
 * 3. On return, verify payment and THEN create order
 */
export async function initiatePaymentFirst(
  userId: string,
  items: CartItem[],
  breakdown: CheckoutBreakdown,
  formData: CheckoutFormData,
  termsVersion?: number
): Promise<OrderResult> {
  try {
    // Save address first
    const { addressId, error: addressError } = await saveAddress(userId, formData);
    if (addressError || !addressId) {
      return { success: false, orderNumbers: [], error: addressError || "Failed to save address" };
    }

    // Prepare order data for each item (but DON'T create orders yet)
    const pendingOrders: Array<{
      item: CartItem;
      orderData: Record<string, unknown>;
      payableNow: number;
    }> = [];

    for (const item of items) {
      const monthlyRent = item.selectedPlan.monthlyRent;
      const gst = Math.round(monthlyRent * GST_RATE);
      const protectionFee = item.addProtectionPlan ? 99 : 0;
      const monthlyTotal = monthlyRent + gst + protectionFee;
      const commissionRate = 0.30;
      const platformCommission = Math.round(monthlyRent * commissionRate);
      const vendorPayout = monthlyRent - platformCommission;

      const productData = await ensureProductExists(userId, item);
      if (!productData) {
        throw new Error(`Failed to process product: ${item.product.name}. Please try again.`);
      }

      const { productId, vendorId, rentalPlanId } = productData;
      const payableNow = item.selectedPlan.securityDeposit + item.product.deliveryFee + item.product.installationFee;
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      pendingOrders.push({
        item,
        payableNow,
        orderData: {
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
          payable_now_total: payableNow,
          monthly_rent: monthlyRent,
          monthly_gst: gst,
          protection_plan_fee: protectionFee,
          monthly_total: monthlyTotal,
          rental_duration_months: item.selectedPlan.duration,
          platform_commission: platformCommission,
          vendor_payout: vendorPayout,
          status: "confirmed",
          terms_accepted_at: termsVersion ? new Date().toISOString() : null,
          terms_version: termsVersion || null,
        },
      });
    }

    // Calculate total payable amount
    const totalPayable = pendingOrders.reduce((sum, po) => sum + po.payableNow, 0);
    const tempOrderId = `TEMP_${Date.now()}`;

    // Initiate Cashfree payment
    const returnUrl = `${window.location.origin}/order-success`;
    const cashfreeResult = await initiateCashfreePayment({
      orderId: tempOrderId,
      amount: totalPayable,
      customerName: formData.fullName,
      customerPhone: formData.phone,
      customerEmail: formData.email,
      redirectUrl: returnUrl,
    });

    if (!cashfreeResult.success) {
      return {
        success: false,
        orderNumbers: [],
        error: cashfreeResult.error || "Failed to initiate payment. Please try again.",
      };
    }

    // Store pending order data in sessionStorage for post-payment verification
    sessionStorage.setItem("pendingCheckout", JSON.stringify({
      transactionId: cashfreeResult.transactionId,
      pendingOrders: pendingOrders.map(po => po.orderData),
      paymentSessionId: cashfreeResult.paymentSessionId,
      cfOrderId: cashfreeResult.cfOrderId,
    }));

    // If Cashfree provides a redirect URL, redirect user to payment page
    if (cashfreeResult.redirectUrl) {
      window.location.href = cashfreeResult.redirectUrl;
      return { success: true, orderNumbers: [], pendingPayment: true };
    }

    // If no redirect URL but we have a payment session ID, 
    // the frontend should use Cashfree JS SDK to open the checkout
    // For now, return the session info so frontend can handle it
    return {
      success: true,
      orderNumbers: [],
      pendingPayment: true,
      error: cashfreeResult.paymentSessionId
        ? `PAYMENT_SESSION:${cashfreeResult.paymentSessionId}`
        : "No payment URL received from gateway",
    };
  } catch (error: any) {
    console.error("Error initiating payment:", error);
    return { success: false, orderNumbers: [], error: error.message };
  }
}

/**
 * Verify payment and create orders (called after user returns from payment page)
 */
export async function verifyAndCreateOrders(): Promise<OrderResult> {
  try {
    const pendingData = sessionStorage.getItem("pendingCheckout");
    if (!pendingData) {
      return { success: false, orderNumbers: [], error: "No pending checkout found" };
    }

    const { transactionId, pendingOrders } = JSON.parse(pendingData);

    // Verify payment with Cashfree
    const verification = await verifyCashfreePayment(transactionId);
    
    if (!verification.verified) {
      sessionStorage.removeItem("pendingCheckout");
      return {
        success: false,
        orderNumbers: [],
        error: `Payment not completed. Status: ${verification.status}`,
      };
    }

    // Payment verified! Create orders via the secure edge function
    const orderNumbers: string[] = [];

    for (const orderData of pendingOrders) {
      const result = await confirmOrderAfterPayment({
        transactionId,
        orderData,
      });

      if (result.success && result.orderNumber) {
        orderNumbers.push(result.orderNumber);
      } else {
        console.error("Failed to confirm order:", result.error);
      }
    }

    // Clean up
    sessionStorage.removeItem("pendingCheckout");

    if (orderNumbers.length === 0) {
      return { success: false, orderNumbers: [], error: "Failed to create orders after payment" };
    }

    return { success: true, orderNumbers };
  } catch (error: any) {
    console.error("Error verifying and creating orders:", error);
    return { success: false, orderNumbers: [], error: error.message };
  }
}

/**
 * Complete checkout process (payment-first flow)
 */
export async function processCheckout(
  userId: string,
  items: CartItem[],
  breakdown: CheckoutBreakdown,
  formData: CheckoutFormData,
  termsVersion?: number
): Promise<OrderResult> {
  return initiatePaymentFirst(userId, items, breakdown, formData, termsVersion);
}
