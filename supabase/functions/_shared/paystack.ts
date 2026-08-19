import { createClient } from "npm:@supabase/supabase-js@2";

export const PAYSTACK_BASE = "https://api.paystack.co";

export function paystackKey(): string {
  return Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
}

export async function paystack(path: string, init?: RequestInit) {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${paystackKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json?.status !== false, status: res.status, json };
}

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Validates the bearer token and returns the caller's user id, or null. */
export async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return data.claims.sub as string;
}

/** Returns the business owned by the given user, or null. */
export async function getOwnedBusiness(userId: string) {
  const admin = adminClient();
  const { data } = await admin
    .from("businesses")
    .select("id, company_name")
    .eq("owner_id", userId)
    .maybeSingle();
  return data;
}

export function json(body: unknown, status = 200, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}
