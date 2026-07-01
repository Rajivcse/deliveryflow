import api from "@/lib/api";
import type { PaginatedResponse } from "@/types";

export type UserRole = "admin" | "delivery_manager" | "product_manager";

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface AdminUserCreate {
  email: string;
  full_name: string;
  password?: string;
  role: UserRole;
  is_active: boolean;
}

export interface AdminUserUpdate {
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface UserFilters {
  q?: string;
  role?: UserRole;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

export const usersApi = {
  list: async (filters: UserFilters = {}): Promise<PaginatedResponse<AdminUser>> => {
    const params: Record<string, string> = {};
    if (filters.q) params.q = filters.q;
    if (filters.role) params.role = filters.role;
    if (filters.is_active !== undefined) params.is_active = String(filters.is_active);
    if (filters.page) params.page = String(filters.page);
    if (filters.per_page) params.per_page = String(filters.per_page);
    const { data } = await api.get<PaginatedResponse<AdminUser>>("/admin/users", { params });
    return data;
  },

  get: async (id: number): Promise<AdminUser> => {
    const { data } = await api.get<AdminUser>(`/admin/users/${id}`);
    return data;
  },

  create: async (payload: AdminUserCreate): Promise<AdminUser> => {
    const { data } = await api.post<AdminUser>("/admin/users", payload);
    return data;
  },

  update: async (id: number, payload: AdminUserUpdate): Promise<AdminUser> => {
    const { data } = await api.put<AdminUser>(`/admin/users/${id}`, payload);
    return data;
  },

  revokeSessions: async (id: number): Promise<void> => {
    await api.post(`/admin/users/${id}/revoke-sessions`);
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },
};
