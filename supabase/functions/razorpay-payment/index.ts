import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error("[Razorpay] CRITICAL: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set!");
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getAuthHeader(): string {
  return "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
}

function requiresAuthForPath(path: string) {
  return !["webhook", "create-order", "razorpay-payment", "verify-payment"].includes(path);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return jsonResponse({
        error: "Razorpay credentials are not configured in edge function secrets",
      }, 500);
    }

    // Auth check for non-webhook endpoints
    let userId: string | null = null;
    if (path && requiresAuthForPath(path)) {
      const requestAuthHeader = req.headers.get("Authorization");
      if (!requestAuthHeader?.startsWith("Bearer ")) {
        return jsonResponse({ error: "Unauthorized: missing bearer token" }, 401);
      }

      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return jsonResponse({ error: "Supabase auth secrets are not configured" }, 500);
      }

      const token = requestAuthHeader.replace("Bearer ", "").trim();
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: requestAuthHeader } },
      });

      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      const claimUserId = claimsData?.claims?.sub;

      if (claimsError || !claimUserId) {
        return jsonResponse({ error: "Unauthorized: invalid or expired token" }, 401);
      }

      userId = claimUserId;
    }

    const body = await req.json();

    // ===== CREATE RAZORPAY ORDER =====
    if (path === "create-order" || path === "razorpay-payment") {
      const { amount, currency, receipt, notes } = body;

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return jsonResponse({ error: "amount must be a positive number" }, 400);
      }

      const orderPayload = {
        amount: Math.round(numericAmount * 100), // Razorpay expects amount in paise
        currency: currency || "INR",
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: notes || {},
      };

      console.log("[Razorpay] Creating order:", JSON.stringify(orderPayload));

      const rzpRes = await fetch(`${RAZORPAY_API_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify(orderPayload),
      });

      const rzpData = await rzpRes.json();
      console.log("[Razorpay] Order response:", JSON.stringify(rzpData));

      if (rzpData.id) {
        return jsonResponse({
          success: true,
          orderId: rzpData.id,
          amount: rzpData.amount,
          currency: rzpData.currency,
          keyId: RAZORPAY_KEY_ID, // Send public key to frontend
        });
      }

      return jsonResponse({
        success: false,
        error: rzpData.error?.description || "Razorpay order creation failed",
        details: rzpData,
      }, 400);
    }

    // ===== VERIFY PAYMENT SIGNATURE =====
    if (path === "verify-payment") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return jsonResponse({ error: "All payment fields are required" }, 400);
      }

      // Verify signature using HMAC SHA256
      const message = `${razorpay_order_id}|${razorpay_payment_id}`;
      const encoder = new TextEncoder();
      const keyData = encoder.encode(RAZORPAY_KEY_SECRET);
      const msgData = encoder.encode(message);

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
      const expectedSignature = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const isValid = expectedSignature === razorpay_signature;

      console.log("[Razorpay] Signature verification:", { isValid, razorpay_payment_id });

      if (!isValid) {
        return jsonResponse({
          success: false,
          error: "Payment signature verification failed",
        }, 400);
      }

      return jsonResponse({
        success: true,
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      });
    }

    // ===== CONFIRM ORDER (after payment verified) =====
    if (path === "confirm-order") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderData) {
        return jsonResponse({ error: "All fields are required" }, 400);
      }

      // Step 1: Verify signature
      const message = `${razorpay_order_id}|${razorpay_payment_id}`;
      const encoder = new TextEncoder();
      const keyData = encoder.encode(RAZORPAY_KEY_SECRET);
      const msgData = encoder.encode(message);

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
      const expectedSignature = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (expectedSignature !== razorpay_signature) {
        return jsonResponse({
          success: false,
          error: "Payment verification failed. Signature mismatch.",
        }, 400);
      }

      // Step 2: Double-check payment status with Razorpay API
      const paymentRes = await fetch(`${RAZORPAY_API_BASE}/payments/${razorpay_payment_id}`, {
        headers: { Authorization: getAuthHeader() },
      });
      const paymentData = await paymentRes.json();

      if (paymentData.status !== "captured" && paymentData.status !== "authorized") {
        return jsonResponse({
          success: false,
          error: `Payment not completed. Status: ${paymentData.status}`,
        }, 400);
      }

      // Step 3: Create order using service role
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      if (userId && orderData.customer_id && orderData.customer_id !== userId) {
        return jsonResponse({ success: false, error: "Unauthorized customer_id mismatch" }, 403);
      }

      const safeOrderData = {
        ...orderData,
        customer_id: userId ?? orderData.customer_id,
      };

      const { data: order, error: orderError } = await adminClient
        .from("orders")
        .insert(safeOrderData)
        .select("id, order_number")
        .single();

      if (orderError) {
        console.error("[Razorpay] Order creation error:", orderError);
        return jsonResponse({ success: false, error: orderError.message }, 500);
      }

      // Step 4: Create payment record
      await adminClient.from("payments").insert({
        order_id: order.id,
        amount: safeOrderData.payable_now_total,
        payment_method: "razorpay",
        status: "completed",
        payment_gateway: "razorpay",
        transaction_id: razorpay_payment_id,
        payment_date: new Date().toISOString(),
        metadata: {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        },
      });

      return jsonResponse({
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
      });
    }

    // ===== WEBHOOK =====
    if (path === "webhook") {
      const event = body.event;
      const payload = body.payload;

      console.log("[Razorpay Webhook]", { event });

      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      if (event === "payment.captured" && payload?.payment?.entity) {
        const payment = payload.payment.entity;
        const rzpPaymentId = payment.id;

        const { data: existingPayment } = await adminClient
          .from("payments")
          .select("id, order_id")
          .eq("transaction_id", rzpPaymentId)
          .maybeSingle();

        if (existingPayment) {
          await adminClient
            .from("payments")
            .update({ status: "completed", payment_date: new Date().toISOString() })
            .eq("id", existingPayment.id);

          await adminClient
            .from("orders")
            .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
            .eq("id", existingPayment.order_id);
        }
      }

      if (event === "payment.failed" && payload?.payment?.entity) {
        const payment = payload.payment.entity;
        const rzpPaymentId = payment.id;

        const { data: existingPayment } = await adminClient
          .from("payments")
          .select("id")
          .eq("transaction_id", rzpPaymentId)
          .maybeSingle();

        if (existingPayment) {
          await adminClient
            .from("payments")
            .update({ status: "failed" })
            .eq("id", existingPayment.id);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return jsonResponse({ error: "Unknown endpoint" }, 404);
  } catch (error) {
    console.error("[Razorpay Error]", error);
    return jsonResponse({ error: error.message || "Internal server error" }, 500);
  }
});
