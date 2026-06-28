"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { implementationsApi } from "@/lib/api/implementations";
import { formatDate } from "@/lib/utils";
import type { VenueImplementation, PaginatedResponse } from "@/types";

const IMPLEMENTATION_STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_for_venue", label: "Waiting for Venue" },
  { value: "waiting_for_internal_team", label: "Waiting – Internal" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
];

export default function ImplementationsPage() {
  const [data, setData] = useState<PaginatedResponse<VenueImplementation> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", venue: "", q: "" });
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, per_page: 20 };
      if (filters.status && filters.status !== "all") params.status = filters.status;
      if (filters.venue) params.venue = filters.venue;
      if (filters.q) params.q = filters.q;
      const result = await implementationsApi.list(params);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = [
    {
      key: "iwo_number",
      header: "IWO Number",
      cell: (row: VenueImplementation) => (
        <div className="flex items-center gap-2">
          {row.attention_required && (
            <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
          )}
          <span className="font-mono text-sm font-medium">{row.iwo_number}</span>
        </div>
      ),
    },
    {
      key: "venue_name",
      header: "Venue Name",
      cell: (row: VenueImplementation) => row.venue_name,
    },
    {
      key: "product_name",
      header: "Product",
      cell: (row: VenueImplementation) => (
        <span className="text-muted-foreground">{row.product_name}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: VenueImplementation) => <StatusBadge status={row.status} />,
    },
    {
      key: "assigned_to",
      header: "Assigned To",
      cell: (row: VenueImplementation) =>
        row.assigned_to ? row.assigned_to.full_name : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "target_date",
      header: "Target Date",
      cell: (row: VenueImplementation) => formatDate(row.target_date),
    },
    {
      key: "last_updated",
      header: "Last Updated",
      cell: (row: VenueImplementation) => formatDate(row.last_updated_at),
    },
    {
      key: "actions",
      header: "",
      cell: (row: VenueImplementation) => (
        <div className="flex gap-2">
          <Link href={`/implementations/${row.id}`}>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </Link>
          <Link href={`/implementations/${row.id}/edit`}>
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Venue Implementations</h1>
          <p className="text-muted-foreground mt-1">Track new venue onboarding projects</p>
        </div>
        <Link href="/implementations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Implementation
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select
          value={filters.status || "all"}
          onValueChange={(v) => {
            setFilters((f) => ({ ...f, status: v }));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMPLEMENTATION_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Filter by venue..."
          className="w-48"
          value={filters.venue}
          onChange={(e) => {
            setFilters((f) => ({ ...f, venue: e.target.value }));
            setPage(1);
          }}
        />
        <Input
          placeholder="Search..."
          className="w-48"
          value={filters.q}
          onChange={(e) => {
            setFilters((f) => ({ ...f, q: e.target.value }));
            setPage(1);
          }}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No implementations found"
      />

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
