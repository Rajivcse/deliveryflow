import api from "@/lib/api";
import type { VenueImplementation, VenueImplementationCreate, PaginatedResponse, Comment } from "@/types";

export interface ImplementationFilters {
  status?: string;
  venue?: string;
  assigned_to?: number;
  q?: string;
  page?: number;
  per_page?: number;
}

export const implementationsApi = {
  list: async (filters: ImplementationFilters = {}): Promise<PaginatedResponse<VenueImplementation>> => {
    const { data } = await api.get("/implementations", { params: filters });
    return data;
  },
  get: async (id: number): Promise<VenueImplementation> => {
    const { data } = await api.get(`/implementations/${id}`);
    return data;
  },
  create: async (payload: VenueImplementationCreate): Promise<VenueImplementation> => {
    const { data } = await api.post("/implementations", payload);
    return data;
  },
  update: async (id: number, payload: Partial<VenueImplementationCreate>): Promise<VenueImplementation> => {
    const { data } = await api.put(`/implementations/${id}`, payload);
    return data;
  },
  updateStatus: async (id: number, status: string, notes?: string): Promise<VenueImplementation> => {
    const { data } = await api.patch(`/implementations/${id}/status`, { status, notes });
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/implementations/${id}`);
  },
  getComments: async (id: number): Promise<Comment[]> => {
    const { data } = await api.get(`/implementations/${id}/comments`);
    return data;
  },
  addComment: async (id: number, body: string): Promise<Comment> => {
    const { data } = await api.post(`/implementations/${id}/comments`, { body });
    return data;
  },
};
