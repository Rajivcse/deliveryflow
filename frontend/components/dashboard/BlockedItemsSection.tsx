import Link from "next/link";
import { AlertOctagon } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { BlockedItem } from "@/types";

interface Props {
  items: BlockedItem[];
  isLoading?: boolean;
}

const ITEM_TYPE_LINKS: Record<string, string> = {
  implementation: "/implementations",
  change_request: "/change-requests",
  product_update: "/product-updates",
};

export function BlockedItemsSection({ items, isLoading }: Props) {
  if (isLoading) return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;
  return (
    <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-5 py-4 bg-red-50 border-b border-red-200">
        <AlertOctagon className="h-4 w-4 text-red-600" />
        <h2 className="font-semibold text-red-800">Blocked Items ({items.length})</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">No blocked items</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map(item => (
            <Link
              key={`${item.item_type}-${item.id}`}
              href={`${ITEM_TYPE_LINKS[item.item_type]}/${item.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-red-50/50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.item_type.replace(/_/g, " ")} · {item.venue_name || "—"} · Last updated {formatDate(item.last_updated_at)}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{item.assigned_to?.full_name || "Unassigned"}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
