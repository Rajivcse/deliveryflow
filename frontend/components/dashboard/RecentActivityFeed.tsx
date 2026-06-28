import { formatDateTime } from "@/lib/utils";
import type { RecentActivity } from "@/types";

interface Props {
  activities: RecentActivity[];
  isLoading?: boolean;
}

export function RecentActivityFeed({ activities, isLoading }: Props) {
  if (isLoading) return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-gray-900">Recent Activity</h2>
      </div>
      {activities.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">No recent activity</p>
      ) : (
        <div className="divide-y divide-border">
          {activities.map((activity, i) => (
            <div key={i} className="px-5 py-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                {activity.actor?.full_name?.charAt(0) ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{activity.actor?.full_name}</span>{" "}
                  {activity.action}{" "}
                  <span className="font-medium">{activity.item_title}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(activity.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
