import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { subDays, subMonths, format, differenceInDays } from "date-fns";

export interface Opportunity {
  id: string;
  title: string;
  detail: string;
  impact: number | null; // naira value where calculable
  severity: "high" | "medium" | "low";
  actionLabel: string;
  actionPath: string;
}

export function naira(n: number) {
  return `₦${Math.round(n || 0).toLocaleString("en-NG")}`;
}

function useInsightData() {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  return useQuery({
    queryKey: ["insight-data", businessId],
    enabled: !!businessId,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const since180 = format(subMonths(new Date(), 6), "yyyy-MM-dd");
      const [tx, invoices, products, stock, customers, banks, receivables, payables] =
        await Promise.all([
          supabase
            .from("transactions")
            .select("type, amount, transaction_date, category")
            .eq("business_id", businessId!)
            .gte("transaction_date", since180),
          supabase
            .from("invoices")
            .select("id, invoice_number, status, total_amount, amount_paid, due_date, issue_date, customer_id")
            .eq("business_id", businessId!),
          supabase
            .from("products")
            .select("id, name, unit_price, cost_price, low_stock_threshold, is_active")
            .eq("business_id", businessId!),
          supabase
            .from("stock_levels")
            .select("product_id, quantity"),
          supabase
            .from("customers")
            .select("id, name, created_at, outstanding_balance, is_active")
            .eq("business_id", businessId!),
          supabase
            .from("bank_accounts")
            .select("current_balance, is_active")
            .eq("business_id", businessId!),
          supabase
            .from("receivables")
            .select("amount, amount_paid, due_date, status")
            .eq("business_id", businessId!),
          supabase
            .from("payables")
            .select("amount, amount_paid, due_date, status")
            .eq("business_id", businessId!),
        ]);

      return {
        transactions: tx.data ?? [],
        invoices: invoices.data ?? [],
        products: products.data ?? [],
        stock: stock.data ?? [],
        customers: customers.data ?? [],
        banks: banks.data ?? [],
        receivables: receivables.data ?? [],
        payables: payables.data ?? [],
      };
    },
  });
}

export function useInsights() {
  const { data, isLoading, error } = useInsightData();

  return useMemo(() => {
    const d = data ?? {
      transactions: [] as any[], invoices: [] as any[], products: [] as any[],
      stock: [] as any[], customers: [] as any[], banks: [] as any[],
      receivables: [] as any[], payables: [] as any[],
    };

    const num = (v: any) => Number(v ?? 0);
    const now = new Date();
    const since90 = subDays(now, 90);
    const since30 = subDays(now, 30);
    const prev30Start = subDays(now, 60);

    const inRange = (t: any, from: Date, to = now) => {
      const dte = new Date(t.transaction_date);
      return dte >= from && dte <= to;
    };

    const income90 = d.transactions.filter((t) => t.type === "income" && inRange(t, since90)).reduce((s, t) => s + num(t.amount), 0);
    const expense90 = d.transactions.filter((t) => t.type === "expense" && inRange(t, since90)).reduce((s, t) => s + num(t.amount), 0);
    const income30 = d.transactions.filter((t) => t.type === "income" && inRange(t, since30)).reduce((s, t) => s + num(t.amount), 0);
    const expense30 = d.transactions.filter((t) => t.type === "expense" && inRange(t, since30)).reduce((s, t) => s + num(t.amount), 0);
    const incomePrev30 = d.transactions.filter((t) => t.type === "income" && inRange(t, prev30Start, since30)).reduce((s, t) => s + num(t.amount), 0);
    const expensePrev30 = d.transactions.filter((t) => t.type === "expense" && inRange(t, prev30Start, since30)).reduce((s, t) => s + num(t.amount), 0);

    // ---- Monthly trend (6 months) ----
    const monthly: { month: string; income: number; expense: number; profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      const key = format(m, "yyyy-MM");
      const label = format(m, "MMM");
      const rows = d.transactions.filter((t) => String(t.transaction_date).slice(0, 7) === key);
      const inc = rows.filter((t) => t.type === "income").reduce((s, t) => s + num(t.amount), 0);
      const exp = rows.filter((t) => t.type === "expense").reduce((s, t) => s + num(t.amount), 0);
      monthly.push({ month: label, income: inc, expense: exp, profit: inc - exp });
    }

    // ---- Cash / obligations ----
    const cash = d.banks.filter((b: any) => b.is_active !== false).reduce((s: number, b: any) => s + num(b.current_balance), 0);
    const owedToYou =
      d.receivables.reduce((s: number, r: any) => s + Math.max(num(r.amount) - num(r.amount_paid), 0), 0) ||
      d.invoices.filter((i: any) => i.status !== "paid" && i.status !== "cancelled")
        .reduce((s: number, i: any) => s + Math.max(num(i.total_amount) - num(i.amount_paid), 0), 0);
    const youOwe = d.payables.reduce((s: number, p: any) => s + Math.max(num(p.amount) - num(p.amount_paid), 0), 0);

    const overdueInvoices = d.invoices
      .filter((i: any) => i.due_date && new Date(i.due_date) < now && num(i.total_amount) - num(i.amount_paid) > 0)
      .map((i: any) => ({
        ...i,
        outstanding: num(i.total_amount) - num(i.amount_paid),
        daysLate: differenceInDays(now, new Date(i.due_date)),
      }))
      .sort((a: any, b: any) => b.outstanding - a.outstanding);

    // ---- Stock ----
    const stockByProduct = new Map<string, number>();
    d.stock.forEach((s: any) => {
      stockByProduct.set(s.product_id, (stockByProduct.get(s.product_id) ?? 0) + num(s.quantity));
    });
    const lowStock = d.products
      .filter((p: any) => p.is_active !== false)
      .map((p: any) => ({ ...p, qty: stockByProduct.get(p.id) ?? 0, threshold: p.low_stock_threshold ?? 5 }))
      .filter((p: any) => p.qty <= p.threshold);

    // ---- Margins ----
    const thinMargin = d.products
      .filter((p: any) => p.is_active !== false && num(p.unit_price) > 0 && num(p.cost_price) > 0)
      .map((p: any) => ({
        ...p,
        margin: (num(p.unit_price) - num(p.cost_price)) / num(p.unit_price),
      }))
      .filter((p: any) => p.margin < 0.15)
      .sort((a: any, b: any) => a.margin - b.margin);

    // ---- Expense categories rising ----
    const catNow = new Map<string, number>();
    const catPrev = new Map<string, number>();
    d.transactions.filter((t) => t.type === "expense").forEach((t) => {
      const c = t.category || "Uncategorized";
      if (inRange(t, since30)) catNow.set(c, (catNow.get(c) ?? 0) + num(t.amount));
      else if (inRange(t, prev30Start, since30)) catPrev.set(c, (catPrev.get(c) ?? 0) + num(t.amount));
    });
    const risingCats = Array.from(catNow.entries())
      .map(([cat, val]) => ({ cat, val, prev: catPrev.get(cat) ?? 0 }))
      .filter((r) => r.prev > 0 && r.val > r.prev * 1.25)
      .sort((a, b) => (b.val - b.prev) - (a.val - a.prev));

    // ---- Quiet customers ----
    const quietCustomers = d.customers.filter(
      (c: any) => c.is_active !== false && num(c.outstanding_balance) === 0 && new Date(c.created_at) < subDays(now, 60)
    );

    // ---- Opportunities ----
    const opportunities: Opportunity[] = [];

    if (overdueInvoices.length) {
      const total = overdueInvoices.reduce((s: number, i: any) => s + i.outstanding, 0);
      opportunities.push({
        id: "chase-invoices",
        title: `Chase ${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? "s" : ""}`,
        detail: `The oldest is ${overdueInvoices[0].daysLate} days past due. Collecting these puts cash back in the business fastest.`,
        impact: total,
        severity: "high",
        actionLabel: "Open invoices",
        actionPath: "/invoicing",
      });
    }

    if (thinMargin.length) {
      const p = thinMargin[0];
      const uplift = thinMargin.reduce(
        (s: number, x: any) => s + (num(x.unit_price) * 0.1), 0
      );
      opportunities.push({
        id: "pricing-headroom",
        title: `${thinMargin.length} item${thinMargin.length > 1 ? "s" : ""} priced too close to cost`,
        detail: `"${p.name}" earns only ${(p.margin * 100).toFixed(0)}% above what it costs you. A small price review protects your profit.`,
        impact: uplift,
        severity: "medium",
        actionLabel: "Review prices",
        actionPath: "/inventory/products",
      });
    }

    if (lowStock.length) {
      opportunities.push({
        id: "restock",
        title: `Restock ${lowStock.length} item${lowStock.length > 1 ? "s" : ""} before you lose sales`,
        detail: `${lowStock.slice(0, 3).map((p: any) => p.name).join(", ")}${lowStock.length > 3 ? " and more" : ""} are at or below their reorder level.`,
        impact: lowStock.reduce((s: number, p: any) => s + num(p.unit_price) * (p.threshold || 5), 0),
        severity: "high",
        actionLabel: "View stock",
        actionPath: "/inventory/stock",
      });
    }

    if (risingCats.length) {
      const r = risingCats[0];
      opportunities.push({
        id: "rising-costs",
        title: `Spending on ${r.cat} is climbing`,
        detail: `You spent ${naira(r.val)} in the last 30 days versus ${naira(r.prev)} the month before. Worth checking before it eats your profit.`,
        impact: r.val - r.prev,
        severity: "medium",
        actionLabel: "Open bookkeeping",
        actionPath: "/bookkeeping",
      });
    }

    if (quietCustomers.length >= 3) {
      opportunities.push({
        id: "reengage",
        title: `Reach out to ${quietCustomers.length} quiet customers`,
        detail: "These customers have no open balance and no recent activity. A follow-up message often brings repeat business.",
        impact: null,
        severity: "low",
        actionLabel: "Open customers",
        actionPath: "/customers",
      });
    }

    if (income30 > 0 && income30 > incomePrev30 * 1.15) {
      opportunities.push({
        id: "momentum",
        title: "Sales are growing — press the advantage",
        detail: `Income is up ${(((income30 - incomePrev30) / Math.max(incomePrev30, 1)) * 100).toFixed(0)}% on last month. Consider stocking your best sellers deeper.`,
        impact: income30 - incomePrev30,
        severity: "low",
        actionLabel: "View reports",
        actionPath: "/reports",
      });
    }

    if (d.products.length > 0 && d.invoices.length === 0) {
      opportunities.push({
        id: "start-invoicing",
        title: "Start invoicing your customers",
        detail: "You have products set up but no invoices yet. Invoices get you paid faster and keep your records clean.",
        impact: null,
        severity: "medium",
        actionLabel: "Create an invoice",
        actionPath: "/invoicing",
      });
    }

    opportunities.sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 } as const;
      if (rank[a.severity] !== rank[b.severity]) return rank[a.severity] - rank[b.severity];
      return (b.impact ?? 0) - (a.impact ?? 0);
    });

    // ---- Financial health ----
    const profit90 = income90 - expense90;
    const margin = income90 > 0 ? profit90 / income90 : 0;
    const expenseRatio = income90 > 0 ? expense90 / income90 : expense90 > 0 ? 1.5 : 0;
    const burn = expense90 / 3;
    const runway = burn > 0 ? cash / burn : null;

    let score = 50;
    if (income90 > 0) {
      score = 0;
      score += Math.max(0, Math.min(30, margin * 100)); // profitability up to 30
      score += expenseRatio <= 0.7 ? 20 : expenseRatio <= 0.9 ? 12 : expenseRatio <= 1 ? 6 : 0;
      score += cash > 0 ? (runway === null ? 15 : Math.min(20, runway * 5)) : 0;
      score += owedToYou <= youOwe ? 10 : owedToYou <= youOwe * 2 ? 6 : 3;
      score += overdueInvoices.length === 0 ? 10 : overdueInvoices.length <= 3 ? 5 : 0;
      score += income30 >= incomePrev30 ? 10 : 4;
      score = Math.round(Math.max(0, Math.min(100, score)));
    }

    const band: "healthy" | "watch" | "act" =
      score >= 70 ? "healthy" : score >= 45 ? "watch" : "act";
    const verdict =
      d.transactions.length === 0
        ? "Record your income and expenses to see your health score."
        : band === "healthy"
        ? "Your business is in good financial health with a positive cash flow."
        : band === "watch"
        ? "Your finances are steady but a few areas need attention."
        : "Your cash flow needs attention — review costs and collections.";

    const hasData =
      d.transactions.length > 0 || d.invoices.length > 0 || d.products.length > 0;

    return {
      isLoading,
      error,
      hasData,
      opportunities,
      lowStock,
      thinMargin,
      overdueInvoices,
      quietCustomers,
      risingCats,
      monthly,
      health: {
        score,
        band,
        verdict,
        cash,
        income90,
        expense90,
        income30,
        expense30,
        incomePrev30,
        expensePrev30,
        profit90,
        margin,
        expenseRatio,
        runway,
        owedToYou,
        youOwe,
      },
    };
  }, [data, isLoading, error]);
}
