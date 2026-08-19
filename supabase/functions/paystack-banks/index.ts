import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getUserId, paystack } from "../_shared/paystack.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const h = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const userId = await getUserId(req);
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: h });

    const { ok, json } = await paystack("/bank?country=nigeria&perPage=100");
    if (!ok) {
      return new Response(JSON.stringify({ error: json?.message ?? "Could not load banks" }), { status: 502, headers: h });
    }
    const banks = (json.data ?? [])
      .map((b: any) => ({ name: b.name, code: b.code, slug: b.slug }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return new Response(JSON.stringify({ banks }), { headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: h });
  }
});
