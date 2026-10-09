import { adminClient } from "../_shared/paystack.ts";

/**
 * Paystack webhook. Public endpoint (verify_jwt = false) — authenticity is
 * proven by the HMAC-SHA512 signature computed with the Paystack secret key.
 */

async function verifySignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
  if (!secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  const valid = await verifySignature(raw, req.headers.get("x-paystack-signature"));
  if (!valid) return new Response("Invalid signature", { status: 401 });

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  const admin = adminClient();
  const data = event?.data ?? {};

  try {
    switch (event?.event) {
      case "charge.success": {
        const reference = data.reference as string;
        const amount = Number(data.amount ?? 0) / 100;
        const fees = Number(data.fees ?? 0) / 100;
        const businessId = data.metadata?.business_id ?? null;
        const invoiceId = data.metadata?.invoice_id ?? null;
        const orderId = data.metadata?.order_id ?? null;

        const { data: existing } = await admin
          .from("payment_transactions")
          .select("id, business_id, status, invoice_id, order_id")
          .eq("reference", reference)
          .maybeSingle();

        if (existing?.status === "success") break; // idempotent

        const bizId = existing?.business_id ?? businessId;
        if (!bizId) break;

        await admin.from("payment_transactions").upsert({
          business_id: bizId,
          provider: "paystack",
          reference,
          amount,
          fees,
          subaccount_share: data.subaccount ? Number(data.amount ?? 0) / 100 - fees : null,
          currency: data.currency ?? "NGN",
          status: "success",
          channel: data.channel ?? null,
          customer_email: data.customer?.email ?? null,
          customer_name: [data.customer?.first_name, data.customer?.last_name].filter(Boolean).join(" ") || null,
          invoice_id: existing?.invoice_id ?? invoiceId,
          order_id: existing?.order_id ?? orderId,
          paid_at: data.paid_at ?? new Date().toISOString(),
          raw: data,
        }, { onConflict: "reference" });

        // Mirror into the banking module against the Paystack settlement account.
        let { data: bankAccount } = await admin
          .from("bank_accounts")
          .select("id, current_balance")
          .eq("business_id", bizId)
          .eq("source", "paystack")
          .maybeSingle();

        if (!bankAccount) {
          const { data: created } = await admin.from("bank_accounts").insert({
            business_id: bizId,
            account_name: "Paystack Settlements",
            bank_name: "Paystack",
            account_type: "settlement",
            currency: data.currency ?? "NGN",
            current_balance: 0,
            is_active: true,
            source: "paystack",
          }).select("id, current_balance").maybeSingle();
          bankAccount = created ?? null;
        }

        if (bankAccount) {
          const net = amount - fees;
          const { error: txErr } = await admin.from("bank_transactions").insert({
            bank_account_id: bankAccount.id,
            business_id: bizId,
            type: "credit",
            amount: net,
            description: `Paystack payment${data.customer?.email ? ` from ${data.customer.email}` : ""}`,
            reference,
            provider_reference: reference,
            source: "paystack",
            transaction_date: (data.paid_at ?? new Date().toISOString()).slice(0, 10),
            is_reconciled: true,
            category: "Sales",
          });
          if (!txErr) {
            await admin.from("bank_accounts")
              .update({ current_balance: Number(bankAccount.current_balance ?? 0) + net })
              .eq("id", bankAccount.id);
          }
        }

        // Settle the linked invoice.
        const linkedInvoice = existing?.invoice_id ?? invoiceId;
        if (linkedInvoice) {
          const { data: inv } = await admin
            .from("invoices")
            .select("id, amount_paid, total_amount")
            .eq("id", linkedInvoice)
            .maybeSingle();
          if (inv) {
            const paid = Number(inv.amount_paid ?? 0) + amount;
            await admin.from("invoices").update({
              amount_paid: paid,
              status: paid >= Number(inv.total_amount ?? 0) ? "paid" : "partial",
            }).eq("id", inv.id);
            await admin.from("invoice_payments").insert({
              invoice_id: inv.id,
              amount,
              payment_date: (data.paid_at ?? new Date().toISOString()).slice(0, 10),
              payment_method: "paystack",
              reference,
            });
          }
        }

        // Record the income in bookkeeping so dashboard revenue updates (once per reference).
        {
          const { data: already } = await admin
            .from("transactions").select("id").eq("business_id", bizId).eq("reference_number", reference).limit(1);
          if (!already || already.length === 0) {
            await admin.from("transactions").insert({
              business_id: bizId,
              type: "income",
              category: "Sales",
              description: `Paystack payment${data.customer?.email ? ` from ${data.customer.email}` : ""}`,
              amount,
              currency: data.currency ?? "NGN",
              transaction_date: (data.paid_at ?? new Date().toISOString()).slice(0, 10),
              reference_number: reference,
              payment_method: "paystack",
            });
          }
        }

        // Settle the linked storefront order.
        const linkedOrder = existing?.order_id ?? orderId;
        if (linkedOrder) {
          const { data: ord } = await admin
            .from("orders")
            .select("id, amount_paid, total_amount")
            .eq("id", linkedOrder)
            .maybeSingle();
          if (ord) {
            const paid = Number(ord.amount_paid ?? 0) + amount;
            await admin.from("orders").update({
              amount_paid: paid,
              payment_status: paid >= Number(ord.total_amount ?? 0) ? "paid" : "partial",
              payment_method: "paystack",
              payment_reference: reference,
            }).eq("id", ord.id);
          }
        }

        // Notify the business owner.
        const { data: biz } = await admin
          .from("businesses")
          .select("owner_id")
          .eq("id", bizId)
          .maybeSingle();
        if (biz?.owner_id) {
          await admin.rpc("create_notification", {
            _user_id: biz.owner_id,
            _title: "Payment received",
            _message: `₦${amount.toLocaleString()} received via Paystack`,
            _type: "success",
            _business_id: bizId,
            _action_url: "/banking/transactions",
            _metadata: { reference },
          });
        }
        break;
      }

      case "charge.failed": {
        await admin.from("payment_transactions")
          .update({ status: "failed", raw: data })
          .eq("reference", data.reference);
        break;
      }

      case "subaccount.create":
      case "subaccount.update": {
        if (data.subaccount_code) {
          await admin.from("payment_accounts")
            .update({ status: data.active === false ? "disabled" : "active" })
            .eq("subaccount_code", data.subaccount_code);
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("paystack-webhook error", (e as Error).message);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
