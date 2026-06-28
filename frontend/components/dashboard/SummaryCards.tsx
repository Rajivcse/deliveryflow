import { motion } from "framer-motion";
import { Building2, GitPullRequest, Package, AlertOctagon, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import type { DashboardSummary } from "@/types";

interface CardConfig {
  key: keyof DashboardSummary;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const CARDS: CardConfig[] = [
  { key: "active_implementations", label: "Active Implementations", icon: Building2, color: "text-blue-600", bgColor: "bg-blue-50" },
  { key: "active_change_requests", label: "Active Change Requests", icon: GitPullRequest, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  { key: "active_product_updates", label: "Active Product Updates", icon: Package, color: "text-purple-600", bgColor: "bg-purple-50" },
  { key: "blocked_items", label: "Blocked Items", icon: AlertOctagon, color: "text-red-600", bgColor: "bg-red-50" },
  { key: "delayed_items", label: "Delayed Items", icon: Clock, color: "text-amber-600", bgColor: "bg-amber-50" },
  { key: "attention_required", label: "Attention Required", icon: AlertTriangle, color: "text-orange-600", bgColor: "bg-orange-50" },
  { key: "completed_items", label: "Completed Items", icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-50" },
];

interface Props {
  summary: DashboardSummary;
  isLoading?: boolean;
}

export function SummaryCards({ summary, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        {CARDS.map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
      {CARDS.map((card, i) => {
        const Icon = card.icon;
        const value = summary[card.key];
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-border rounded-xl p-4 flex flex-col gap-2 shadow-sm"
          >
            <div className={`w-9 h-9 rounded-lg ${card.bgColor} flex items-center justify-center`}>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${value > 0 && card.key !== "completed_items" ? card.color : "text-gray-900"}`}>
                {value}
              </p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">{card.label}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
