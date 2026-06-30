import api from "@/lib/api";
import type { DashboardSummary, BlockedItem, RecentActivity, Notification } from "@/types";

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await api.get("/dashboard/summary");
    return data;
  },
  getBlocked: async (): Promise<BlockedItem[]> => {
    const { data } = await api.get("/dashboard/blocked");
    return data;
  },
  getAttention: async (): Promise<any[]> => {
    const { data } = await api.get("/dashboard/attention");
    return data;
  },
  getRecent: async (): Promise<RecentActivity[]> => {
    const { data } = await api.get("/dashboard/recent");
    return data;
  },
  getNotifications: async (): Promise<Notification[]> => {
    const { data } = await api.get("/notifications");
    return data;
  },
  markRead: async (id: number): Promise<Notification> => {
    const { data } = await api.patch(`/notifications/${id}/read`);
    return data;
  },
  markAllRead: async (): Promise<{ marked_read: number }> => {
    const { data } = await api.post("/notifications/read-all");
    return data;
  },
};
