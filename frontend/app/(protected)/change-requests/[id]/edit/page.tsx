"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChangeRequestForm } from "@/components/change-requests/ChangeRequestForm";
import { changeRequestsApi } from "@/lib/api/change-requests";
import type { ChangeRequest } from "@/types";

export default function EditChangeRequestPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [cr, setCr] = useState<ChangeRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await changeRequestsApi.get(id);
        setCr(data);
      } catch {
        setError("Failed to load change request.");
      } finally {
        setIsLoading(false);
      }
    };
    if (!isNaN(id)) fetch();
  }, [id]);

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
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Change Request</h1>
        <p className="text-muted-foreground mt-1">{cr.cr_number} — {cr.request_title}</p>
      </div>
      <ChangeRequestForm
        defaultValues={cr}
        onSuccess={() => router.push(`/change-requests/${id}`)}
      />
    </div>
  );
}
