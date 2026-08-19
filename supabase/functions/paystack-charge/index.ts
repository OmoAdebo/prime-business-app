import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, getOwnedBusiness, getUserId, paystack } from "../_shared/paystack.ts";

/**
 * Initializes a Paystack transaction that settles into the business's
 * subaccount. Used for invoice payment links and storefront checkout.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const h = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const userId = await getUserId(req);
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: h });

    const business = await getOwnedBusiness(userId);
    if (!business) return new Response(JSON.stringify({ error: "No business found" }), { status: 403, headers: h });

    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    const email = String(body.email ?? "").trim();
    const invoiceId: string | null = body.invoice_id ?? null;
    const orderId: string | null = body.order_id ?? null;

    if (!(amount > 0)) return new Response(JSON.stringify({ error: "Amount must be greater than zero" }), { status: 400, headers: h });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "A valid customer email is required" }), { status: 400, headers: h });
    }

    const admin = adminClient();
    const { data: account } = await admin
      .from("payment_accounts")
      .select("subaccount_code, status")
      .eq("business_id", business.id)
      .eq("provider", "paystack")
      .maybeSingle();

    if (!account?.subaccount_code || account.status !== "active") {
      return new Response(JSON.stringify({ error: "Connect your payout account in Banking → Payments first" }), { status: 400, headers: h });
    }

    const reference = `pay_${business.id.slice(0, 8)}_${Date.now()}`;
    const init = await paystack("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100),
        reference,
        subaccount: account.subaccount_code,
        bearer: "subaccount",
        callback_url: body.callback_url ?? undefined,
        metadata: { business_id: business.id, invoice_id: invoiceId, order_id: orderId },
      }),
    });

    if (!init.ok) {
      return new Response(JSON.stringify({ error: init.json?.message ?? "Could not start payment" }), { status: 502, headers: h });
    }

    await admin.from("payment_transactions").insert({
      business_id: business.id,
      reference,
      amount,
      currency: "NGN",
      status: "pending",
      customer_email: email,
      customer_name: body.customer_name ?? null,
      invoice_id: invoiceId,
      order_id: orderId,
      authorization_url: init.json.data?.authorization_url ?? null,
    });

    return new Response(JSON.stringify({
      ok: true,
      reference,
      authorization_url: init.json.data?.authorization_url,
    }), { headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: h });
  }
});
