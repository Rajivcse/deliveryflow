"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
import { PriorityBadge } from "@/components/ui/priority-badge";
import { CRQuickStatusUpdate } from "@/components/change-requests/QuickStatusUpdate";
import { changeRequestsApi, type ChangeRequestFilters } from "@/lib/api/change-requests";
import { formatDateTime } from "@/lib/utils";
import type { ChangeRequest, CRStatus, Priority } from "@/types";

const CR_STATUS_OPTIONS: { value: CRStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "analysis", label: "Analysis" },
  { value: "in_progress", label: "In Progress" },
  { value: "testing", label: "Testing" },
  { value: "waiting_for_review", label: "Waiting for Review" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
  { value: "delayed", label: "Delayed" },
];

const PRIORITY_OPTIONS: { value: Priority | "all"; label: string }[] = [
  { value: "all", label: "All Priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function ChangeRequestsPage() {
  const [items, setItems] = useState<ChangeRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<CRStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [productFilter, setProductFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const perPage = 20;

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: ChangeRequestFilters = {
        page,
        per_page: perPage,
      };
      if (statusFilter !== "all") filters.status = statusFilter;
      if (priorityFilter !== "all") filters.priority = priorityFilter;
      if (productFilter.trim()) filters.product = productFilter.trim();
      if (searchQuery.trim()) filters.q = searchQuery.trim();

      const result = await changeRequestsApi.list(filters);
      setItems(result.items);
      setTotal(result.total);
      setPages(result.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, priorityFilter, productFilter, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, productFilter, searchQuery]);

  const handleStatusUpdate = (id: number, newStatus: CRStatus) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const columns = [
    {
      key: "cr_number",
      header: "CR Number",
      cell: (row: ChangeRequest) => (
        <Link
          href={`/change-requests/${row.id}`}
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          {row.cr_number}
        </Link>
      ),
    },
    {
      key: "request_title",
      header: "Title",
      cell: (row: ChangeRequest) => (
        <div className={`flex items-center gap-2 ${row.priority === "high" ? "border-l-2 border-red-500 pl-2" : ""}`}>
          <span className="text-sm font-medium">{row.request_title}</span>
        </div>
      ),
    },
    {
      key: "product",
      header: "Product",
      cell: (row: ChangeRequest) => <span className="text-sm">{row.product}</span>,
    },
    {
      key: "priority",
      header: "Priority",
      cell: (row: ChangeRequest) => <PriorityBadge priority={row.priority} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: ChangeRequest) => <StatusBadge status={row.status} />,
    },
    {
      key: "requested_by",
      header: "Requested By",
      cell: (row: ChangeRequest) => <span className="text-sm">{row.requested_by}</span>,
    },
    {
      key: "assigned_to",
      header: "Assigned To",
      cell: (row: ChangeRequest) => (
        <span className="text-sm text-muted-foreground">
          {row.assigned_to?.full_name ?? "—"}
        </span>
      ),
    },
    {
      key: "last_updated_at",
      header: "Last Updated",
      cell: (row: ChangeRequest) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(row.last_updated_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "Quick Status",
      cell: (row: ChangeRequest) => (
        <div className="flex items-center gap-2">
          <CRQuickStatusUpdate
            id={row.id}
            currentStatus={row.status}
            onUpdate={(s) => handleStatusUpdate(row.id, s)}
          />
          <Link href={`/change-requests/${row.id}/edit`}>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
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
          <h1 className="text-2xl font-bold">Change Requests</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {total} total record{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/change-requests/new">
          <Button>New Change Request</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as CRStatus | "all")}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {CR_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter}
          onValueChange={(v) => setPriorityFilter(v as Priority | "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          className="w-44"
          placeholder="Filter by product…"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
        />

        <Input
          className="w-56"
          placeholder="Search…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        emptyMessage="No change requests found."
      />

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
