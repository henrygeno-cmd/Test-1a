import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return formatDate(date);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 bg-green-50";
  if (score >= 60) return "text-yellow-600 bg-yellow-50";
  if (score >= 40) return "text-orange-600 bg-orange-50";
  return "text-red-600 bg-red-50";
}

export function getUrgencyColor(urgency: string): string {
  const colors: Record<string, string> = {
    EMERGENCY: "text-red-600 bg-red-50 border-red-200",
    HIGH: "text-orange-600 bg-orange-50 border-orange-200",
    MEDIUM: "text-yellow-600 bg-yellow-50 border-yellow-200",
    LOW: "text-green-600 bg-green-50 border-green-200",
  };
  return colors[urgency] || colors.MEDIUM;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    NEW: "text-blue-600 bg-blue-50",
    CONTACTED: "text-purple-600 bg-purple-50",
    QUALIFIED: "text-indigo-600 bg-indigo-50",
    PROPOSAL_SENT: "text-yellow-600 bg-yellow-50",
    NEGOTIATING: "text-orange-600 bg-orange-50",
    CLOSED_WON: "text-green-600 bg-green-50",
    CLOSED_LOST: "text-red-600 bg-red-50",
    NURTURING: "text-teal-600 bg-teal-50",
  };
  return colors[status] || "text-gray-600 bg-gray-50";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "lf_";
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export function getInitials(firstName: string, lastName?: string): string {
  return `${firstName[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

export function calculateMRR(subscriptions: { plan: string; price: number }[]): number {
  return subscriptions.reduce((sum, s) => sum + s.price, 0);
}

export function calculateChurnRate(startCount: number, endCount: number, churned: number): number {
  if (startCount === 0) return 0;
  return (churned / startCount) * 100;
}
