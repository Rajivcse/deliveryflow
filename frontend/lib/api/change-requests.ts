import api from "@/lib/api";
import type {
  ChangeRequest,
  ChangeRequestCreate,
  CRStatus,
  PaginatedResponse,
  Comment,
  StatusHistoryEntry,
} from "@/types";

export interface ChangeRequestFilters {
  status?: CRStatus;
  priority?: string;
  product?: string;
  venue?: string;
  source?: string;
  assigned_to?: number;
  q?: string;
  page?: number;
  per_page?: number;
}

export interface ChangeRequestUpdate extends Partial<ChangeRequestCreate> {
  status?: CRStatus;
}

export const changeRequestsApi = {
  list: async (filters: ChangeRequestFilters = {}): Promise<PaginatedResponse<ChangeRequest>> => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.product) params.set("product", filters.product);
    if (filters.venue) params.set("venue", filters.venue);
    if (filters.source) params.set("source", filters.source);
    if (filters.assigned_to !== undefined) params.set("assigned_to", String(filters.assigned_to));
    if (filters.q) params.set("q", filters.q);
    if (filters.page !== undefined) params.set("page", String(filters.page));
    if (filters.per_page !== undefined) params.set("per_page", String(filters.per_page));
    const { data } = await api.get<PaginatedResponse<ChangeRequest>>(
      `/change-requests?${params.toString()}`
    );
    return data;
  },

  get: async (id: number): Promise<ChangeRequest> => {
    const { data } = await api.get<ChangeRequest>(`/change-requests/${id}`);
    return data;
  },

  create: async (payload: ChangeRequestCreate): Promise<ChangeRequest> => {
    const { data } = await api.post<ChangeRequest>("/change-requests", payload);
    return data;
  },

  update: async (id: number, payload: ChangeRequestUpdate): Promise<ChangeRequest> => {
    const { data } = await api.put<ChangeRequest>(`/change-requests/${id}`, payload);
    return data;
  },

  updateStatus: async (id: number, status: string, notes?: string): Promise<ChangeRequest> => {
    const { data } = await api.patch<ChangeRequest>(`/change-requests/${id}/status`, { status, notes });
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/change-requests/${id}`);
  },

  getComments: async (id: number): Promise<Comment[]> => {
    const { data } = await api.get<Comment[]>(`/change-requests/${id}/comments`);
    return data;
  },

  addComment: async (id: number, body: string): Promise<Comment> => {
    const { data } = await api.post<Comment>(`/change-requests/${id}/comments`, { body });
    return data;
  },
  getStatusHistory: async (id: number): Promise<StatusHistoryEntry[]> => {
    const { data } = await api.get<StatusHistoryEntry[]>(`/change-requests/${id}/status-history`);
    return data;
  },
};
