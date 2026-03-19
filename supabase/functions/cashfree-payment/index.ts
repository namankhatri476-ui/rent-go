import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID") || "";
const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY") || "";

// Cashfree API URLs
const CASHFREE_PROD_URL = "https://api.cashfree.com/pg";
const CASHFREE_SANDBOX_URL = "https://sandbox.cashfree.com/pg";

// Switch to CASHFREE_PROD_URL when going live
const API_BASE = CASHFREE_SANDBOX_URL;
const API_VERSION = "2023-08-01";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // Auth check for non-webhook endpoints
    let userId: string | null = null;
    if (path !== "webhook") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = claimsData.claims.sub as string;
    }

    const body = await req.json();

    // ===== CREATE ORDER (Initiate Payment) =====
    if (path === "initiate" || path === "cashfree-payment") {
      const { orderId, amount, customerName, customerPhone, customerEmail, redirectUrl } = body;

      if (!orderId || !amount) {
        return new Response(
          JSON.stringify({ error: "orderId and amount are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const cfOrderId = `CF_${Date.now()}_${orderId.substring(0, 8)}`;

      const orderPayload = {
        order_id: cfOrderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: userId || "guest",
          customer_name: customerName || "Customer",
          customer_email: customerEmail || "customer@example.com",
          customer_phone: customerPhone || "9999999999",
        },
        order_meta: {
          return_url: redirectUrl ? `${redirectUrl}&cf_order_id=${cfOrderId}` : "",
          notify_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/cashfree-payment/webhook`,
        },
      };

      const cfRes = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-version": API_VERSION,
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY,
        },
        body: JSON.stringify(orderPayload),
      });

      const cfData = await cfRes.json();

      if (cfData.payment_session_id) {
        return new Response(
          JSON.stringify({
            success: true,
            transactionId: cfOrderId,
            paymentSessionId: cfData.payment_session_id,
            cfOrderId: cfData.cf_order_id,
            redirectUrl: cfData.payment_link || null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: cfData.message || "Cashfree order creation failed",
          details: cfData,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== SETUP SUBSCRIPTION (Autopay) =====
    if (path === "setup-autopay") {
      const {
        orderId,
        subscriptionName,
        monthlyAmount,
        customerPhone,
        maxCycles,
        redirectUrl,
      } = body;

      if (!orderId || !monthlyAmount) {
        return new Response(
          JSON.stringify({ error: "orderId and monthlyAmount are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const subscriptionId = `SUB_${Date.now()}_${orderId.substring(0, 8)}`;

      const subPayload = {
        subscription_id: subscriptionId,
        plan_id: subscriptionName || "monthly_rental",
        plan_name: subscriptionName || "Monthly Rental Payment",
        plan_type: "PERIODIC",
        plan_max_cycles: maxCycles || 12,
        plan_recurring_amount: monthlyAmount,
        plan_max_amount: monthlyAmount,
        plan_interval_type: "MONTH",
        plan_intervals: 1,
        customer_details: {
          customer_id: userId || "guest",
          customer_phone: customerPhone || "9999999999",
        },
        subscription_meta: {
          return_url: redirectUrl || "",
          notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/cashfree-payment/webhook`,
        },
      };

      const cfRes = await fetch(`${API_BASE}/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-version": API_VERSION,
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY,
        },
        body: JSON.stringify(subPayload),
      });

      const cfData = await cfRes.json();

      if (cfData.subscription_id || cfData.status === "INITIALIZED") {
        const adminClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        await adminClient
          .from("payments")
          .insert({
            order_id: orderId,
            amount: 0,
            payment_method: "autopay_setup",
            status: "pending",
            payment_gateway: "cashfree",
            transaction_id: subscriptionId,
            metadata: {
              type: "autopay_subscription",
              subscription_id: subscriptionId,
              monthly_amount: monthlyAmount,
              max_cycles: maxCycles || 12,
            },
          });

        return new Response(
          JSON.stringify({
            success: true,
            subscriptionId,
            redirectUrl: cfData.authorization_link || null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: cfData.message || "Subscription setup failed",
          details: cfData,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== CHECK PAYMENT STATUS =====
    if (path === "status") {
      const { transactionId } = body;

      if (!transactionId) {
        return new Response(
          JSON.stringify({ error: "transactionId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const cfRes = await fetch(`${API_BASE}/orders/${transactionId}`, {
        method: "GET",
        headers: {
          "x-api-version": API_VERSION,
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY,
        },
      });

      const cfData = await cfRes.json();

      return new Response(
        JSON.stringify({
          verified: cfData.order_status === "PAID",
          status: cfData.order_status || "UNKNOWN",
          data: cfData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== WEBHOOK CALLBACK =====
    if (path === "webhook") {
      // Cashfree sends webhook notifications as JSON
      const eventType = body.type || body.event;
      const orderData = body.data?.order || body.data;
      const paymentData = body.data?.payment || {};

      const transactionId = orderData?.order_id || paymentData?.cf_payment_id;
      const paymentStatus = orderData?.order_status || body.data?.payment_status;

      console.log("[Cashfree Webhook]", { eventType, transactionId, paymentStatus });

      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      if (transactionId) {
        const { data: payment } = await adminClient
          .from("payments")
          .select("id, order_id")
          .eq("transaction_id", transactionId)
          .maybeSingle();

        if (payment) {
          const newStatus =
            paymentStatus === "PAID" || paymentStatus === "SUCCESS"
              ? "completed"
              : "failed";

          await adminClient
            .from("payments")
            .update({ status: newStatus, payment_date: new Date().toISOString() })
            .eq("id", payment.id);

          if (newStatus === "completed") {
            await adminClient
              .from("orders")
              .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
              .eq("id", payment.order_id);
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Unknown endpoint" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Cashfree Error]", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
