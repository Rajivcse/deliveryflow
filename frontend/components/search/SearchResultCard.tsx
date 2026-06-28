import Link from "next/link";
import { Building2, GitPullRequest, Package } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import type { SearchResultItem } from "@/types";

const TYPE_CONFIG: Record<string, { label: string; href: string; icon: React.ElementType; color: string }> = {
  implementation: { label: "Implementation", href: "/implementations", icon: Building2, color: "text-blue-600" },
  change_request: { label: "Change Request", href: "/change-requests", icon: GitPullRequest, color: "text-indigo-600" },
  product_update: { label: "Product Update", href: "/product-updates", icon: Package, color: "text-purple-600" },
};

interface Props {
  item: SearchResultItem;
}

export function SearchResultCard({ item }: Props) {
  const config = TYPE_CONFIG[item.item_type];
  const Icon = config.icon;

  return (
    <Link
      href={`${config.href}/${item.id}`}
      className="block bg-white border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`mt-0.5 flex-shrink-0 ${config.color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{item.title}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-gray-600">{config.label}</span>
              {item.venue_name && <span>{item.venue_name}</span>}
              {item.product && <span>{item.product}</span>}
              {item.assigned_to_name && <span>→ {item.assigned_to_name}</span>}
              <span>Updated {formatDate(item.last_updated_at)}</span>
            </div>
          </div>
        </div>
        <StatusBadge status={item.status} className="flex-shrink-0" />
      </div>
    </Link>
  );
}
