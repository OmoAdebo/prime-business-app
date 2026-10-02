import { supabase } from "@/integrations/supabase/client";

export type EventSeverity = "info" | "warning" | "error";

export interface FailureEvent {
  category: "auth" | "data" | "function" | "payment" | "client";
  action: string;
  message: string;
  code?: string | null;
  severity?: EventSeverity;
  email?: string | null;
  details?: Record<string, unknown>;
}

const recent = new Map<string, number>();

/**
 * Best-effort failure logging into `system_events`. Never throws, never blocks
 * the UI, and de-duplicates identical events fired within 10 seconds.
 */
export async function logFailure(ev: FailureEvent) {
  try {
    const key = `${ev.category}|${ev.action}|${ev.message}`;
    const now = Date.now();
    if ((recent.get(key) ?? 0) > now - 10_000) return;
    recent.set(key, now);

    const { data } = await supabase.auth.getSession();
    await (supabase as any).from("system_events").insert({
      category: ev.category,
      action: ev.action.slice(0, 120),
      message: (ev.message || "").slice(0, 1000),
      code: ev.code ?? null,
      severity: ev.severity ?? "error",
      user_id: data.session?.user?.id ?? null,
      email: ev.email ? ev.email.toLowerCase().slice(0, 254) : data.session?.user?.email ?? null,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
      details: ev.details ?? {},
    });
  } catch {
    // Monitoring must never break the app.
  }
}
