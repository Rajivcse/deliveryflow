import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isStale(lastUpdatedAt: string, thresholdDays: number = 7): boolean {
  const lastUpdate = new Date(lastUpdatedAt);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - thresholdDays);
  return lastUpdate < threshold;
}

export function isApproachingDeadline(targetDate: string, daysAhead: number = 3): boolean {
  const target = new Date(targetDate);
  const now = new Date();
  const diff = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= daysAhead;
}
