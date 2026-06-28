"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { productUpdatesApi } from "@/lib/api/product-updates";
import type { ProductUpdate, ProductUpdateCreate, ProductUpdateStatus } from "@/types";

const PRODUCTS = [
  "Member Services",
  "Rewards Management",
  "Android App",
  "iOS App",
];

const STATUSES: { value: ProductUpdateStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "development", label: "Development" },
  { value: "testing", label: "Testing" },
  { value: "deployment", label: "Deployment" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
];

interface ProductUpdateFormProps {
  defaultValues?: ProductUpdate;
  onSuccess: () => void;
}

export function ProductUpdateForm({ defaultValues, onSuccess }: ProductUpdateFormProps) {
  const isEditMode = Boolean(defaultValues);

  const [updateName, setUpdateName] = useState(defaultValues?.update_name ?? "");
  const [versionNumber, setVersionNumber] = useState(defaultValues?.version_number ?? "");
  const [product, setProduct] = useState(defaultValues?.product ?? "");
  const [assignedToId, setAssignedToId] = useState(
    defaultValues?.assigned_to_id != null ? String(defaultValues.assigned_to_id) : ""
  );
  const [startDate, setStartDate] = useState(defaultValues?.start_date ?? "");
  const [plannedReleaseDate, setPlannedReleaseDate] = useState(
    defaultValues?.planned_release_date ?? ""
  );
  const [status, setStatus] = useState<ProductUpdateStatus>(
    defaultValues?.status ?? "planned"
  );
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!updateName.trim()) {
      setError("Update Name is required.");
      return;
    }
    if (!product) {
      setError("Product is required.");
      return;
    }

    const payload: ProductUpdateCreate = {
      update_name: updateName.trim(),
      ...(versionNumber.trim() ? { version_number: versionNumber.trim() } : {}),
      product,
      ...(assignedToId ? { assigned_to_id: Number(assignedToId) } : {}),
      ...(startDate ? { start_date: startDate } : {}),
      ...(plannedReleaseDate ? { planned_release_date: plannedReleaseDate } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    setIsSubmitting(true);
    try {
      if (isEditMode && defaultValues) {
        await productUpdatesApi.update(defaultValues.id, { ...payload, status });
      } else {
        await productUpdatesApi.create(payload);
      }
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? "Edit Product Update" : "New Product Update"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Update Name */}
          <div className="space-y-1.5">
            <Label htmlFor="update_name">
              Update Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="update_name"
              value={updateName}
              onChange={(e) => setUpdateName(e.target.value)}
              placeholder="e.g. Loyalty Points Overhaul v2"
              required
            />
          </div>

          {/* Version Number */}
          <div className="space-y-1.5">
            <Label htmlFor="version_number">Version Number</Label>
            <Input
              id="version_number"
              value={versionNumber}
              onChange={(e) => setVersionNumber(e.target.value)}
              placeholder="e.g. 3.4.1"
            />
          </div>

          {/* Product */}
          <div className="space-y-1.5">
            <Label>
              Product <span className="text-destructive">*</span>
            </Label>
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assigned To ID */}
          <div className="space-y-1.5">
            <Label htmlFor="assigned_to_id">Assigned To (User ID)</Label>
            <Input
              id="assigned_to_id"
              type="number"
              min={1}
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              placeholder="e.g. 4"
            />
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Planned Release Date */}
          <div className="space-y-1.5">
            <Label htmlFor="planned_release_date">Planned Release Date</Label>
            <Input
              id="planned_release_date"
              type="date"
              value={plannedReleaseDate}
              onChange={(e) => setPlannedReleaseDate(e.target.value)}
            />
          </div>

          {/* Status — edit mode only */}
          {isEditMode && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ProductUpdateStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes / Reason</Label>
            <textarea
              id="notes"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Add any notes, blockers, or context..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditMode
                  ? "Saving…"
                  : "Creating…"
                : isEditMode
                ? "Save Changes"
                : "Create Product Update"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
