"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { implementationsApi } from "@/lib/api/implementations";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { VenueImplementation, ImplementationStatus, Comment } from "@/types";

const STATUSES: { value: ImplementationStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_for_venue", label: "Waiting for Venue" },
  { value: "waiting_for_internal_team", label: "Waiting – Internal" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
];

export default function ImplementationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const numericId = Number(id);

  const [implementation, setImplementation] = useState<VenueImplementation | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentBody, setCommentBody] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  // Status update panel state
  const [newStatus, setNewStatus] = useState<ImplementationStatus | "">("");
  const [statusNotes, setStatusNotes] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [impl, cmts] = await Promise.all([
          implementationsApi.get(numericId),
          implementationsApi.getComments(numericId),
        ]);
        setImplementation(impl);
        setComments(cmts);
        setNewStatus(impl.status);
        setStatusNotes(impl.notes ?? "");
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [numericId]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return;
    setIsUpdatingStatus(true);
    setStatusError("");
    setStatusSuccess(false);
    try {
      const updated = await implementationsApi.updateStatus(
        numericId,
        newStatus,
        statusNotes.trim() || undefined
      );
      setImplementation(updated);
      setStatusNotes(updated.notes ?? "");
      setStatusSuccess(true);
      setTimeout(() => setStatusSuccess(false), 3000);
    } catch {
      setStatusError("Failed to update status. Please try again.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setIsSubmittingComment(true);
    setCommentError("");
    try {
      const newComment = await implementationsApi.addComment(numericId, commentBody.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentBody("");
    } catch {
      setCommentError("Failed to post comment. Please try again.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!implementation) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Implementation not found.
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">{implementation.iwo_number}</h1>
          <p className="text-muted-foreground mt-1">{implementation.venue_name}</p>
        </div>
        <Link href={`/implementations/${numericId}/edit`}>
          <Button variant="outline">Edit</Button>
        </Link>
      </div>

      {/* Attention warning */}
      {implementation.attention_required && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-orange-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">This implementation requires attention.</span>
        </div>
      )}

      {/* Details card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <p className="text-muted-foreground font-medium mb-0.5">IWO Number</p>
              <p className="font-mono font-semibold">{implementation.iwo_number}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-0.5">Status</p>
              <StatusBadge status={implementation.status} />
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-0.5">Venue Name</p>
              <p>{implementation.venue_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-0.5">Product</p>
              <p>{implementation.product_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-0.5">Assigned To</p>
              <p>{implementation.assigned_to?.full_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-0.5">Created By</p>
              <p>{implementation.created_by?.full_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-0.5">Start Date</p>
              <p>{formatDate(implementation.start_date)}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-0.5">Target Date</p>
              <p>{formatDate(implementation.target_date)}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-0.5">Last Updated</p>
              <p>{formatDateTime(implementation.last_updated_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium mb-0.5">Created At</p>
              <p>{formatDateTime(implementation.created_at)}</p>
            </div>
          </div>
          {implementation.notes && (
            <div className="pt-2 border-t border-border">
              <p className="text-muted-foreground font-medium text-sm mb-1">Notes / Reason</p>
              <p className="text-sm whitespace-pre-wrap">{implementation.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Status panel */}
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
              <Select
                value={newStatus}
                onValueChange={(v) => setNewStatus(v as ImplementationStatus)}
              >
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

      {/* Comments section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments
            <span className="text-muted-foreground font-normal text-sm">({comments.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
          )}
          {comments.map((comment, idx) => (
            <div key={comment.id}>
              {idx > 0 && <Separator className="mb-4" />}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {comment.author?.full_name ?? `User #${comment.author_id}`}
                  </span>
                  <span>·</span>
                  <span>{formatDateTime(comment.created_at)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
              </div>
            </div>
          ))}

          <Separator />

          {/* Add comment form */}
          <form onSubmit={handleAddComment} className="space-y-3">
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Add a comment..."
              rows={3}
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />
            {commentError && <p className="text-destructive text-sm">{commentError}</p>}
            <Button type="submit" size="sm" disabled={isSubmittingComment || !commentBody.trim()}>
              {isSubmittingComment ? "Posting..." : "Post Comment"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
