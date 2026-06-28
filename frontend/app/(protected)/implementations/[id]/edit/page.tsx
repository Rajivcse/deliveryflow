"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ImplementationForm } from "@/components/implementations/ImplementationForm";
import type { VenueImplementation } from "@/types";
import { implementationsApi } from "@/lib/api/implementations";

export default function EditImplementationPage() {
  const { id } = useParams<{ id: string }>();
  const numericId = Number(id);
  const router = useRouter();

  const [implementation, setImplementation] = useState<VenueImplementation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await implementationsApi.get(numericId);
        setImplementation(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [numericId]);

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
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Implementation</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">{implementation.iwo_number}</p>
      </div>
      <ImplementationForm
        id={numericId}
        defaultValues={implementation}
        onSuccess={() => router.push(`/implementations/${numericId}`)}
      />
    </div>
  );
}
