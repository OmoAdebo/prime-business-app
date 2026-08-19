import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getUserId, paystack } from "../_shared/paystack.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const h = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const userId = await getUserId(req);
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: h });

    const body = await req.json().catch(() => ({}));
    const accountNumber = String(body.account_number ?? "").trim();
    const bankCode = String(body.bank_code ?? "").trim();

    if (!/^\d{10}$/.test(accountNumber)) {
      return new Response(JSON.stringify({ error: "Account number must be 10 digits" }), { status: 400, headers: h });
    }
    if (!bankCode) {
      return new Response(JSON.stringify({ error: "Select a bank" }), { status: 400, headers: h });
    }

    const { ok, json } = await paystack(
      `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    );
    if (!ok) {
      return new Response(
        JSON.stringify({ error: json?.message ?? "Could not verify this account" }),
        { status: 400, headers: h },
      );
    }

    return new Response(
      JSON.stringify({ account_name: json.data?.account_name, account_number: json.data?.account_number }),
      { headers: h },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: h });
  }
});
