"use client";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/utils";
import type { StatusHistoryEntry } from "@/types";

interface Props {
  entries: StatusHistoryEntry[];
}

export function StatusHistoryTimeline({ entries }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          Status History
          <span className="text-muted-foreground font-normal text-sm">({entries.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No status changes recorded yet.</p>
        ) : (
          <ol className="relative border-l border-border ml-3 space-y-0">
            {entries.map((entry, idx) => (
              <li key={entry.id} className="mb-6 ml-6 last:mb-0">
                <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-border">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                </span>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={entry.old_status} />
                    <span className="text-muted-foreground text-xs">→</span>
                    <StatusBadge status={entry.new_status} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {entry.changed_by?.full_name ?? `User #${entry.changed_by_id}`}
                    </span>
                    <span>·</span>
                    <span>{formatDateTime(entry.changed_at)}</span>
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/40 rounded px-3 py-2 border border-border/60">
                      {entry.notes}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
