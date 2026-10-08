import { useState, useEffect, useMemo } from "react";
import { onAction } from "@/lib/action-bus";
import { useVoiceForm } from "@/hooks/use-voice-form";
import {
  Plus, Send, Eye, Trash2, CreditCard, Search, Filter, Download, Pencil, CheckCircle2, Ban, Link2, Mail, Lock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ImportExportButtons } from "@/components/ImportExportButtons";
import { useIndustryTerms } from "@/contexts/IndustryContext";
import { buildInvoicePdf, type InvoicePdfData } from "@/lib/invoice-pdf";
import { adjustStock } from "@/lib/stock";
import { formatQty, normalizeUnit } from "@/lib/units";
import { logFailure } from "@/lib/monitoring";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  paid: "bg-primary text-primary-foreground",
  overdue: "bg-destructive/10 text-destructive",
  partial: "bg-warning/15 text-warning",
  cancelled: "bg-muted text-muted-foreground line-through",
};
const statusLabel: Record<string, string> = {
  draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue", partial: "Partially paid", cancelled: "Cancelled",
};

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  product_id?: string | null;
}

const NEW_CUSTOMER = "__new__";
const NO_CUSTOMER = "__none__";
const naira = (n: number) => `₦${Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
const todayStr = () => new Date().toISOString().slice(0, 10);
const plus30 = () => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

/** Effective status: unpaid invoices past their due date read as overdue. */
function effectiveStatus(inv: any): string {
  const s = inv.status === "partially_paid" ? "partial" : inv.status;
  if (["sent", "partial"].includes(s) && inv.due_date && inv.due_date < todayStr() && Number(inv.total_amount) - Number(inv.amount_paid) > 0) {
    return "overdue";
  }
  return s;
}

export default function Invoicing() {
  const { user, profile } = useAuth();
  const branding = useBranding();
  const industryTerms = useIndustryTerms();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [preview, setPreview] = useState<{ id: string; url: string } | null>(null);

  // Form state
  const [customerId, setCustomerId] = useState<string>(NO_CUSTOMER);
  const [customerName, setCustomerName] = useState("");
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "", address: "" });
  const [issueDate, setIssueDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState(plus30());
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Payment due within 30 days.");
  const [applyVat, setApplyVat] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayStr());

  // Voice agent: open & prefill create dialog
  useEffect(() => {
    return onAction("open-create-invoice", (p) => {
      resetForm();
      if (p?.customer_name) setCustomerName(p.customer_name);
      if (p?.due_date) setDueDate(p.due_date);
      if (p?.description || p?.amount) {
        setItems([{ description: p.description || "", quantity: 1, unit_price: p.amount || 0 }]);
      }
      setCreateOpen(true);
    });
  }, []);

  useEffect(() => {
    return onAction("open-create-order", (p) => {
      resetForm();
      if (p?.customer_name) setCustomerName(p.customer_name);
      if (p?.product_name || p?.total) {
        setItems([{ description: p.product_name || "Order item", quantity: p.quantity || 1, unit_price: p.total && p.quantity ? p.total / p.quantity : (p.total || 0) }]);
      }
      setCreateOpen(true);
    });
  }, []);

  useVoiceForm({
    enabled: createOpen,
    formId: "create-invoice",
    title: "Create Invoice",
    fields: [
      { name: "customer_name", type: "string", description: "Customer / patient / client name" },
      { name: "due_date", type: "date", description: "Invoice due date (YYYY-MM-DD)" },
      { name: "description", type: "string", description: "Line item description" },
      { name: "quantity", type: "number" },
      { name: "unit_price", type: "number", description: "Unit price in Naira" },
      { name: "notes", type: "string" },
      { name: "terms", type: "string", description: "Payment terms" },
    ],
    apply: (v) => {
      if (v.customer_name) setCustomerName(String(v.customer_name));
      if (v.due_date) setDueDate(String(v.due_date));
      if (v.notes) setNotes(String(v.notes));
      if (v.terms) setTerms(String(v.terms));
      if (v.description || v.unit_price || v.quantity) {
        setItems((prev) => {
          const first = prev[0] ?? { description: "", quantity: 1, unit_price: 0 };
          return [{
            ...first,
            description: v.description ?? first.description,
            quantity: Number(v.quantity ?? first.quantity) || 1,
            unit_price: Number(v.unit_price ?? first.unit_price) || 0,
          }, ...prev.slice(1)];
        });
      }
    },
  });

  useVoiceForm({
    enabled: paymentOpen,
    formId: "record-payment",
    title: "Record Payment",
    fields: [
      { name: "amount", type: "number", description: "Payment amount in Naira" },
      { name: "method", type: "string", description: "One of: bank_transfer, cash, card, mobile_money" },
      { name: "reference", type: "string", description: "Payment reference / note" },
    ],
    apply: (v) => {
      if (v.amount !== undefined) setPaymentAmount(String(v.amount));
      if (v.method) setPaymentMethod(String(v.method));
      if (v.reference) setPaymentRef(String(v.reference));
    },
  });

  // ---------- Data ----------
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, customers(id, name, email, phone, address, company_name)")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", businessId, "invoice-picker"],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, email, phone, address, company_name")
        .eq("business_id", businessId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("business_id", businessId!).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: settlement } = useQuery({
    queryKey: ["payment-account", businessId],
    enabled: !!businessId,
    retry: false,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("payment_accounts").select("*").eq("business_id", businessId!).eq("provider", "paystack").maybeSingle();
      return data ?? null;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["invoice-payments", selectedInvoice],
    enabled: !!selectedInvoice,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_payments").select("*").eq("invoice_id", selectedInvoice!).order("payment_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidateMoney = () => {
    ["invoices", "invoice-payments", "dashboard-tx", "insight-data", "transactions", "stock_levels", "stock_movements", "customers"]
      .forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
  };

  // ---------- Helpers ----------
  const nextInvoiceNumber = () => {
    const nums = invoices.map((i) => parseInt(String(i.invoice_number ?? "").replace(/\D/g, ""), 10)).filter((n) => !isNaN(n) && n < 1_000_000);
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `INV-${String(next).padStart(5, "0")}`;
  };

  /** Deduct invoiced products from stock exactly once per invoice. */
  const deductStockOnce = async (inv: any) => {
    const ref = inv.invoice_number;
    const { data: done } = await supabase
      .from("stock_movements").select("id").eq("business_id", businessId!).eq("reference", ref).eq("movement_type", "sale").limit(1);
    if (done && done.length) return;
    const { data: lines } = await supabase.from("invoice_items").select("product_id, quantity").eq("invoice_id", inv.id);
    for (const l of lines ?? []) {
      if (!l.product_id) continue;
      await adjustStock({
        businessId: businessId!, productId: l.product_id, delta: -Number(l.quantity),
        movementType: "sale", reference: ref, notes: `Invoice ${ref}`, userId: user?.id,
      });
    }
  };

  /** Return stock if a sent invoice is cancelled. */
  const restoreStock = async (inv: any) => {
    const ref = inv.invoice_number;
    const { data: sold } = await supabase
      .from("stock_movements").select("product_id, quantity, from_location_id").eq("business_id", businessId!).eq("reference", ref).eq("movement_type", "sale");
    for (const m of sold ?? []) {
      await adjustStock({
        businessId: businessId!, productId: m.product_id, locationId: m.from_location_id, delta: Number(m.quantity),
        movementType: "adjustment", reference: `${ref}-CANCEL`, notes: `Invoice ${ref} cancelled`, userId: user?.id,
      });
    }
  };

  /** Post payment: invoice_payments + invoice balance + income in bookkeeping + stock. */
  const postPayment = async (inv: any, amount: number, method: string, reference: string | null, date: string) => {
    const outstanding = Number(inv.total_amount) - Number(inv.amount_paid);
    if (amount <= 0) throw new Error("Enter an amount greater than 0");
    if (amount > outstanding + 0.01) throw new Error(`Amount is more than the balance of ${naira(outstanding)}`);

    const { error: pErr } = await supabase.from("invoice_payments").insert({
      invoice_id: inv.id, amount, payment_method: method, reference, payment_date: date, created_by: user?.id,
    });
    if (pErr) throw pErr;

    const newPaid = Number(inv.amount_paid) + amount;
    const newStatus = newPaid >= Number(inv.total_amount) - 0.01 ? "paid" : "partial";
    const { error: uErr } = await supabase.from("invoices").update({ amount_paid: newPaid, status: newStatus }).eq("id", inv.id);
    if (uErr) throw uErr;

    const { error: tErr } = await supabase.from("transactions").insert({
      business_id: businessId!,
      type: "income",
      category: "Sales",
      description: `Payment for invoice ${inv.invoice_number}${inv.customers?.name ? ` — ${inv.customers.name}` : ""}`,
      amount,
      currency: inv.currency || "NGN",
      transaction_date: date,
      reference_number: inv.invoice_number,
      payment_method: method,
      created_by: user?.id,
    });
    if (tErr) {
      logFailure({ category: "data", action: "invoice_payment_to_books", message: tErr.message, code: tErr.code });
      throw new Error(`Payment saved on the invoice, but couldn't add it to Bookkeeping: ${tErr.message}`);
    }

    await deductStockOnce(inv);
  };

  // ---------- Mutations ----------
  const resolveCustomer = async (): Promise<string | null> => {
    if (customerId === NEW_CUSTOMER) {
      if (!newCustomer.name.trim()) throw new Error("Enter the new customer's name");
      const { data, error } = await supabase.from("customers").insert({
        business_id: businessId!, name: newCustomer.name.trim(), email: newCustomer.email || null,
        phone: newCustomer.phone || null, address: newCustomer.address || null,
      }).select("id").single();
      if (error) throw error;
      return data.id;
    }
    if (customerId !== NO_CUSTOMER) return customerId;
    if (customerName.trim()) {
      const match = customers.find((c: any) => c.name.toLowerCase() === customerName.trim().toLowerCase());
      if (match) return match.id;
      const { data, error } = await supabase.from("customers").insert({ business_id: businessId!, name: customerName.trim() }).select("id").single();
      if (error) throw error;
      return data.id;
    }
    return null;
  };

  const lineItems = items.filter((i) => i.description.trim());
  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const discountAmt = Math.min(Math.max(discount || 0, 0), subtotal);
  const vatRate = applyVat ? 7.5 : 0;
  const vatAmount = (subtotal - discountAmt) * (vatRate / 100);
  const total = subtotal - discountAmt + vatAmount;

  const saveInvoice = useMutation({
    mutationFn: async () => {
      if (!lineItems.length) throw new Error("Add at least one line item");
      const cid = await resolveCustomer();
      const payload = {
        customer_id: cid,
        subtotal, discount_amount: discountAmt, vat_rate: vatRate, vat_amount: vatAmount, total_amount: total,
        issue_date: issueDate, due_date: dueDate || null, notes: notes || null, terms: terms || null,
      };
      let invoiceId = editingId;
      if (editingId) {
        const existing = invoices.find((i) => i.id === editingId);
        if (existing && total < Number(existing.amount_paid)) throw new Error("New total is less than what has already been paid");
        const { error } = await supabase.from("invoices").update(payload).eq("id", editingId);
        if (error) throw error;
        await supabase.from("invoice_items").delete().eq("invoice_id", editingId);
      } else {
        const { data, error } = await supabase.from("invoices").insert({
          ...payload, business_id: businessId!, invoice_number: nextInvoiceNumber(), status: "draft", created_by: user?.id,
        }).select("id").single();
        if (error) throw error;
        invoiceId = data.id;
      }
      const rows = lineItems.map((it) => ({
        invoice_id: invoiceId!, product_id: it.product_id || null, description: it.description,
        quantity: it.quantity, unit_price: it.unit_price, total_price: it.quantity * it.unit_price,
      }));
      const { error: iErr } = await supabase.from("invoice_items").insert(rows);
      if (iErr) throw iErr;
    },
    onSuccess: () => {
      invalidateMoney();
      toast.success(editingId ? "Invoice updated" : "Invoice created as draft");
      setCreateOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markSent = useMutation({
    mutationFn: async (inv: any) => {
      const { error } = await supabase.from("invoices").update({ status: "sent" }).eq("id", inv.id);
      if (error) throw error;
      await deductStockOnce(inv);
    },
    onSuccess: () => { invalidateMoney(); toast.success("Invoice marked as sent"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (inv: any) => {
      const outstanding = Number(inv.total_amount) - Number(inv.amount_paid);
      await postPayment(inv, outstanding, "bank_transfer", null, todayStr());
    },
    onSuccess: () => { invalidateMoney(); toast.success("Invoice paid", { description: "Revenue added to Bookkeeping and the dashboard." }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      const inv = invoices.find((i) => i.id === selectedInvoice);
      if (!inv) throw new Error("Invoice not found");
      await postPayment(inv, parseFloat(paymentAmount), paymentMethod, paymentRef || null, paymentDate);
    },
    onSuccess: () => {
      invalidateMoney();
      setPaymentAmount(""); setPaymentRef("");
      setPaymentOpen(false);
      toast.success("Payment recorded", { description: "Added to Bookkeeping and the dashboard revenue." });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelInvoice = useMutation({
    mutationFn: async (inv: any) => {
      if (Number(inv.amount_paid) > 0) throw new Error("This invoice has payments recorded and can't be cancelled");
      const { error } = await supabase.from("invoices").update({ status: "cancelled" }).eq("id", inv.id);
      if (error) throw error;
      await restoreStock(inv);
    },
    onSuccess: () => { invalidateMoney(); toast.success("Invoice cancelled"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("invoice_items").delete().eq("invoice_id", id);
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateMoney(); toast.success("Draft deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => {
    setEditingId(null);
    setCustomerId(NO_CUSTOMER);
    setCustomerName("");
    setNewCustomer({ name: "", email: "", phone: "", address: "" });
    setIssueDate(todayStr());
    setDueDate(plus30());
    setNotes("");
    setTerms("Payment due within 30 days.");
    setApplyVat(true);
    setDiscount(0);
    setItems([{ description: "", quantity: 1, unit_price: 0 }]);
  };

  const openEdit = async (inv: any) => {
    if (effectiveStatus(inv) === "paid" || inv.status === "cancelled") return;
    if (inv.status !== "draft" && !confirm("This invoice has already been sent. Edit it anyway? Send the customer the updated copy afterwards.")) return;
    const { data: lines } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
    setEditingId(inv.id);
    setCustomerId(inv.customer_id || NO_CUSTOMER);
    setCustomerName("");
    setIssueDate(inv.issue_date || todayStr());
    setDueDate(inv.due_date || "");
    setNotes(inv.notes || "");
    setTerms(inv.terms || "");
    setApplyVat(Number(inv.vat_rate ?? 7.5) > 0);
    setDiscount(Number(inv.discount_amount || 0));
    setItems((lines ?? []).length
      ? (lines ?? []).map((l: any) => ({ description: l.description, quantity: Number(l.quantity), unit_price: Number(l.unit_price), product_id: l.product_id }))
      : [{ description: "", quantity: 1, unit_price: 0 }]);
    setCreateOpen(true);
  };

  // ---------- PDF ----------
  const pdfData = async (inv: any): Promise<InvoicePdfData> => {
    const { data: lines } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
    const c = inv.customers ?? {};
    const b: any = business ?? {};
    return {
      business: {
        name: branding.brandName && branding.brandName !== "Prime" ? branding.brandName : b.company_name || "Business",
        address: [b.business_address, b.lga, b.state].filter(Boolean).join(", ") || null,
        phone: profile?.phone || null,
        email: user?.email || null,
        tin: b.tin_number || null,
        cac: b.cac_number || null,
        logoUrl: branding.logoUrl,
      },
      customer: { name: c.name, company: c.company_name, address: c.address, phone: c.phone, email: c.email },
      invoice: {
        number: inv.invoice_number, status: statusLabel[effectiveStatus(inv)] ?? inv.status,
        issueDate: inv.issue_date, dueDate: inv.due_date,
        subtotal: Number(inv.subtotal), discount: Number(inv.discount_amount || 0),
        vatRate: Number(inv.vat_rate ?? 7.5), vatAmount: Number(inv.vat_amount || 0),
        total: Number(inv.total_amount), amountPaid: Number(inv.amount_paid),
        notes: inv.notes, terms: inv.terms,
      },
      items: (lines ?? []).map((l: any) => {
        const prod = products.find((p: any) => p.id === l.product_id);
        return {
          description: l.description, quantity: Number(l.quantity),
          unit: prod ? normalizeUnit(prod.unit_of_measure) : null,
          unitPrice: Number(l.unit_price), total: Number(l.total_price),
        };
      }),
      payment: settlement
        ? { bankName: settlement.settlement_bank_name, accountNumber: settlement.settlement_account_number, accountName: settlement.settlement_account_name }
        : null,
    };
  };

  const downloadPdf = async (inv: any) => {
    try {
      const doc = await buildInvoicePdf(await pdfData(inv));
      doc.save(`${inv.invoice_number}.pdf`);
    } catch (e: any) {
      toast.error("Couldn't build the PDF", { description: e.message });
    }
  };

  const openPreview = async (inv: any) => {
    try {
      const doc = await buildInvoicePdf(await pdfData(inv));
      const url = URL.createObjectURL(doc.output("blob"));
      setPreview({ id: inv.id, url });
    } catch (e: any) {
      toast.error("Couldn't build the preview", { description: e.message });
    }
  };

  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const payLink = async (inv: any): Promise<string | null> => {
    const email = inv.customers?.email;
    if (!email) { toast.error("Add an email address to this customer first"); return null; }
    const balance = Number(inv.total_amount) - Number(inv.amount_paid);
    const { data, error } = await supabase.functions.invoke("paystack-charge", {
      body: { amount: balance, email, customer_name: inv.customers?.name, invoice_id: inv.id, callback_url: `${window.location.origin}/invoicing` },
    });
    if (error || !data?.authorization_url) {
      toast.error("Couldn't create a payment link", { description: "Connect your settlement account in Banking → Payments first." });
      return null;
    }
    return data.authorization_url as string;
  };

  const copyPayLink = async (inv: any) => {
    const link = await payLink(inv);
    if (!link) return;
    await navigator.clipboard.writeText(link).catch(() => {});
    toast.success("Payment link copied", { description: "Share it with your customer — payment settles to your account." });
  };

  const emailInvoice = async (inv: any) => {
    const email = inv.customers?.email;
    if (!email) { toast.error("This customer has no email address"); return; }
    const link = await payLink(inv).catch(() => null);
    const bizName = (business as any)?.company_name || "Your supplier";
    const balance = Number(inv.total_amount) - Number(inv.amount_paid);
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1e293b">
      <div style="background:#16A34A;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0"><strong>${bizName}</strong></div>
      <div style="border:1px solid #e2e8f0;border-top:0;padding:20px;border-radius:0 0 8px 8px">
        <p>Hello ${inv.customers?.name ?? ""},</p>
        <p>Please find invoice <strong>${inv.invoice_number}</strong> details below.</p>
        <table style="width:100%;font-size:14px">
          <tr><td>Issue date</td><td align="right">${inv.issue_date ?? ""}</td></tr>
          <tr><td>Due date</td><td align="right">${inv.due_date ?? ""}</td></tr>
          <tr><td><strong>Balance due</strong></td><td align="right"><strong>₦${balance.toLocaleString()}</strong></td></tr>
        </table>
        ${link ? `<p style="text-align:center;margin:24px 0"><a href="${link}" style="background:#16A34A;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none">Pay now</a></p>` : ""}
        <p style="color:#64748b;font-size:12px">Sent via Prime</p>
      </div></div>`;
    const { error } = await supabase.functions.invoke("send-email", {
      body: { to: email, subject: `Invoice ${inv.invoice_number} from ${bizName}`, html, reply_to: user?.email },
    });
    if (error) { toast.error("Couldn't send the email", { description: error.message }); return; }
    if (inv.status === "draft") await markSent.mutateAsync(inv);
    toast.success(`Invoice emailed to ${email}`);
  };

  // ---------- Form helpers ----------
  const addItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<InvoiceItem>) => setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const pickProduct = (idx: number, productId: string) => {
    if (productId === "__free__") { updateItem(idx, { product_id: null }); return; }
    const p: any = products.find((x: any) => x.id === productId);
    if (p) updateItem(idx, { product_id: p.id, description: p.name, unit_price: Number(p.unit_price) });
  };

  // ---------- Derived ----------
  const withStatus = useMemo(() => invoices.map((i) => ({ ...i, _status: effectiveStatus(i) })), [invoices]);
  const filteredInvoices = withStatus.filter((inv) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q || inv.invoice_number?.toLowerCase().includes(q) || inv.customers?.name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || inv._status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const monthStart = todayStr().slice(0, 7);
  const { data: monthPayments = [] } = useQuery({
    queryKey: ["invoice-payments", "month", businessId, monthStart],
    enabled: !!businessId && invoices.length > 0,
    queryFn: async () => {
      const ids = invoices.map((i) => i.id);
      const { data } = await supabase.from("invoice_payments").select("amount, payment_date").in("invoice_id", ids).gte("payment_date", `${monthStart}-01`);
      return data ?? [];
    },
  });
  const paidThisMonth = monthPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const open = withStatus.filter((i) => ["sent", "partial", "overdue"].includes(i._status));
  const totalOutstanding = open.reduce((s, i) => s + (Number(i.total_amount) - Number(i.amount_paid)), 0);
  const totalOverdue = withStatus.filter((i) => i._status === "overdue").reduce((s, i) => s + (Number(i.total_amount) - Number(i.amount_paid)), 0);

  if (!business) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please set up your business profile first.</p>
      </div>
    );
  }

  const selected = withStatus.find((i) => i.id === selectedInvoice);
  const previewInv = preview ? withStatus.find((i) => i.id === preview.id) : null;
  const pickedCustomer: any = customers.find((c: any) => c.id === customerId);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{industryTerms.invoices}</h1>
          <p className="text-muted-foreground text-sm">Draft → Send → Get paid. Every payment is added to Bookkeeping and your dashboard revenue.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportExportButtons
            filename="invoices"
            rows={withStatus.map((i: any) => ({
              invoice_number: i.invoice_number, customer: i.customers?.name ?? "", status: statusLabel[i._status] ?? i._status,
              issue_date: i.issue_date, due_date: i.due_date, subtotal: i.subtotal, discount: i.discount_amount ?? 0,
              vat_amount: i.vat_amount, total_amount: i.total_amount, amount_paid: i.amount_paid,
              balance: Number(i.total_amount) - Number(i.amount_paid),
            }))}
          />
          <Button className="min-h-[44px]" onClick={() => { resetForm(); setCreateOpen(true); }}><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total {industryTerms.invoices}</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{invoices.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Paid this month</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{naira(paidThisMonth)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Outstanding ({open.length})</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-warning">{naira(totalOutstanding)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Overdue</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{naira(totalOverdue)}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search number or customer..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(statusLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Issued</TableHead>
                  <TableHead className="hidden md:table-cell">Due</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
                ) : (
                  filteredInvoices.map((inv) => {
                    const s = inv._status;
                    const balance = Number(inv.total_amount) - Number(inv.amount_paid);
                    const payable = ["sent", "partial", "overdue"].includes(s);
                    const editable = !["paid", "cancelled"].includes(s);
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                        <TableCell className="max-w-[160px] truncate">{inv.customers?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="hidden md:table-cell">{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="hidden md:table-cell">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="text-right">{naira(inv.total_amount)}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell">{naira(balance)}</TableCell>
                        <TableCell><Badge className={statusColors[s] || ""}>{statusLabel[s] ?? s}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-0.5 justify-end flex-wrap">
                            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => openPreview(inv)} title="Preview"><Eye className="h-4 w-4" /></Button>
                            {editable ? (
                              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => openEdit(inv)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                            ) : (
                              <Button variant="ghost" size="icon" className="h-10 w-10" disabled title="Paid invoices are locked"><Lock className="h-4 w-4" /></Button>
                            )}
                            {s === "draft" && (
                              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => markSent.mutate(inv)} title="Mark as sent"><Send className="h-4 w-4" /></Button>
                            )}
                            {(payable || s === "draft") && (
                              <>
                                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => { setSelectedInvoice(inv.id); setPaymentAmount(String(balance)); setPaymentDate(todayStr()); setPaymentOpen(true); }} title="Record payment"><CreditCard className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => { if (confirm(`Mark ${inv.invoice_number} as fully paid (${naira(balance)})?`)) markPaid.mutate(inv); }} title="Mark as paid"><CheckCircle2 className="h-4 w-4 text-primary" /></Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => downloadPdf(inv)} title="Download PDF"><Download className="h-4 w-4" /></Button>
                            {s === "draft" ? (
                              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => { if (confirm("Delete this draft?")) deleteInvoice.mutate(inv.id); }} title="Delete draft"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            ) : payable && Number(inv.amount_paid) === 0 ? (
                              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => { if (confirm("Cancel this invoice? Any stock it used will be returned.")) cancelInvoice.mutate(inv); }} title="Cancel invoice"><Ban className="h-4 w-4 text-destructive" /></Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>

      {/* Create / Edit */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit invoice" : "New invoice"}</DialogTitle>
            <DialogDescription>Saved as a draft. Send it or record payment from the list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {/* Customer */}
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CUSTOMER}>— Type a name below —</SelectItem>
                  {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}{c.company_name ? ` · ${c.company_name}` : ""}</SelectItem>)}
                  <SelectSeparator />
                  <SelectItem value={NEW_CUSTOMER} className="text-primary font-medium">+ New customer</SelectItem>
                </SelectContent>
              </Select>
              {customerId === NO_CUSTOMER && (
                <Input placeholder="Customer name (saved to Customers)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              )}
              {customerId === NEW_CUSTOMER && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border p-3 bg-muted/30">
                  <Input placeholder="Name *" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                  <Input placeholder="Email" type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                  <Input placeholder="Phone" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                  <Input placeholder="Address" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} />
                </div>
              )}
              {pickedCustomer && (
                <p className="text-xs text-muted-foreground">
                  {[pickedCustomer.email, pickedCustomer.phone, pickedCustomer.address].filter(Boolean).join(" · ") || "No contact details on file"}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Issue date</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
              <div><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            </div>

            {/* Items */}
            <div>
              <Label>Line items</Label>
              <div className="space-y-2 mt-2">
                {items.map((item, idx) => {
                  const prod: any = products.find((p: any) => p.id === item.product_id);
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-start rounded-lg border p-2">
                      <div className="col-span-12 sm:col-span-4">
                        <Select value={item.product_id || "__free__"} onValueChange={(v) => pickProduct(idx, v)}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Product" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__free__">Custom item</SelectItem>
                            {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-12 sm:col-span-8">
                        <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                      </div>
                      <div className="col-span-4 sm:col-span-3">
                        <Input type="number" min="0" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })} />
                        {prod && <p className="text-[11px] text-muted-foreground mt-0.5">{formatQty(item.quantity, prod.unit_of_measure)}</p>}
                      </div>
                      <div className="col-span-4 sm:col-span-4">
                        <Input type="number" min="0" placeholder="Unit price (₦)" value={item.unit_price} onChange={(e) => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="col-span-3 sm:col-span-4 text-sm text-right font-medium pt-2.5">{naira(item.quantity * item.unit_price)}</div>
                      <div className="col-span-1 flex justify-end">
                        {items.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add item</Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="text-sm font-medium">Apply VAT (7.5%)</p><p className="text-xs text-muted-foreground">Nigerian standard rate</p></div>
                  <Switch checked={applyVat} onCheckedChange={setApplyVat} />
                </div>
                <div><Label>Discount (₦)</Label><Input type="number" min="0" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} /></div>
              </div>
              <div className="rounded-lg border p-3 space-y-1 text-sm bg-muted/30">
                <div className="flex justify-between"><span>Subtotal</span><span>{naira(subtotal)}</span></div>
                {discountAmt > 0 && <div className="flex justify-between"><span>Discount</span><span>- {naira(discountAmt)}</span></div>}
                <div className="flex justify-between"><span>VAT ({vatRate}%)</span><span>{naira(vatAmount)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>{naira(total)}</span></div>
              </div>
            </div>

            <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Thank you for your business." /></div>
            <div><Label>Payment terms</Label><Input value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={() => saveInvoice.mutate()} disabled={saveInvoice.isPending || !lineItems.length}>
              {saveInvoice.isPending ? "Saving..." : editingId ? "Save changes" : "Create draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && closePreview()}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Invoice {previewInv?.invoice_number}</DialogTitle>
            <DialogDescription>This is exactly what your customer receives.</DialogDescription>
          </DialogHeader>
          {preview && <iframe src={preview.url} title="Invoice preview" className="flex-1 w-full rounded border" />}
          {previewInv && (
            <DialogFooter className="flex-wrap gap-2">
              {!["paid", "cancelled"].includes(previewInv._status) && (
                <Button variant="outline" onClick={() => { closePreview(); openEdit(previewInv); }}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
              )}
              {["sent", "partial", "overdue", "draft"].includes(previewInv._status) && (
                <>
                  <Button variant="outline" onClick={() => copyPayLink(previewInv)}><Link2 className="h-4 w-4 mr-2" />Copy pay link</Button>
                  <Button variant="outline" onClick={() => emailInvoice(previewInv)}><Mail className="h-4 w-4 mr-2" />Email to customer</Button>
                </>
              )}
              <Button onClick={() => downloadPdf(previewInv)}><Download className="h-4 w-4 mr-2" />Download PDF</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            {selected && (
              <DialogDescription>
                {selected.invoice_number} · Balance {naira(Number(selected.total_amount) - Number(selected.amount_paid))}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount (₦)</Label><Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /></div>
              <div><Label>Date</Label><Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
            </div>
            <div>
              <Label>Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card / POS</SelectItem>
                  <SelectItem value="mobile_money">Mobile money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference</Label><Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Transfer reference / receipt no." /></div>
            <p className="text-xs text-muted-foreground">This also adds an income entry in Bookkeeping, so it shows in your dashboard revenue.</p>
            <Button className="w-full" onClick={() => recordPayment.mutate()} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? "Recording..." : "Record payment"}
            </Button>

            {payments.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Payment history</h4>
                <div className="space-y-1">
                  {payments.map((p: any) => (
                    <div key={p.id} className="flex justify-between text-sm border-b pb-1">
                      <span>{new Date(p.payment_date).toLocaleDateString()} · {String(p.payment_method ?? "").replace("_", " ")}{p.reference ? ` · ${p.reference}` : ""}</span>
                      <span className="font-medium">{naira(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
