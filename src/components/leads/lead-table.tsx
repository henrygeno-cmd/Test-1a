"use client";

import Link from "next/link";
import { Phone, Mail, Star, MoreHorizontal, Bot } from "lucide-react";
import { formatRelativeTime, formatCurrency, getScoreColor, getUrgencyColor, getStatusColor, cn } from "@/lib/utils";

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
  isHighValue: boolean;
  isQualified: boolean;
  createdAt: string;
};

const STATUS_OPTIONS = [
  "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT",
  "NEGOTIATING", "CLOSED_WON", "CLOSED_LOST", "NURTURING"
];

export function LeadTable({
  leads,
  onLeadUpdate,
}: {
  leads: Lead[];
  onLeadUpdate: (lead: Partial<Lead> & { id: string }) => void;
}) {
  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No leads match your filters.</p>
        <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Lead</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Service</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Score</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Urgency</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Est. Value</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Source</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Created</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50 transition-colors group">
              {/* Lead name */}
              <td className="px-4 py-3">
                <Link href={`/leads/${lead.id}`} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {lead.firstName[0]}{lead.lastName?.[0] || ""}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
                        {lead.firstName} {lead.lastName}
                      </p>
                      {lead.isHighValue && (
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" title="High-Value Lead" />
                      )}
                      {lead.isQualified && (
                        <Bot className="w-3.5 h-3.5 text-blue-500" title="AI Qualified" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {lead.phone && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </span>
                      )}
                      {lead.email && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Mail className="w-3 h-3" />
                          {lead.email}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </td>

              {/* Service */}
              <td className="px-4 py-3">
                <span className="text-sm text-gray-700">{lead.serviceType || "—"}</span>
              </td>

              {/* Score */}
              <td className="px-4 py-3">
                <span className={cn("text-sm px-2.5 py-1 rounded-full font-semibold", getScoreColor(lead.score))}>
                  {lead.score}
                </span>
              </td>

              {/* Urgency */}
              <td className="px-4 py-3">
                <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium border", getUrgencyColor(lead.urgency))}>
                  {lead.urgency}
                </span>
              </td>

              {/* Status - editable */}
              <td className="px-4 py-3">
                <select
                  value={lead.status}
                  onChange={(e) => onLeadUpdate({ id: lead.id, status: e.target.value as any })}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full font-medium border-0 outline-none cursor-pointer",
                    getStatusColor(lead.status)
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </td>

              {/* Est. Value */}
              <td className="px-4 py-3">
                <span className={cn("text-sm font-medium", lead.estimatedValue && lead.estimatedValue > 0 ? "text-gray-900" : "text-gray-400")}>
                  {lead.estimatedValue && lead.estimatedValue > 0
                    ? formatCurrency(lead.estimatedValue)
                    : "—"}
                </span>
              </td>

              {/* Source */}
              <td className="px-4 py-3">
                <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  {lead.source.replace("_", " ")}
                </span>
              </td>

              {/* Created */}
              <td className="px-4 py-3">
                <span className="text-xs text-gray-400">{formatRelativeTime(lead.createdAt)}</span>
              </td>

              {/* Actions */}
              <td className="px-4 py-3">
                <Link href={`/leads/${lead.id}`} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="w-4 h-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
