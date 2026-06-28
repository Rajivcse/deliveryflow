"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, AlertTriangle } from "lucide-react";
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
import { productUpdatesApi } from "@/lib/api/product-updates";
import { formatDate, cn } from "@/lib/utils";
import type { ProductUpdate, PaginatedResponse } from "@/types";

const PRODUCT_UPDATE_STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "planned", label: "Planned" },
  { value: "development", label: "Development" },
  { value: "testing", label: "Testing" },
  { value: "deployment", label: "Deployment" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
];

const PRODUCTS = [
  { value: "all", label: "All Products" },
  { value: "Member Services", label: "Member Services" },
  { value: "Rewards Management", label: "Rewards Management" },
  { value: "Android App", label: "Android App" },
  { value: "iOS App", label: "iOS App" },
];

const PER_PAGE = 20;

export default function ProductUpdatesPage() {
  const [data, setData] = useState<PaginatedResponse<ProductUpdate> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", product: "", q: "" });
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, per_page: PER_PAGE };
      if (filters.status && filters.status !== "all") params.status = filters.status;
      if (filters.product && filters.product !== "all") params.product = filters.product;
      if (filters.q) params.q = filters.q;
      const result = await productUpdatesApi.list(params);
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
      key: "update_name",
      header: "Update Name",
      cell: (row: ProductUpdate) => (
        <div className="flex items-center gap-2">
          {row.approaching_release && row.status !== "completed" && (
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          )}
          <span className="font-medium">{row.update_name}</span>
        </div>
      ),
    },
    {
      key: "version_number",
      header: "Version",
      cell: (row: ProductUpdate) =>
        row.version_number ? (
          <span className="font-mono text-sm">{row.version_number}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "product",
      header: "Product",
      cell: (row: ProductUpdate) => (
        <span className="text-muted-foreground">{row.product}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: ProductUpdate) => <StatusBadge status={row.status} />,
    },
    {
      key: "planned_release_date",
      header: "Planned Release",
      cell: (row: ProductUpdate) => (
        <span
          className={cn(
            row.approaching_release && row.status !== "completed"
              ? "text-amber-700 font-medium"
              : ""
          )}
        >
          {formatDate(row.planned_release_date)}
        </span>
      ),
    },
    {
      key: "assigned_to",
      header: "Assigned To",
      cell: (row: ProductUpdate) =>
        row.assigned_to ? (
          row.assigned_to.full_name
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "last_updated_at",
      header: "Last Updated",
      cell: (row: ProductUpdate) => formatDate(row.last_updated_at),
    },
    {
      key: "actions",
      header: "",
      cell: (row: ProductUpdate) => (
        <div className="flex gap-2">
          <Link href={`/product-updates/${row.id}`}>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </Link>
          <Link href={`/product-updates/${row.id}/edit`}>
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  // Custom render: rows with approaching_release get amber left border
  const renderRow = (row: ProductUpdate, cells: React.ReactNode) =>
    row.approaching_release && row.status !== "completed" ? (
      <tr
        key={row.id}
        className="hover:bg-muted/30 transition-colors border-l-4 border-l-amber-400"
      >
        {cells}
      </tr>
    ) : null; // returning null means DataTable uses its default row rendering

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Updates</h1>
          <p className="text-muted-foreground mt-1">Track software product update rollouts</p>
        </div>
        <Link href="/product-updates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Product Update
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
            {PRODUCT_UPDATE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.product || "all"}
          onValueChange={(v) => {
            setFilters((f) => ({ ...f, product: v }));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCTS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

      {/* Table — amber left-border rows injected via wrapper */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 font-medium text-muted-foreground"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-8 text-muted-foreground"
                >
                  No product updates found
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "hover:bg-muted/30 transition-colors",
                    row.approaching_release && row.status !== "completed"
                      ? "border-l-4 border-l-amber-400"
                      : ""
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, data.total)} of{" "}
            {data.total}
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
