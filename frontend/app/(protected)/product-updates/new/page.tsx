"use client";
import { useRouter } from "next/navigation";
import { ProductUpdateForm } from "@/components/product-updates/ProductUpdateForm";

export default function NewProductUpdatePage() {
  const router = useRouter();
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Product Update</h1>
        <p className="text-muted-foreground mt-1">Track a software product update rollout</p>
      </div>
      <ProductUpdateForm onSuccess={() => router.push("/product-updates")} />
    </div>
  );
}
