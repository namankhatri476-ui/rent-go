/**
 * Razorpay Payment Gateway - Frontend Integration
 * 
 * Uses Razorpay Checkout.js for in-page payment experience.
 */

import { supabase } from "@/integrations/supabase/client";

export interface RazorpayOrderRequest {
  amount: number; // in rupees
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  success: boolean;
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  error?: string;
}

export interface RazorpayPaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface ConfirmOrderRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  orderData: Record<string, unknown>;
}

export interface ConfirmOrderResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

/**
 * Create Razorpay order via backend
 */
export async function createRazorpayOrder(
  request: RazorpayOrderRequest
): Promise<RazorpayOrderResponse> {
  console.log("[Razorpay] Creating order:", request);

  try {
    const { data, error } = await supabase.functions.invoke("razorpay-payment", {
      body: request,
    });

    if (error) {
      console.error("[Razorpay] Edge function error:", error);
      return { success: false, error: error.message || "Order creation failed" };
    }

    return {
      success: data.success,
      orderId: data.orderId,
      amount: data.amount,
      currency: data.currency,
      keyId: data.keyId,
      error: data.error,
    };
  } catch (err: any) {
    console.error("[Razorpay] Network error:", err);
    return { success: false, error: err.message || "Network error" };
  }
}

/**
 * Load Razorpay Checkout script dynamically
 */
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(script);
  });
}

/**
 * Open Razorpay Checkout and return payment result
 */
export async function openRazorpayCheckout(options: {
  orderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description?: string;
}): Promise<RazorpayPaymentResult> {
  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key: options.keyId,
      amount: options.amount,
      currency: options.currency,
      name: "RentPR",
      description: options.description || "Rental Payment",
      order_id: options.orderId,
      prefill: {
        name: options.customerName,
        email: options.customerEmail,
        contact: options.customerPhone,
      },
      theme: {
        color: "#6366f1",
      },
      handler: function (response: RazorpayPaymentResult) {
        console.log("[Razorpay] Payment success:", response);
        resolve(response);
      },
      modal: {
        ondismiss: function () {
          reject(new Error("Payment cancelled by user"));
        },
      },
    });

    rzp.on("payment.failed", function (response: any) {
      console.error("[Razorpay] Payment failed:", response.error);
      reject(new Error(response.error?.description || "Payment failed"));
    });

    rzp.open();
  });
}

/**
 * Confirm order after payment (server-side verification + order creation)
 */
export async function confirmOrderAfterPayment(
  request: ConfirmOrderRequest
): Promise<ConfirmOrderResponse> {
  console.log("[Razorpay] Confirming order:", request.razorpay_payment_id);

  try {
    const { data, error } = await supabase.functions.invoke("razorpay-payment/confirm-order", {
      body: request,
    });

    if (error) {
      console.error("[Razorpay] Confirm order error:", error);
      return { success: false, error: error.message || "Order confirmation failed" };
    }

    return {
      success: data.success,
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      error: data.error,
    };
  } catch (err: any) {
    console.error("[Razorpay] Confirm order network error:", err);
    return { success: false, error: err.message || "Network error" };
  }
}
