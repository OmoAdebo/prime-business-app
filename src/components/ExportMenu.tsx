import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, FileType2 } from "lucide-react";
import { exportToCsv } from "@/lib/csv-utils";
import { toast } from "sonner";

export interface ExportColumn<T> { key: keyof T; label: string }

interface ExportMenuProps<T extends Record<string, any>> {
  filename: string;
  rows: T[];
  columns?: ExportColumn<T>[];
  title?: string;
  disabled?: boolean;
  size?: "default" | "sm" | "icon";
}

export function ExportMenu<T extends Record<string, any>>({
  filename,
  rows,
  columns,
  title,
  disabled,
  size = "sm",
}: ExportMenuProps<T>) {
  const cols: ExportColumn<T>[] =
    columns ?? (rows[0] ? Object.keys(rows[0]).map((k) => ({ key: k as keyof T, label: k })) : []);

  const doExcel = async () => {
    if (!rows.length) return toast.error("No data to export");
    const XLSX = await import("xlsx");
    const data = rows.map((r) => {
      const obj: Record<string, any> = {};
      cols.forEach((c) => (obj[c.label] = r[c.key] ?? ""));
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${filename}-${Date.now()}.xlsx`);
    toast.success(`Exported ${rows.length} rows`);
  };

  const doPdf = async () => {
    if (!rows.length) return toast.error("No data to export");
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(title || filename, 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [cols.map((c) => String(c.label))],
      body: rows.map((r) =>
        cols.map((c) => {
          const v = r[c.key];
          return v === null || v === undefined ? "" : String(v);
        })
      ),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 122, 87] },
    });
    doc.save(`${filename}-${Date.now()}.pdf`);
    toast.success(`Exported ${rows.length} rows`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className="h-10 min-h-[44px]"
          disabled={disabled || !rows.length}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportToCsv(filename, rows, cols)}>
          <FileText className="h-4 w-4 mr-2" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={doExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={doPdf}>
          <FileType2 className="h-4 w-4 mr-2" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
