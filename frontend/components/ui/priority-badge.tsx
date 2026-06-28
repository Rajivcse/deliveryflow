import { Badge } from "./badge";
import type { Priority } from "@/types";

const PRIORITY_VARIANT: Record<Priority, string> = {
  high: "blocked",
  medium: "attention",
  low: "secondary",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Badge variant={PRIORITY_VARIANT[priority] as any}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
}
