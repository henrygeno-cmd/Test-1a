"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Search, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/customers": "Customers",
  "/automation": "Automation",
  "/ai-assistant": "AI Assistant",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/settings/billing": "Billing",
};

export function DashboardHeader() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] || "Dashboard";

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 gap-4">
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-64">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            placeholder="Search leads, customers..."
            className="bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400 w-full"
          />
        </div>

        {/* Quick add lead */}
        <Link
          href="/leads?new=true"
          className="hidden md:flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Lead
        </Link>

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User button */}
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-9 h-9",
              userButtonPopoverCard: "shadow-xl border border-gray-200",
            },
          }}
        />
      </div>
    </header>
  );
}
