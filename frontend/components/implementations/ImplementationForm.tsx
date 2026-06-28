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

const TEXT_FIELDS = [
  { name: "iwo_number", label: "IWO Number", required: true, type: "text" },
  { name: "venue_name", label: "Venue Name", required: true, type: "text" },
  { name: "product_name", label: "Product Name", required: true, type: "text" },
  { name: "assigned_to_id", label: "Assigned To (User ID)", required: false, type: "number" },
  { name: "start_date", label: "Start Date", required: false, type: "date" },
  { name: "target_date", label: "Target Date", required: false, type: "date" },
] as const;

type FormState = {
  iwo_number: string;
  venue_name: string;
  product_name: string;
  assigned_to_id: string;
  start_date: string;
  target_date: string;
  status: ImplementationStatus;
};

export function ImplementationForm({ defaultValues, id, onSuccess }: Props) {
  const [form, setForm] = useState<FormState>({
    iwo_number: defaultValues?.iwo_number ?? "",
    venue_name: defaultValues?.venue_name ?? "",
    product_name: defaultValues?.product_name ?? "",
    assigned_to_id: defaultValues?.assigned_to_id?.toString() ?? "",
    start_date: defaultValues?.start_date ?? "",
    target_date: defaultValues?.target_date ?? "",
    status: defaultValues?.status ?? "not_started",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (name: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const payload = {
        iwo_number: form.iwo_number,
        venue_name: form.venue_name,
        product_name: form.product_name,
        assigned_to_id: form.assigned_to_id ? parseInt(form.assigned_to_id, 10) : undefined,
        start_date: form.start_date || undefined,
        target_date: form.target_date || undefined,
        status: form.status,
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
          {TEXT_FIELDS.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && " *"}
              </Label>
              <Input
                id={field.name}
                type={field.type}
                value={form[field.name]}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
              />
            </div>
          ))}

          {/* Status — only shown when editing */}
          {id && (
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => handleChange("status", v)}
              >
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
