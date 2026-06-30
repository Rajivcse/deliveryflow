"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusHistoryTimeline } from "@/components/ui/status-history-timeline";
import { changeRequestsApi } from "@/lib/api/change-requests";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { ChangeRequest, CRStatus, Comment, StatusHistoryEntry } from "@/types";

const SOURCE_LABELS: Record<string, string> = {
  venue_request: "Venue Request",
  support_team_request: "Support Team Request",
};

const STATUSES: { value: CRStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "analysis", label: "Analysis" },
  { value: "in_progress", label: "In Progress" },
  { value: "testing", label: "Testing" },
  { value: "waiting_for_review", label: "Waiting for Review" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
  { value: "delayed", label: "Delayed" },
];

export default function ChangeRequestDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [cr, setCr] = useState<ChangeRequest | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commentBody, setCommentBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Status update panel
  const [newStatus, setNewStatus] = useState<CRStatus | "">("");
  const [statusNotes, setStatusNotes] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [crData, commentsData, historyData] = await Promise.all([
          changeRequestsApi.get(id),
          changeRequestsApi.getComments(id),
          changeRequestsApi.getStatusHistory(id),
        ]);
        setCr(crData);
        setComments(commentsData);
        setStatusHistory(historyData);
        setNewStatus(crData.status);
        setStatusNotes(crData.notes ?? "");
      } catch {
        setError("Failed to load change request.");
      } finally {
        setIsLoading(false);
      }
    };
    if (!isNaN(id)) load();
  }, [id]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return;
    setIsUpdatingStatus(true);
    setStatusError("");
    setStatusSuccess(false);
    try {
      const updated = await changeRequestsApi.updateStatus(id, newStatus, statusNotes.trim() || undefined);
      setCr(updated);
      setStatusNotes(updated.notes ?? "");
      const updatedHistory = await changeRequestsApi.getStatusHistory(id);
      setStatusHistory(updatedHistory);
      setStatusSuccess(true);
      setTimeout(() => setStatusSuccess(false), 3000);
    } catch {
      setStatusError("Failed to update status. Please try again.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentBody.trim()) return;
    setCommentError(null);
    setIsSubmitting(true);
    try {
      const newComment = await changeRequestsApi.addComment(id, commentBody.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentBody("");
    } catch {
      setCommentError("Failed to add comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !cr) {
    return (
      <div className="text-destructive py-8 text-sm">
        {error ?? "Change request not found."}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold text-muted-foreground">
              {cr.cr_number}
            </span>
            <StatusBadge status={cr.status} />
            <PriorityBadge priority={cr.priority} />
          </div>
          <h1 className="text-2xl font-bold">{cr.request_title}</h1>
        </div>
        <Link href={`/change-requests/${id}/edit`}>
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </Link>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground font-medium">Product</dt>
              <dd className="mt-0.5">{cr.product}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Venue</dt>
              <dd className="mt-0.5">{cr.venue_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Requested By</dt>
              <dd className="mt-0.5">{cr.requested_by}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Assigned To</dt>
              <dd className="mt-0.5">{cr.assigned_to?.full_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Source</dt>
              <dd className="mt-0.5">{SOURCE_LABELS[cr.source] ?? cr.source}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Created By</dt>
              <dd className="mt-0.5">{cr.created_by?.full_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Created At</dt>
              <dd className="mt-0.5">{formatDate(cr.created_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Last Updated</dt>
              <dd className="mt-0.5">{formatDateTime(cr.last_updated_at)}</dd>
            </div>
          </dl>
          {cr.notes && (
            <div className="mt-4 pt-4 border-t border-border">
              <dt className="text-muted-foreground font-medium text-sm mb-1">Notes / Reason</dt>
              <dd className="text-sm whitespace-pre-wrap">{cr.notes}</dd>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Update Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleStatusUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">New Status</label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as CRStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Notes / Reason
                <span className="text-muted-foreground font-normal ml-1">(optional — required if blocked)</span>
              </label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder="Describe the current situation, blockers, or reason for status change..."
                rows={3}
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
            {statusError && <p className="text-destructive text-sm">{statusError}</p>}
            {statusSuccess && (
              <p className="text-green-600 text-sm font-medium">Status updated successfully.</p>
            )}
            <Button type="submit" disabled={isUpdatingStatus || !newStatus}>
              {isUpdatingStatus ? "Updating..." : "Update Status"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Status History */}
      <StatusHistoryTimeline entries={statusHistory} />

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comments ({comments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-md border border-border bg-muted/30 px-4 py-3 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {comment.author?.full_name ?? "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(comment.created_at)}
                </span>
              </div>
              <p className="text-sm">{comment.body}</p>
            </div>
          ))}

          {/* Add Comment */}
          <div className="pt-2 space-y-2">
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="Add a comment…"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />
            {commentError && (
              <p className="text-xs text-destructive">{commentError}</p>
            )}
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={isSubmitting || !commentBody.trim()}
            >
              {isSubmitting ? "Posting…" : "Add Comment"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Link
        href="/change-requests"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to Change Requests
      </Link>
    </div>
  );
}
