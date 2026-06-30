import api from "@/lib/api";

export type ReportModule = "implementations" | "change-requests" | "product-updates";
export type ExportFormat = "xlsx" | "csv";

export interface ReportFilters {
  status?: string;
  venue?: string;
  product?: string;
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
}

export const reportsApi = {
  export: async (module: ReportModule, format: ExportFormat, filters: ReportFilters): Promise<Blob> => {
    const params: Record<string, string> = { format, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== "")) };
    const { data } = await api.get(`/reports/${module}`, {
      params,
      responseType: "blob",
    });
    return data;
  },
};
