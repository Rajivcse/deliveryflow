import api from "@/lib/api";
import type { ProductUpdate, ProductUpdateCreate, ProductUpdateStatus, PaginatedResponse, Comment, StatusHistoryEntry } from "@/types";

export interface ProductUpdateFilters {
  status?: string;
  product?: string;
  assigned_to?: number;
  q?: string;
  page?: number;
  per_page?: number;
}

export const productUpdatesApi = {
  list: async (filters: ProductUpdateFilters = {}): Promise<PaginatedResponse<ProductUpdate>> => {
    const { data } = await api.get("/product-updates", { params: filters });
    return data;
  },

  get: async (id: number): Promise<ProductUpdate> => {
    const { data } = await api.get(`/product-updates/${id}`);
    return data;
  },

  create: async (payload: ProductUpdateCreate): Promise<ProductUpdate> => {
    const { data } = await api.post("/product-updates", payload);
    return data;
  },

  update: async (id: number, payload: Partial<ProductUpdateCreate>): Promise<ProductUpdate> => {
    const { data } = await api.put(`/product-updates/${id}`, payload);
    return data;
  },

  updateStatus: async (id: number, status: ProductUpdateStatus, notes?: string): Promise<ProductUpdate> => {
    const { data } = await api.patch(`/product-updates/${id}/status`, { status, notes });
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/product-updates/${id}`);
  },

  getComments: async (id: number): Promise<Comment[]> => {
    const { data } = await api.get(`/product-updates/${id}/comments`);
    return data;
  },

  addComment: async (id: number, body: string): Promise<Comment> => {
    const { data } = await api.post(`/product-updates/${id}/comments`, { body });
    return data;
  },
  getStatusHistory: async (id: number): Promise<StatusHistoryEntry[]> => {
    const { data } = await api.get(`/product-updates/${id}/status-history`);
    return data;
  },
};
