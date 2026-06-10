"use client";

import Link from "next/link";
import { ArrowRight, Phone, Mail } from "lucide-react";
import { formatRelativeTime, getScoreColor, getUrgencyColor, getStatusColor, cn } from "@/lib/utils";

type Lead = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  serviceType?: string | null;
  status: string;
  urgency: string;
  score: number;
  estimatedValue?: number | null;
  source: string;
  createdAt: Date;
};

export function RecentLeads({ leads }: { leads: Lead[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Recent Leads</h2>
        <Link
          href="/leads"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="divide-y divide-gray-50">
        {leads.map((lead) => (
          <Link
            key={lead.id}
            href={`/leads/${lead.id}`}
            className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group"
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {lead.firstName[0]}{lead.lastName?.[0] || ""}
            </div>

            {/* Lead info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-medium text-gray-900 text-sm">
                  {lead.firstName} {lead.lastName}
                </p>
                {lead.urgency === "EMERGENCY" && (
                  <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium border border-red-100">
                    EMERGENCY
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {lead.serviceType || "General Inquiry"} · {formatRelativeTime(lead.createdAt)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {lead.phone && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Phone className="w-3 h-3" /> {lead.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="flex flex-col items-end gap-2">
              <span className={cn("text-xs px-2 py-1 rounded-full font-semibold", getScoreColor(lead.score))}>
                {lead.score}
              </span>
              <span className={cn("text-xs px-2 py-1 rounded-full", getStatusColor(lead.status))}>
                {lead.status.replace("_", " ")}
              </span>
            </div>

            {/* Value */}
            {lead.estimatedValue && lead.estimatedValue > 0 && (
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-gray-900">
                  ${lead.estimatedValue.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">est. value</p>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
