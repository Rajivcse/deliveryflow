"use client";
import { Input } from "@/components/ui/input";
import type { ReportFilters } from "@/lib/api/reports";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Any Status" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "delayed", label: "Delayed" },
  { value: "completed", label: "Completed" },
  { value: "new", label: "New" },
  { value: "analysis", label: "Analysis" },
  { value: "testing", label: "Testing" },
  { value: "waiting_for_review", label: "Waiting for Review" },
  { value: "planned", label: "Planned" },
  { value: "development", label: "Development" },
  { value: "deployment", label: "Deployment" },
];

interface Props {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
}

export function ReportFilters({ filters, onChange }: Props) {
  const update = (key: keyof ReportFilters, value: string) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
        <select
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={filters.status ?? ""}
          onChange={e => update("status", e.target.value)}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Venue</label>
        <Input
          placeholder="Filter by venue..."
          value={filters.venue ?? ""}
          onChange={e => update("venue", e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Product</label>
        <Input
          placeholder="Filter by product..."
          value={filters.product ?? ""}
          onChange={e => update("product", e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">From Date</label>
        <Input
          type="date"
          value={filters.date_from ?? ""}
          onChange={e => update("date_from", e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">To Date</label>
        <Input
          type="date"
          value={filters.date_to ?? ""}
          onChange={e => update("date_to", e.target.value)}
        />
      </div>
    </div>
  );
}
