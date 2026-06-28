"use client";
import { LogOut } from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-3">
        <NotificationBell />

        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {user?.full_name?.charAt(0) ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <p className="font-medium text-gray-900 leading-tight">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role?.replace(/_/g, " ")}
            </p>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
