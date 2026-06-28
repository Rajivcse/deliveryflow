"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { BlockedItemsSection } from "@/components/dashboard/BlockedItemsSection";
import { AttentionRequiredSection } from "@/components/dashboard/AttentionRequiredSection";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { dashboardApi } from "@/lib/api/dashboard";
import type { DashboardSummary, BlockedItem, RecentActivity } from "@/types";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [blocked, setBlocked] = useState<BlockedItem[]>([]);
  const [attention, setAttention] = useState<any[]>([]);
  const [recent, setRecent] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const [summaryData, blockedData, attentionData, recentData] = await Promise.all([
          dashboardApi.getSummary(),
          dashboardApi.getBlocked(),
          dashboardApi.getAttention(),
          dashboardApi.getRecent(),
        ]);
        setSummary(summaryData);
        setBlocked(blockedData);
        setAttention(attentionData);
        setRecent(recentData);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    fetchAll();
  }, []);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {user?.full_name?.split(" ")[0]}. Here's your delivery overview.
        </p>
      </motion.div>

      <SummaryCards summary={summary ?? {} as DashboardSummary} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BlockedItemsSection items={blocked} isLoading={isLoading} />
        <AttentionRequiredSection items={attention} isLoading={isLoading} />
      </div>

      <RecentActivityFeed activities={recent} isLoading={isLoading} />
    </div>
  );
}
