"use client";
import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SearchParams } from "@/lib/api/search";

const ITEM_TYPES = [
  { value: "", label: "All Types" },
  { value: "implementation", label: "Implementations" },
  { value: "change_request", label: "Change Requests" },
  { value: "product_update", label: "Product Updates" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Any Status" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "delayed", label: "Delayed" },
  { value: "completed", label: "Completed" },
];

interface Props {
  params: SearchParams;
  onSearch: (params: SearchParams) => void;
  isLoading?: boolean;
}

export function FilterPanel({ params, onSearch, isLoading }: Props) {
  const [local, setLocal] = useState<SearchParams>(params);

  const handleChange = (key: keyof SearchParams, value: string) => {
    setLocal(prev => ({ ...prev, [key]: value || undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(local);
  };

  const handleReset = () => {
    const reset: SearchParams = {};
    setLocal(reset);
    onSearch(reset);
  };

  const hasFilters = Object.values(local).some(v => v !== undefined && v !== "");

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border rounded-xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm text-gray-900">Search & Filter</span>
      </div>

      {/* Query */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by title, IWO, CR number, venue..."
          value={local.q ?? ""}
          onChange={e => handleChange("q", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={local.type ?? ""}
            onChange={e => handleChange("type", e.target.value)}
          >
            {ITEM_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={local.status ?? ""}
            onChange={e => handleChange("status", e.target.value)}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Venue */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Venue</label>
          <Input
            placeholder="Filter by venue..."
            value={local.venue ?? ""}
            onChange={e => handleChange("venue", e.target.value)}
          />
        </div>

        {/* Product */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Product</label>
          <Input
            placeholder="Filter by product..."
            value={local.product ?? ""}
            onChange={e => handleChange("product", e.target.value)}
          />
        </div>

        {/* Date From */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">From Date</label>
          <Input
            type="date"
            value={local.date_from ?? ""}
            onChange={e => handleChange("date_from", e.target.value)}
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">To Date</label>
          <Input
            type="date"
            value={local.date_to ?? ""}
            onChange={e => handleChange("date_to", e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Searching..." : "Search"}
        </Button>
        {hasFilters && (
          <Button type="button" variant="outline" onClick={handleReset}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
