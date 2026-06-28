import Link from "next/link";
import { AlertTriangle, Clock, Hourglass } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AttentionItem {
  id: number;
  title: string;
  item_type: string;
  status: string;
  target_date?: string;
  last_updated_at: string;
  reason: string;
}

interface Props {
  items: AttentionItem[];
  isLoading?: boolean;
}

const ITEM_TYPE_LINKS: Record<string, string> = {
  implementation: "/implementations",
  change_request: "/change-requests",
  product_update: "/product-updates",
};

const REASON_ICONS: Record<string, React.ElementType> = {
  stale: Clock,
  near_deadline: AlertTriangle,
  waiting: Hourglass,
};

const REASON_LABELS: Record<string, string> = {
  stale: "Stale — no recent update",
  near_deadline: "Approaching deadline",
  waiting: "Waiting on action",
};

export function AttentionRequiredSection({ items, isLoading }: Props) {
  if (isLoading) return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;
  return (
    <div className="bg-white border border-orange-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-5 py-4 bg-orange-50 border-b border-orange-200">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <h2 className="font-semibold text-orange-800">Attention Required ({items.length})</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">All items are up to date</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map(item => {
            const Icon = REASON_ICONS[item.reason] ?? AlertTriangle;
            return (
              <Link
                key={`${item.item_type}-${item.id}`}
                href={`${ITEM_TYPE_LINKS[item.item_type]}/${item.id}`}
                className="flex items-start gap-3 px-5 py-3 hover:bg-orange-50/50 transition-colors"
              >
                <Icon className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {REASON_LABELS[item.reason]} · {item.item_type.replace(/_/g, " ")}
                    {item.target_date && ` · Due ${formatDate(item.target_date)}`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
