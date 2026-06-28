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
import { changeRequestsApi } from "@/lib/api/change-requests";
import type { ChangeRequest, ChangeRequestCreate, CRStatus, Priority, CRSource } from "@/types";

const CR_STATUSES: { value: CRStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "analysis", label: "Analysis" },
  { value: "in_progress", label: "In Progress" },
  { value: "testing", label: "Testing" },
  { value: "waiting_for_review", label: "Waiting for Review" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
  { value: "delayed", label: "Delayed" },
];

interface ChangeRequestFormProps {
  defaultValues?: ChangeRequest;
  onSuccess?: () => void;
}

export function ChangeRequestForm({ defaultValues, onSuccess }: ChangeRequestFormProps) {
  const isEdit = Boolean(defaultValues);

  const [crNumber, setCrNumber] = useState(defaultValues?.cr_number ?? "");
  const [venueName, setVenueName] = useState(defaultValues?.venue_name ?? "");
  const [product, setProduct] = useState(defaultValues?.product ?? "");
  const [requestTitle, setRequestTitle] = useState(defaultValues?.request_title ?? "");
  const [requestedBy, setRequestedBy] = useState(defaultValues?.requested_by ?? "");
  const [assignedToId, setAssignedToId] = useState<string>(
    defaultValues?.assigned_to_id != null ? String(defaultValues.assigned_to_id) : ""
  );
  const [source, setSource] = useState<CRSource>(defaultValues?.source ?? "venue_request");
  const [priority, setPriority] = useState<Priority>(defaultValues?.priority ?? "medium");
  const [status, setStatus] = useState<CRStatus>(defaultValues?.status ?? "new");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const payload: ChangeRequestCreate = {
      cr_number: crNumber.trim(),
      product: product.trim(),
      request_title: requestTitle.trim(),
      requested_by: requestedBy.trim(),
      source,
      priority,
      ...(venueName.trim() ? { venue_name: venueName.trim() } : {}),
      ...(assignedToId.trim() ? { assigned_to_id: Number(assignedToId) } : {}),
    };

    try {
      if (isEdit && defaultValues) {
        await changeRequestsApi.update(defaultValues.id, { ...payload, status });
      } else {
        await changeRequestsApi.create(payload);
      }
      onSuccess?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An error occurred. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Change Request" : "Change Request Details"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* CR Number */}
          <div className="space-y-1.5">
            <Label htmlFor="cr_number">CR Number *</Label>
            <Input
              id="cr_number"
              value={crNumber}
              onChange={(e) => setCrNumber(e.target.value)}
              placeholder="e.g. CR-2024-001"
              required
            />
          </div>

          {/* Request Title */}
          <div className="space-y-1.5">
            <Label htmlFor="request_title">Request Title *</Label>
            <Input
              id="request_title"
              value={requestTitle}
              onChange={(e) => setRequestTitle(e.target.value)}
              placeholder="Brief description of the change"
              required
            />
          </div>

          {/* Product */}
          <div className="space-y-1.5">
            <Label htmlFor="product">Product *</Label>
            <Input
              id="product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. DeliveryFlow Core"
              required
            />
          </div>

          {/* Venue Name */}
          <div className="space-y-1.5">
            <Label htmlFor="venue_name">Venue Name</Label>
            <Input
              id="venue_name"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Optional venue name"
            />
          </div>

          {/* Requested By */}
          <div className="space-y-1.5">
            <Label htmlFor="requested_by">Requested By *</Label>
            <Input
              id="requested_by"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              placeholder="Name of the requester"
              required
            />
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
              placeholder="Optional user ID"
            />
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label>Source *</Label>
            <Select value={source} onValueChange={(v) => setSource(v as CRSource)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="venue_request">Venue Request</SelectItem>
                <SelectItem value="support_team_request">Support Team Request</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label>Priority *</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status — edit mode only */}
          {isEdit && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CRStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CR_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving…" : isEdit ? "Save Changes" : "Create Change Request"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
