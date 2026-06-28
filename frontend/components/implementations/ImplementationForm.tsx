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
import { Card, CardContent } from "@/components/ui/card";
import { implementationsApi } from "@/lib/api/implementations";
import type { VenueImplementation, ImplementationStatus } from "@/types";
import { X, Plus } from "lucide-react";

interface Props {
  defaultValues?: Partial<VenueImplementation>;
  id?: number;
  onSuccess: () => void;
}

const STATUSES: { value: ImplementationStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_for_venue", label: "Waiting for Venue" },
  { value: "waiting_for_internal_team", label: "Waiting – Internal" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
];

type FormState = {
  iwo_number: string;
  venue_name: string;
  assigned_to_id: string;
  start_date: string;
  target_date: string;
  status: ImplementationStatus;
  notes: string;
};

export function ImplementationForm({ defaultValues, id, onSuccess }: Props) {
  const [form, setForm] = useState<FormState>({
    iwo_number: defaultValues?.iwo_number ?? "",
    venue_name: defaultValues?.venue_name ?? "",
    assigned_to_id: defaultValues?.assigned_to_id?.toString() ?? "",
    start_date: defaultValues?.start_date ?? "",
    target_date: defaultValues?.target_date ?? "",
    status: defaultValues?.status ?? "not_started",
    notes: defaultValues?.notes ?? "",
  });

  const [products, setProducts] = useState<string[]>(
    defaultValues?.product_name
      ? defaultValues.product_name.split(",").map((p) => p.trim()).filter(Boolean)
      : [""]
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (name: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [name]: value }));
  };

  const addProduct = () => setProducts((p) => [...p, ""]);
  const removeProduct = (i: number) => setProducts((p) => p.filter((_, idx) => idx !== i));
  const updateProduct = (i: number, val: string) =>
    setProducts((p) => p.map((v, idx) => (idx === i ? val : v)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const productName = products.filter(Boolean).join(", ");
      const payload = {
        iwo_number: form.iwo_number,
        venue_name: form.venue_name,
        product_name: productName,
        assigned_to_id: form.assigned_to_id ? parseInt(form.assigned_to_id, 10) : undefined,
        start_date: form.start_date || undefined,
        target_date: form.target_date || undefined,
        status: form.status,
        notes: form.notes.trim() || undefined,
      };
      if (id) {
        await implementationsApi.update(id, payload);
      } else {
        await implementationsApi.create(payload);
      }
      onSuccess();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message ?? "Failed to save. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="iwo_number">IWO Number *</Label>
            <Input
              id="iwo_number"
              value={form.iwo_number}
              onChange={(e) => handleChange("iwo_number", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="venue_name">Venue Name *</Label>
            <Input
              id="venue_name"
              value={form.venue_name}
              onChange={(e) => handleChange("venue_name", e.target.value)}
              required
            />
          </div>

          {/* Multi-product input */}
          <div className="space-y-1.5">
            <Label>Product Name(s) *</Label>
            <div className="space-y-2">
              {products.map((product, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={product}
                    onChange={(e) => updateProduct(i, e.target.value)}
                    placeholder={`Product ${i + 1}`}
                    required={i === 0}
                  />
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProduct(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addProduct}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add another product
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assigned_to_id">Assigned To (User ID)</Label>
            <Input
              id="assigned_to_id"
              type="number"
              value={form.assigned_to_id}
              onChange={(e) => handleChange("assigned_to_id", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              value={form.start_date}
              onChange={(e) => handleChange("start_date", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="target_date">Target Date</Label>
            <Input
              id="target_date"
              type="date"
              value={form.target_date}
              onChange={(e) => handleChange("target_date", e.target.value)}
            />
          </div>

          {id && (
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger id="status">
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

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes / Reason</Label>
            <textarea
              id="notes"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Add any notes, blockers, or context..."
              rows={3}
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : id ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
