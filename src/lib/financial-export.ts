import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function fmt(n: number) {
  return `NGN ${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export interface FinancialData {
  businessName: string;
  period: string;
  totalIncome: number;
  totalExpenses: number;
  totalVat: number;
  grossProfit: number;
  netProfit: number;
  incomeByCategory: Record<string, number>;
  expensesByCategory: Record<string, number>;
  assetAccounts: Array<{ code?: string | null; name: string }>;
  liabilityAccounts: Array<{ code?: string | null; name: string }>;
  equityAccounts: Array<{ code?: string | null; name: string }>;
}

function header(doc: jsPDF, title: string, d: FinancialData) {
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(d.businessName || "Business", 14, 18);
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 26);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Period: ${d.period}  -  Generated: ${new Date().toLocaleDateString()}`, 14, 32);
  doc.setTextColor(0);
}

export function downloadPnLPdf(d: FinancialData) {
  const doc = new jsPDF();
  header(doc, "Profit & Loss Statement", d);
  const incomeRows = Object.entries(d.incomeByCategory).map(([c, a]) => [c, fmt(a)]);
  const expenseRows = Object.entries(d.expensesByCategory).map(([c, a]) => [c, `(${fmt(a)})`]);

  autoTable(doc, {
    startY: 40, head: [["Revenue", "Amount"]],
    body: incomeRows.length ? incomeRows : [["No income recorded", ""]],
    foot: [["Total Revenue", fmt(d.totalIncome)]],
    theme: "striped", headStyles: { fillColor: [16, 185, 129] },
  });
  autoTable(doc, {
    head: [["Expenses", "Amount"]],
    body: expenseRows.length ? expenseRows : [["No expenses recorded", ""]],
    foot: [["Total Expenses", `(${fmt(d.totalExpenses)})`]],
    theme: "striped", headStyles: { fillColor: [239, 68, 68] },
  });
  autoTable(doc, {
    head: [["Summary", ""]],
    body: [
      ["Gross Profit", fmt(d.grossProfit)],
      ["VAT (7.5%)", fmt(d.totalVat)],
      ["Net Profit", fmt(d.netProfit)],
    ],
    theme: "grid", headStyles: { fillColor: [59, 130, 246] },
  });
  doc.save(`profit-loss-${Date.now()}.pdf`);
}

export function downloadBalanceSheetPdf(d: FinancialData) {
  const doc = new jsPDF();
  header(doc, "Balance Sheet", d);
  autoTable(doc, {
    startY: 40, head: [["Assets", "Balance"]],
    body: d.assetAccounts.length ? d.assetAccounts.map(a => [`${a.code ? a.code + " - " : ""}${a.name}`, "-"]) : [["No asset accounts", ""]],
    theme: "striped", headStyles: { fillColor: [16, 185, 129] },
  });
  autoTable(doc, {
    head: [["Liabilities", "Balance"]],
    body: d.liabilityAccounts.length ? d.liabilityAccounts.map(a => [`${a.code ? a.code + " - " : ""}${a.name}`, "-"]) : [["No liability accounts", ""]],
    theme: "striped", headStyles: { fillColor: [239, 68, 68] },
  });
  autoTable(doc, {
    head: [["Equity", "Balance"]],
    body: [
      ...d.equityAccounts.map(a => [`${a.code ? a.code + " - " : ""}${a.name}`, "-"]),
      ["Retained Earnings", fmt(d.netProfit)],
    ],
    theme: "striped", headStyles: { fillColor: [59, 130, 246] },
  });
  doc.save(`balance-sheet-${Date.now()}.pdf`);
}

export function downloadCashFlowPdf(d: FinancialData) {
  const doc = new jsPDF();
  header(doc, "Cash Flow Statement", d);
  autoTable(doc, {
    startY: 40, head: [["Operating Activities", "Amount"]],
    body: [
      ["Cash received from sales", fmt(d.totalIncome)],
      ["Cash paid for expenses", `(${fmt(d.totalExpenses)})`],
      ["VAT payments", `(${fmt(d.totalVat)})`],
    ],
    foot: [["Net Operating Cash Flow", fmt(d.netProfit)]],
    theme: "striped", headStyles: { fillColor: [59, 130, 246] },
  });
  autoTable(doc, {
    head: [["Investing Activities", ""]], body: [["No investing activities recorded", ""]], theme: "striped",
  });
  autoTable(doc, {
    head: [["Financing Activities", ""]], body: [["No financing activities recorded", ""]], theme: "striped",
  });
  autoTable(doc, {
    head: [["Net Cash Change", fmt(d.netProfit)]], body: [], theme: "grid", headStyles: { fillColor: [16, 185, 129] },
  });
  doc.save(`cash-flow-${Date.now()}.pdf`);
}

export function downloadAllPdf(d: FinancialData) {
  const doc = new jsPDF();
  header(doc, "Full Financial Report", d);
  autoTable(doc, {
    startY: 40,
    head: [["Profit & Loss Summary", "Amount"]],
    body: [
      ["Total Revenue", fmt(d.totalIncome)],
      ["Total Expenses", `(${fmt(d.totalExpenses)})`],
      ["Gross Profit", fmt(d.grossProfit)],
      ["VAT (7.5%)", fmt(d.totalVat)],
      ["Net Profit", fmt(d.netProfit)],
    ],
    theme: "grid", headStyles: { fillColor: [16, 185, 129] },
  });
  doc.addPage();
  header(doc, "Balance Sheet", d);
  autoTable(doc, {
    startY: 40, head: [["Account Type", "Count"]],
    body: [
      ["Assets", String(d.assetAccounts.length)],
      ["Liabilities", String(d.liabilityAccounts.length)],
      ["Equity", String(d.equityAccounts.length)],
      ["Retained Earnings", fmt(d.netProfit)],
    ], theme: "grid",
  });
  doc.addPage();
  header(doc, "Cash Flow", d);
  autoTable(doc, {
    startY: 40, head: [["Activity", "Amount"]],
    body: [
      ["Cash from sales", fmt(d.totalIncome)],
      ["Cash for expenses", `(${fmt(d.totalExpenses)})`],
      ["VAT payments", `(${fmt(d.totalVat)})`],
      ["Net Cash Change", fmt(d.netProfit)],
    ], theme: "grid",
  });
  doc.save(`financial-report-${Date.now()}.pdf`);
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function downloadPnLCsv(d: FinancialData) {
  const rows: string[][] = [["Category", "Type", "Amount (NGN)"]];
  Object.entries(d.incomeByCategory).forEach(([c, a]) => rows.push([c, "Income", a.toFixed(2)]));
  Object.entries(d.expensesByCategory).forEach(([c, a]) => rows.push([c, "Expense", a.toFixed(2)]));
  rows.push(["Total Revenue", "Summary", d.totalIncome.toFixed(2)]);
  rows.push(["Total Expenses", "Summary", d.totalExpenses.toFixed(2)]);
  rows.push(["VAT", "Summary", d.totalVat.toFixed(2)]);
  rows.push(["Net Profit", "Summary", d.netProfit.toFixed(2)]);
  downloadCsv(`profit-loss-${Date.now()}.csv`, rows);
}

export function downloadBalanceSheetCsv(d: FinancialData) {
  const rows: string[][] = [["Code", "Name", "Type"]];
  d.assetAccounts.forEach(a => rows.push([a.code || "", a.name, "Asset"]));
  d.liabilityAccounts.forEach(a => rows.push([a.code || "", a.name, "Liability"]));
  d.equityAccounts.forEach(a => rows.push([a.code || "", a.name, "Equity"]));
  rows.push(["", "Retained Earnings", d.netProfit.toFixed(2)]);
  downloadCsv(`balance-sheet-${Date.now()}.csv`, rows);
}

export function downloadCashFlowCsv(d: FinancialData) {
  const rows: string[][] = [
    ["Activity", "Amount (NGN)"],
    ["Cash received from sales", d.totalIncome.toFixed(2)],
    ["Cash paid for expenses", `-${d.totalExpenses.toFixed(2)}`],
    ["VAT payments", `-${d.totalVat.toFixed(2)}`],
    ["Net Cash Change", d.netProfit.toFixed(2)],
  ];
  downloadCsv(`cash-flow-${Date.now()}.csv`, rows);
}
