import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function calculateSeoScore(content: string, keyword: string): number {
  let score = 0;
  const contentLower = content.toLowerCase();
  const keywordLower = keyword.toLowerCase();
  const wordCount = content.split(/\s+/).length;

  // Word count check (1000-2500 words is ideal)
  if (wordCount >= 1000) score += 20;
  if (wordCount >= 1500) score += 10;
  if (wordCount >= 2000) score += 5;

  // Keyword density (1-3% is ideal)
  const keywordCount = (contentLower.match(new RegExp(keywordLower, "g")) || []).length;
  const density = (keywordCount / wordCount) * 100;
  if (density >= 0.5 && density <= 3) score += 25;

  // Has headings
  if (content.includes("## ") || content.includes("# ")) score += 15;

  // Has multiple sections
  const headingCount = (content.match(/^#{1,3}\s/gm) || []).length;
  if (headingCount >= 3) score += 10;
  if (headingCount >= 6) score += 5;

  // Has lists
  if (content.includes("- ") || content.includes("* ") || content.includes("1.")) score += 10;

  // Meta description length
  score += 5; // Base score for having content

  return Math.min(100, score);
}

export function getPlanLimits(plan: string): { articlesPerMonth: number; keywords: boolean; export: boolean } {
  switch (plan) {
    case "STARTER":
      return { articlesPerMonth: 10, keywords: true, export: false };
    case "PRO":
      return { articlesPerMonth: 50, keywords: true, export: true };
    case "AGENCY":
      return { articlesPerMonth: 999, keywords: true, export: true };
    default:
      return { articlesPerMonth: 2, keywords: false, export: false };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
