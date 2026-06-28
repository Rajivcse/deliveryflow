"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductUpdateForm } from "@/components/product-updates/ProductUpdateForm";
import { productUpdatesApi } from "@/lib/api/product-updates";
import type { ProductUpdate } from "@/types";

export default function EditProductUpdatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const numericId = Number(id);

  const [update, setUpdate] = useState<ProductUpdate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await productUpdatesApi.get(numericId);
        setUpdate(data);
      } catch {
        setError("Failed to load product update.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [numericId]);

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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Product Update</h1>
        <p className="text-muted-foreground mt-1">{update.update_name}</p>
      </div>
      <ProductUpdateForm
        defaultValues={update}
        onSuccess={() => router.push(`/product-updates/${numericId}`)}
      />
    </div>
  );
}
