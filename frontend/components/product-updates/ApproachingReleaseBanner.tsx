import { AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Props {
  plannedReleaseDate: string;
  productName: string;
}

export function ApproachingReleaseBanner({ plannedReleaseDate, productName }: Props) {
  return (
    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-amber-800">
          Release Approaching — {productName}
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          Planned release date: {formatDate(plannedReleaseDate)}. Ensure this update is ready for deployment.
        </p>
      </div>
    </div>
  );
}
