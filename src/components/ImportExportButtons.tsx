import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { pickAndParseCsv } from "@/lib/csv-utils";
import { ExportMenu } from "@/components/ExportMenu";

interface ImportExportButtonsProps<T extends Record<string, any>> {
  filename: string;
  rows: T[];
  columns?: { key: keyof T; label: string }[];
  onImport?: (rows: Record<string, string>[]) => void | Promise<void>;
  disabled?: boolean;
  title?: string;
}

export function ImportExportButtons<T extends Record<string, any>>({
  filename,
  rows,
  columns,
  onImport,
  disabled,
  title,
}: ImportExportButtonsProps<T>) {
  return (
    <div className="flex gap-2">
      {onImport && (
        <Button
          variant="outline"
          size="sm"
          className="h-10 min-h-[44px]"
          disabled={disabled}
          onClick={async () => {
            const parsed = await pickAndParseCsv();
            if (parsed.length) await onImport(parsed);
          }}
        >
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
      )}
      <ExportMenu
        filename={filename}
        rows={rows}
        columns={columns}
        disabled={disabled}
        title={title}
      />
    </div>
  );
}
