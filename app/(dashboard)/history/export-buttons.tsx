"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportButtons({ disabled }: { disabled?: boolean }) {
  const [loading, setLoading] = useState<"csv" | "xlsx" | null>(null);

  async function exportFormat(format: "csv" | "xlsx") {
    setLoading(format);
    try {
      const res = await fetch(`/api/export/history?format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fitflow-history.${format === "csv" ? "csv" : "xlsx"}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer rounded-lg"
        onClick={() => exportFormat("csv")}
        disabled={!!loading || disabled}
      >
        <Download className="size-4" />
        {loading === "csv" ? "Exporting…" : "Export CSV"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer rounded-lg"
        onClick={() => exportFormat("xlsx")}
        disabled={!!loading || disabled}
      >
        <Download className="size-4" />
        {loading === "xlsx" ? "Exporting…" : "Export XLSX"}
      </Button>
    </div>
  );
}
