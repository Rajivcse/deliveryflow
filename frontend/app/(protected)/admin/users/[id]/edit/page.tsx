"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { UserForm } from "@/components/admin/UserForm";
import { usersApi, type AdminUser } from "@/lib/api/users";

export default function EditUserPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = Number(params.id);

  const [targetUser, setTargetUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await usersApi.get(userId);
        setTargetUser(data);
      } catch {
        setError("User not found.");
      } finally {
        setIsLoading(false);
      }
    };
    if (!isNaN(userId)) load();
  }, [userId]);

  if (!user || user.role !== "admin") return null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !targetUser) {
    return <div className="text-destructive py-8">{error || "User not found."}</div>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit User</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{targetUser.email}</p>
        </div>
      </div>
      <UserForm
        defaultValues={targetUser}
        onSuccess={() => router.push("/admin/users")}
      />
    </div>
  );
}
