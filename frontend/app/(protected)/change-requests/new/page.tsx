"use client";
import { useRouter } from "next/navigation";
import { ChangeRequestForm } from "@/components/change-requests/ChangeRequestForm";

export default function NewChangeRequestPage() {
  const router = useRouter();
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Change Request</h1>
        <p className="text-muted-foreground mt-1">Create a new change request tracking record</p>
      </div>
      <ChangeRequestForm onSuccess={() => router.push("/change-requests")} />
    </div>
  );
}
