import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, getOwnedBusiness, getUserId, paystack } from "../_shared/paystack.ts";

/**
 * Creates or updates the Paystack subaccount for the caller's business,
 * and mirrors it into public.payment_accounts.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const h = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const userId = await getUserId(req);
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: h });

    const business = await getOwnedBusiness(userId);
    if (!business) {
      return new Response(JSON.stringify({ error: "Only a business owner can connect payouts" }), { status: 403, headers: h });
    }

    const body = await req.json().catch(() => ({}));
    const bankCode = String(body.bank_code ?? "").trim();
    const accountNumber = String(body.account_number ?? "").trim();
    const displayName = String(body.business_name ?? business.company_name ?? "").trim();
    const percentageCharge = Number(body.percentage_charge ?? 1);

    if (!/^\d{10}$/.test(accountNumber) || !bankCode || !displayName) {
      return new Response(JSON.stringify({ error: "Bank, 10-digit account number and business name are required" }), { status: 400, headers: h });
    }
    if (!(percentageCharge >= 0 && percentageCharge <= 100)) {
      return new Response(JSON.stringify({ error: "Invalid percentage charge" }), { status: 400, headers: h });
    }

    const admin = adminClient();

    // Confirm the account resolves before creating anything on Paystack.
    const resolved = await paystack(
      `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    );
    if (!resolved.ok) {
      return new Response(JSON.stringify({ error: resolved.json?.message ?? "Account could not be verified" }), { status: 400, headers: h });
    }
    const accountName = resolved.json.data?.account_name ?? null;

    const { data: existing } = await admin
      .from("payment_accounts")
      .select("*")
      .eq("business_id", business.id)
      .eq("provider", "paystack")
      .maybeSingle();

    const payload = {
      business_name: displayName,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: percentageCharge,
      primary_contact_name: displayName,
    };

    const result = existing?.subaccount_code
      ? await paystack(`/subaccount/${existing.subaccount_code}`, { method: "PUT", body: JSON.stringify(payload) })
      : await paystack("/subaccount", { method: "POST", body: JSON.stringify(payload) });

    if (!result.ok) {
      const message = result.json?.message ?? "Paystack rejected the subaccount";
      await admin.from("payment_accounts").upsert({
        business_id: business.id,
        provider: "paystack",
        status: "pending",
        last_error: message,
        settlement_bank_code: bankCode,
        settlement_account_number: accountNumber,
        settlement_account_name: accountName,
        business_display_name: displayName,
        percentage_charge: percentageCharge,
      }, { onConflict: "business_id,provider" });
      return new Response(JSON.stringify({ error: message }), { status: 400, headers: h });
    }

    const sub = result.json.data ?? {};
    const { data: saved, error } = await admin.from("payment_accounts").upsert({
      business_id: business.id,
      provider: "paystack",
      subaccount_code: sub.subaccount_code,
      subaccount_id: sub.id ? String(sub.id) : null,
      business_display_name: displayName,
      settlement_bank_code: bankCode,
      settlement_bank_name: sub.settlement_bank ?? null,
      settlement_account_number: accountNumber,
      settlement_account_name: accountName,
      percentage_charge: percentageCharge,
      settlement_schedule: sub.settlement_schedule ?? "auto",
      status: sub.active === false ? "disabled" : "active",
      is_live: !(Deno.env.get("PAYSTACK_SECRET_KEY") ?? "").startsWith("sk_test"),
      last_error: null,
    }, { onConflict: "business_id,provider" }).select().maybeSingle();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: h });

    return new Response(JSON.stringify({ ok: true, account: saved }), { headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: h });
  }
});
