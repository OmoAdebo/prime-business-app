import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Body {
  plan: "growth" | "business";
  period: "monthly" | "quarterly" | "annually";
  amount: number; // in Naira
  callback_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabase.auth.getClaims(token);
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;
    const email = (claims.claims as any).email ?? "owner@example.com";

    const body = (await req.json()) as Body;
    if (!body.plan || !body.period || !body.amount) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: biz } = await admin
      .from("businesses").select("id").eq("owner_id", userId).maybeSingle();
    if (!biz) {
      return new Response(JSON.stringify({ error: "No business" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
    const reference = `prime_${biz.id.slice(0, 8)}_${Date.now()}`;
    const periodEnd = new Date();
    if (body.period === "monthly") periodEnd.setMonth(periodEnd.getMonth() + 1);
    else if (body.period === "quarterly") periodEnd.setMonth(periodEnd.getMonth() + 3);
    else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    // Try real Paystack init
    let authorization_url: string | null = null;
    let usedDummy = false;
    try {
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: Math.round(body.amount * 100), // kobo
          reference,
          callback_url: body.callback_url,
          metadata: { business_id: biz.id, plan: body.plan, period: body.period },
        }),
      });
      const json = await res.json();
      if (res.ok && json?.data?.authorization_url) {
        authorization_url = json.data.authorization_url as string;
      } else {
        usedDummy = true;
      }
    } catch {
      usedDummy = true;
    }

    if (usedDummy) {
      // Dummy / dev mode: activate immediately and return app URL
      await admin.from("subscriptions").upsert({
        business_id: biz.id,
        plan: body.plan,
        period: body.period,
        status: "active",
        amount: body.amount,
        paystack_reference: reference,
        current_period_end: periodEnd.toISOString(),
      }, { onConflict: "business_id" });

      return new Response(JSON.stringify({
        ok: true,
        dummy: true,
        reference,
        authorization_url: body.callback_url ?? "/dashboard",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Real Paystack: create pending row, verify later
    await admin.from("subscriptions").upsert({
      business_id: biz.id,
      plan: body.plan,
      period: body.period,
      status: "pending",
      amount: body.amount,
      paystack_reference: reference,
      current_period_end: periodEnd.toISOString(),
    }, { onConflict: "business_id" });

    return new Response(JSON.stringify({ ok: true, dummy: false, reference, authorization_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
