"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { usersApi, type AdminUser, type UserRole } from "@/lib/api/users";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "delivery_manager", label: "Delivery Manager" },
  { value: "product_manager", label: "Product Manager" },
];

interface Props {
  defaultValues?: AdminUser;
  onSuccess: () => void;
}

export function UserForm({ defaultValues, onSuccess }: Props) {
  const isEdit = Boolean(defaultValues);

  const [fullName, setFullName] = useState(defaultValues?.full_name ?? "");
  const [email, setEmail] = useState(defaultValues?.email ?? "");
  const [role, setRole] = useState<UserRole>(defaultValues?.role ?? "delivery_manager");
  const [isActive, setIsActive] = useState(defaultValues?.is_active ?? true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || (!isEdit && !email.trim())) return;
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      if (isEdit && defaultValues) {
        await usersApi.update(defaultValues.id, { full_name: fullName.trim(), role, is_active: isActive });
        setSuccess("User updated successfully.");
        setTimeout(onSuccess, 800);
      } else {
        await usersApi.create({ full_name: fullName.trim(), email: email.trim(), role, is_active: isActive });
        onSuccess();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; detail?: string } } };
      setError(e?.response?.data?.message ?? e?.response?.data?.detail ?? "Failed to save user.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Smith"
              required
            />
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Must match the Google account this user will sign in with.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Role *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={isActive ? "active" : "inactive"}
              onValueChange={(v) => setIsActive(v === "active")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600 font-medium">{success}</p>}

          <div className="pt-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
