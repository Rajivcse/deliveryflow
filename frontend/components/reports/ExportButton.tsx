"use client";
import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportsApi, type ReportModule, type ExportFormat, type ReportFilters } from "@/lib/api/reports";

interface Props {
  module: ReportModule;
  filters: ReportFilters;
  disabled?: boolean;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportButton({ module, filters, disabled }: Props) {
  const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setLoadingFormat(format);
    try {
      const blob = await reportsApi.export(module, format, filters);
      const ext = format === "xlsx" ? "xlsx" : "csv";
      const name = `${module}-report-${new Date().toISOString().slice(0, 10)}.${ext}`;
      downloadBlob(blob, name);
    } catch {
      // silently fail — user will see no download
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || loadingFormat !== null}
        onClick={() => handleExport("xlsx")}
        className="flex items-center gap-1.5"
      >
        {loadingFormat === "xlsx" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
        )}
        Export Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || loadingFormat !== null}
        onClick={() => handleExport("csv")}
        className="flex items-center gap-1.5"
      >
        {loadingFormat === "csv" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4 text-blue-600" />
        )}
        Export CSV
      </Button>
    </div>
  );
}
