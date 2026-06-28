"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { changeRequestsApi } from "@/lib/api/change-requests";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { ChangeRequest, Comment } from "@/types";

const SOURCE_LABELS: Record<string, string> = {
  venue_request: "Venue Request",
  support_team_request: "Support Team Request",
};

export default function ChangeRequestDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [cr, setCr] = useState<ChangeRequest | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commentBody, setCommentBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [crData, commentsData] = await Promise.all([
          changeRequestsApi.get(id),
          changeRequestsApi.getComments(id),
        ]);
        setCr(crData);
        setComments(commentsData);
      } catch {
        setError("Failed to load change request.");
      } finally {
        setIsLoading(false);
      }
    };
    if (!isNaN(id)) load();
  }, [id]);

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
        </CardContent>
      </Card>

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

      {/* Back link */}
      <Link
        href="/change-requests"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to Change Requests
      </Link>
    </div>
  );
}
