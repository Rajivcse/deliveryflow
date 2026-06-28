"use client";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { changeRequestsApi } from "@/lib/api/change-requests";
import type { CRStatus } from "@/types";

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

interface Props {
  id: number;
  currentStatus: CRStatus;
  onUpdate?: (newStatus: CRStatus) => void;
}

export function CRQuickStatusUpdate({ id, currentStatus, onUpdate }: Props) {
  const [status, setStatus] = useState<CRStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await changeRequestsApi.updateStatus(id, newStatus);
      setStatus(newStatus as CRStatus);
      onUpdate?.(newStatus as CRStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Select value={status} onValueChange={handleChange} disabled={isUpdating}>
      <SelectTrigger className="h-8 w-44 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CR_STATUSES.map((s) => (
          <SelectItem key={s.value} value={s.value} className="text-xs">
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
