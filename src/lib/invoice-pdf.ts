import type jsPDFType from "jspdf";

export interface InvoicePdfData {
  business: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    tin?: string | null;
    cac?: string | null;
    logoUrl?: string | null;
  };
  customer: {
    name?: string | null;
    company?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  invoice: {
    number: string;
    status: string;
    issueDate?: string | null;
    dueDate?: string | null;
    subtotal: number;
    discount: number;
    vatRate: number;
    vatAmount: number;
    total: number;
    amountPaid: number;
    notes?: string | null;
    terms?: string | null;
  };
  items: { description: string; quantity: number; unit?: string | null; unitPrice: number; total: number }[];
  payment?: { bankName?: string | null; accountNumber?: string | null; accountName?: string | null; payLink?: string | null } | null;
}

// Built-in PDF fonts have no ₦ glyph, so amounts are written as "NGN".
const money = (n: number) =>
  `NGN ${Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = () => res(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const GREEN: [number, number, number] = [22, 163, 74];
const DARK: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];

export async function buildInvoicePdf(d: InvoicePdfData): Promise<jsPDFType> {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;

  // Top band
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 4, "F");

  // Logo / name
  let x = M;
  if (d.business.logoUrl) {
    const img = await toDataUrl(d.business.logoUrl);
    if (img) {
      try { doc.addImage(img, M, 10, 18, 18); x = M + 22; } catch { /* ignore bad image */ }
    }
  }
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(d.business.name || "Business", x, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  const bizLines = [
    d.business.address,
    [d.business.phone, d.business.email].filter(Boolean).join("  |  "),
    [d.business.tin ? `TIN: ${d.business.tin}` : null, d.business.cac ? `RC: ${d.business.cac}` : null].filter(Boolean).join("  |  "),
  ].filter((l) => l && String(l).trim()) as string[];
  bizLines.forEach((l, i) => doc.text(doc.splitTextToSize(l, 95)[0], x, 21 + i * 4));

  // INVOICE title + meta
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("INVOICE", W - M, 18, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  const meta: [string, string][] = [
    ["Invoice No.", d.invoice.number],
    ["Issue date", fmtDate(d.invoice.issueDate)],
    ["Due date", fmtDate(d.invoice.dueDate)],
    ["Status", d.invoice.status.replace("_", " ").toUpperCase()],
  ];
  meta.forEach(([k, v], i) => {
    doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
    doc.text(k, W - M - 45, 25 + i * 4.5);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...DARK);
    doc.text(v, W - M, 25 + i * 4.5, { align: "right" });
  });

  // Bill to / From blocks
  const top = 48;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(M, top, (W - 2 * M - 6) / 2, 32, 2, 2, "FD");
  doc.roundedRect(M + (W - 2 * M - 6) / 2 + 6, top, (W - 2 * M - 6) / 2, 32, 2, 2, "FD");

  const block = (bx: number, title: string, lines: (string | null | undefined)[]) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...GREEN);
    doc.text(title, bx + 4, top + 6);
    doc.setTextColor(...DARK); doc.setFontSize(9.5);
    const clean = lines.filter((l) => l && String(l).trim()) as string[];
    clean.slice(0, 5).forEach((l, i) => {
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      doc.text(doc.splitTextToSize(l, (W - 2 * M - 6) / 2 - 8)[0], bx + 4, top + 11.5 + i * 4.5);
    });
    if (!clean.length) { doc.setFont("helvetica", "italic"); doc.setTextColor(...MUTED); doc.text("Not specified", bx + 4, top + 11.5); }
  };
  block(M, "BILL TO", [d.customer.name, d.customer.company, d.customer.address, d.customer.phone, d.customer.email]);
  block(M + (W - 2 * M - 6) / 2 + 6, "FROM", [d.business.name, d.business.address, d.business.phone, d.business.email]);

  // Items
  autoTable(doc, {
    startY: top + 38,
    margin: { left: M, right: M },
    head: [["#", "Description", "Qty", "Unit", "Unit price", "Amount"]],
    body: d.items.map((it, i) => [
      String(i + 1), it.description, String(it.quantity), it.unit || "—", money(it.unitPrice), money(it.total),
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.5, textColor: DARK, lineColor: [226, 232, 240] },
    headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 9, halign: "center" },
      2: { cellWidth: 15, halign: "right" },
      3: { cellWidth: 18 },
      4: { cellWidth: 32, halign: "right" },
      5: { cellWidth: 34, halign: "right" },
    },
  });

  let y = (doc as any).lastAutoTable.finalY + 6;
  const balance = Math.max(0, d.invoice.total - d.invoice.amountPaid);
  const totals: [string, string, boolean?][] = [
    ["Subtotal", money(d.invoice.subtotal)],
    ...(d.invoice.discount ? [["Discount", `- ${money(d.invoice.discount)}`] as [string, string]] : []),
    [`VAT (${d.invoice.vatRate}%)`, money(d.invoice.vatAmount)],
    ["Total", money(d.invoice.total), true],
    ["Amount paid", money(d.invoice.amountPaid)],
    ["Balance due", money(balance), true],
  ];
  if (y + totals.length * 6 + 10 > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
  const tx = W - M - 75;
  totals.forEach(([k, v, strong], i) => {
    const ry = y + i * 6;
    if (strong) { doc.setFillColor(240, 253, 244); doc.rect(tx - 2, ry - 4.2, 77, 6, "F"); }
    doc.setFont("helvetica", strong ? "bold" : "normal"); doc.setFontSize(strong ? 10 : 9);
    doc.setTextColor(...(strong ? DARK : MUTED));
    doc.text(k, tx, ry);
    doc.setTextColor(...DARK);
    doc.text(v, W - M, ry, { align: "right" });
  });

  // Left column: payment details, notes, terms
  let ly = y;
  const leftW = W - 2 * M - 85;
  const section = (title: string, body: string) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...GREEN);
    doc.text(title, M, ly);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(body, leftW);
    doc.text(lines, M, ly + 4.5);
    ly += 6 + lines.length * 4;
  };
  const p = d.payment;
  if (p && (p.accountNumber || p.payLink)) {
    const parts = [
      p.bankName ? `Bank: ${p.bankName}` : null,
      p.accountNumber ? `Account no.: ${p.accountNumber}` : null,
      p.accountName ? `Account name: ${p.accountName}` : null,
      p.payLink ? `Pay online: ${p.payLink}` : null,
    ].filter(Boolean).join("\n");
    section("PAYMENT DETAILS", parts);
  }
  if (d.invoice.notes) section("NOTES", d.invoice.notes);
  if (d.invoice.terms) section("TERMS", d.invoice.terms);

  // Footer on every page
  const pages = doc.getNumberOfPages();
  const generated = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const H = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240); doc.line(M, H - 14, W - M, H - 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text(`Generated ${generated} · Powered by Prime`, M, H - 9);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 9, { align: "right" });
  }
  return doc;
}
