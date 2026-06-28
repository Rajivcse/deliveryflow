import { Badge } from "./badge";
import type { ImplementationStatus, CRStatus, ProductUpdateStatus } from "@/types";

type AnyStatus = ImplementationStatus | CRStatus | ProductUpdateStatus;

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  waiting_for_venue: "Waiting for Venue",
  waiting_for_internal_team: "Waiting – Internal",
  blocked: "Blocked",
  completed: "Completed",
  new: "New",
  analysis: "Analysis",
  testing: "Testing",
  waiting_for_review: "Waiting for Review",
  delayed: "Delayed",
  planned: "Planned",
  development: "Development",
  deployment: "Deployment",
};

const STATUS_VARIANT: Record<string, string> = {
  blocked: "blocked",
  delayed: "delayed",
  completed: "completed",
  in_progress: "in_progress",
  waiting_for_venue: "waiting",
  waiting_for_internal_team: "waiting",
  waiting_for_review: "waiting",
  not_started: "not_started",
  new: "secondary",
  planned: "planned",
};

export function StatusBadge({ status, className }: { status: AnyStatus | string; className?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variant = (STATUS_VARIANT[status] || "default") as any;
  return <Badge variant={variant} className={className}>{STATUS_LABELS[status] || status}</Badge>;
}
