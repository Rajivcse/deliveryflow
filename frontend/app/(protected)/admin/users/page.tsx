"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {
  UserPlus, Search, Shield, RefreshCw, Trash2, Pencil, CheckCircle, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usersApi, type AdminUser, type UserRole } from "@/lib/api/users";
import { formatDateTime } from "@/lib/utils";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  delivery_manager: "Delivery Manager",
  product_manager: "Product Manager",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  delivery_manager: "bg-blue-100 text-blue-800 border-blue-200",
  product_manager: "bg-green-100 text-green-800 border-green-200",
};

export default function UserManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin") { router.replace("/dashboard"); }
  }, [user, router]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await usersApi.list({
        q: q || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        is_active: statusFilter === "all" ? undefined : statusFilter === "active",
        page,
        per_page: 20,
      });
      setUsers(res.items);
      setTotal(res.total);
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, [q, roleFilter, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleRevokeSessions = async (u: AdminUser) => {
    if (!confirm(`Revoke all sessions for ${u.full_name}? They will need to sign in again.`)) return;
    setActionError("");
    try {
      await usersApi.revokeSessions(u.id);
      setActionError(`Sessions revoked for ${u.full_name}.`);
    } catch {
      setActionError("Failed to revoke sessions.");
    }
  };

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`Delete user ${u.full_name}? This cannot be undone.`)) return;
    setActionError("");
    try {
      await usersApi.delete(u.id);
      load();
    } catch {
      setActionError("Failed to delete user.");
    }
  };

  const handleToggleActive = async (u: AdminUser) => {
    setActionError("");
    try {
      await usersApi.update(u.id, { is_active: !u.is_active });
      load();
    } catch {
      setActionError("Failed to update user status.");
    }
  };

  if (!user || user.role !== "admin") return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{total} users total</p>
        </div>
        <Link href="/admin/users/new">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </Link>
      </div>

      {actionError && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          {actionError}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name or email..."
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as UserRole | "all"); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="delivery_manager">Delivery Manager</SelectItem>
                <SelectItem value="product_manager">Product Manager</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as "all" | "active" | "inactive"); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Name / Email</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Last Login</th>
                    <th className="px-4 py-3 text-left">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr
                      key={u.id}
                      className={`border-b border-border last:border-0 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.full_name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <span className="flex items-center gap-1.5 text-green-700 font-medium">
                            <CheckCircle className="h-3.5 w-3.5" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-gray-400 font-medium">
                            <XCircle className="h-3.5 w-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {u.last_login ? formatDateTime(u.last_login) : "Never"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDateTime(u.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/users/${u.id}/edit`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title={u.is_active ? "Deactivate" : "Activate"}
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.is_active ? (
                              <XCircle className="h-3.5 w-3.5 text-orange-500" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Revoke Sessions"
                            onClick={() => handleRevokeSessions(u)}
                          >
                            <RefreshCw className="h-3.5 w-3.5 text-blue-500" />
                          </Button>
                          {user?.id !== u.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Delete"
                              onClick={() => handleDelete(u)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground py-2">Page {page}</span>
          <Button variant="outline" size="sm" disabled={users.length < 20} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
