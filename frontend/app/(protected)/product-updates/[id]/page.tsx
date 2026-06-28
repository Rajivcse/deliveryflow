"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApproachingReleaseBanner } from "@/components/product-updates/ApproachingReleaseBanner";
import { productUpdatesApi } from "@/lib/api/product-updates";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { ProductUpdate, Comment } from "@/types";

export default function ProductUpdateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const numericId = Number(id);

  const [update, setUpdate] = useState<ProductUpdate | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentBody, setCommentBody] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [pu, cmts] = await Promise.all([
          productUpdatesApi.get(numericId),
          productUpdatesApi.getComments(numericId),
        ]);
        setUpdate(pu);
        setComments(cmts);
      } catch {
        setError("Failed to load product update.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [numericId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setIsPosting(true);
    try {
      const newComment = await productUpdatesApi.addComment(numericId, commentBody.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentBody("");
    } catch {
      setError("Failed to add comment.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product update?")) return;
    setIsDeleting(true);
    try {
      await productUpdatesApi.delete(numericId);
      router.push("/product-updates");
    } catch {
      setError("Failed to delete product update.");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!update) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {error ?? "Product update not found."}
      </div>
    );
  }

  const showBanner =
    update.approaching_release &&
    update.status !== "completed" &&
    update.planned_release_date != null;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Approaching Release Banner */}
      {showBanner && (
        <ApproachingReleaseBanner
          plannedReleaseDate={update.planned_release_date!}
          productName={update.product}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{update.update_name}</h1>
          {update.version_number && (
            <p className="text-muted-foreground font-mono mt-0.5">v{update.version_number}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/product-updates/${update.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>

      {/* Detail Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground font-medium">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={update.status} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Product</dt>
              <dd className="mt-1">{update.product}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Assigned To</dt>
              <dd className="mt-1">
                {update.assigned_to ? update.assigned_to.full_name : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Created By</dt>
              <dd className="mt-1">
                {update.created_by ? update.created_by.full_name : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Start Date</dt>
              <dd className="mt-1">{formatDate(update.start_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Planned Release</dt>
              <dd className="mt-1">{formatDate(update.planned_release_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Created At</dt>
              <dd className="mt-1">{formatDateTime(update.created_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Last Updated</dt>
              <dd className="mt-1">{formatDateTime(update.last_updated_at)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments
            {comments.length > 0 && (
              <span className="text-muted-foreground font-normal text-sm">
                ({comments.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No comments yet.</p>
          ) : (
            <ul className="space-y-4">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground uppercase">
                    {c.author?.full_name?.[0] ?? "?"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {c.author?.full_name ?? "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(c.created_at)}
                      </span>
                    </div>
                    <p className="text-sm mt-0.5">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Add comment form */}
          <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
            <Input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={isPosting || !commentBody.trim()}>
              <Send className="h-4 w-4 mr-1.5" />
              {isPosting ? "Posting…" : "Post"}
            </Button>
          </form>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
