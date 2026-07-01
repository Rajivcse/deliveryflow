"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { UserForm } from "@/components/admin/UserForm";

export default function NewUserPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  if (!user || user.role !== "admin") return null;

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add User</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create a user account with optional password or Google sign-in.
          </p>
        </div>
      </div>
      <UserForm onSuccess={() => router.push("/admin/users")} />
    </div>
  );
}
