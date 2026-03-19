/**
 * Cashfree Payment Gateway - Integration
 * 
 * Calls the backend edge function for secure payment processing.
 * Supports one-time payments and autopay subscription setup.
 */

import { supabase } from "@/integrations/supabase/client";

export interface CashfreePaymentRequest {
  orderId: string;
  amount: number; // in rupees
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  redirectUrl: string;
}

export interface CashfreePaymentResponse {
  success: boolean;
  transactionId?: string;
  paymentSessionId?: string;
  cfOrderId?: string;
  redirectUrl?: string;
  error?: string;
}

export interface AutopaySetupRequest {
  orderId: string;
  subscriptionName?: string;
  monthlyAmount: number; // in rupees
  customerPhone: string;
  maxCycles?: number;
  startDate?: string;
  redirectUrl: string;
}

export interface AutopaySetupResponse {
  success: boolean;
  subscriptionId?: string;
  redirectUrl?: string;
  error?: string;
}

/**
 * Initiate a one-time Cashfree payment (security deposit + delivery + installation)
 */
export async function initiateCashfreePayment(
  request: CashfreePaymentRequest
): Promise<CashfreePaymentResponse> {
  console.log("[Cashfree] Initiating payment:", request);

  try {
    const { data, error } = await supabase.functions.invoke("cashfree-payment", {
      body: { ...request },
    });

    if (error) {
      console.error("[Cashfree] Edge function error:", error);
      return { success: false, error: error.message || "Payment initiation failed" };
    }

    return {
      success: data.success,
      transactionId: data.transactionId,
      paymentSessionId: data.paymentSessionId,
      cfOrderId: data.cfOrderId,
      redirectUrl: data.redirectUrl,
      error: data.error,
    };
  } catch (err: any) {
    console.error("[Cashfree] Network error:", err);
    return { success: false, error: err.message || "Network error" };
  }
}

/**
 * Setup autopay subscription for monthly rent payments
 */
export async function setupAutopaySubscription(
  request: AutopaySetupRequest
): Promise<AutopaySetupResponse> {
  console.log("[Cashfree] Setting up autopay:", request);

  try {
    const { data, error } = await supabase.functions.invoke("cashfree-payment/setup-autopay", {
      body: { ...request },
    });

    if (error) {
      console.error("[Cashfree] Autopay setup error:", error);
      return { success: false, error: error.message || "Autopay setup failed" };
    }

    return {
      success: data.success,
      subscriptionId: data.subscriptionId,
      redirectUrl: data.redirectUrl,
      error: data.error,
    };
  } catch (err: any) {
    console.error("[Cashfree] Autopay network error:", err);
    return { success: false, error: err.message || "Network error" };
  }
}

/**
 * Verify Cashfree payment status
 */
export async function verifyCashfreePayment(
  transactionId: string
): Promise<{ verified: boolean; status: string }> {
  console.log("[Cashfree] Verifying payment:", transactionId);

  try {
    const { data, error } = await supabase.functions.invoke("cashfree-payment/status", {
      body: { transactionId },
    });

    if (error) {
      console.error("[Cashfree] Verification error:", error);
      return { verified: false, status: "ERROR" };
    }

    return {
      verified: data.verified,
      status: data.status,
    };
  } catch (err: any) {
    console.error("[Cashfree] Verify network error:", err);
    return { verified: false, status: "ERROR" };
  }
}
