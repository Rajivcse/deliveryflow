import api from "@/lib/api";
import type { SearchResultItem } from "@/types";

export interface SearchParams {
  q?: string;
  type?: string;
  status?: string;
  venue?: string;
  product?: string;
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
}

export const searchApi = {
  search: async (params: SearchParams): Promise<SearchResultItem[]> => {
    const { data } = await api.get("/search", { params });
    return data;
  },
};
