"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Filter, Download, RefreshCw, Bot } from "lucide-react";
import { LeadTable } from "@/components/leads/lead-table";
import { LeadFilters } from "@/components/leads/lead-filters";
import { NewLeadModal } from "@/components/leads/new-lead-modal";
import type { LeadStatus, Urgency, LeadSource } from "@/types";

type Lead = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  serviceType?: string | null;
  status: LeadStatus;
  urgency: Urgency;
  score: number;
  estimatedValue?: number | null;
  source: LeadSource;
  isHighValue: boolean;
  isQualified: boolean;
  createdAt: string;
  lastContactedAt?: string | null;
};

const DEMO_LEADS: Lead[] = [
  { id: "1", firstName: "James", lastName: "Kowalski", email: "james.k@email.com", phone: "(555) 010-1234", serviceType: "HVAC Repair", status: "NEW", urgency: "EMERGENCY", score: 94, estimatedValue: 3200, source: "WEBSITE", isHighValue: true, isQualified: true, createdAt: new Date().toISOString() },
  { id: "2", firstName: "Lisa", lastName: "Martinez", email: "lisa.m@email.com", phone: "(555) 020-5678", serviceType: "Roof Replacement", status: "QUALIFIED", urgency: "HIGH", score: 87, estimatedValue: 14500, source: "CHAT_WIDGET", isHighValue: true, isQualified: true, createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: "3", firstName: "Carlos", lastName: "Rodriguez", email: "carlos.r@email.com", phone: "(555) 030-9012", serviceType: "Landscaping Design", status: "CONTACTED", urgency: "MEDIUM", score: 76, estimatedValue: 2800, source: "LANDING_PAGE", isHighValue: true, isQualified: true, createdAt: new Date(Date.now() - 4 * 3600000).toISOString() },
  { id: "4", firstName: "Amy", lastName: "Thompson", email: "amy.t@email.com", phone: "(555) 040-3456", serviceType: "Interior Painting", status: "PROPOSAL_SENT", urgency: "MEDIUM", score: 71, estimatedValue: 4200, source: "REFERRAL", isHighValue: true, isQualified: true, createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: "5", firstName: "David", lastName: "Williams", email: "david.w@email.com", phone: "(555) 050-7890", serviceType: "Window Cleaning", status: "NEW", urgency: "LOW", score: 55, estimatedValue: 450, source: "ORGANIC_SEARCH", isHighValue: false, isQualified: false, createdAt: new Date(Date.now() - 48 * 3600000).toISOString() },
  { id: "6", firstName: "Jennifer", lastName: "Lee", email: "jen.l@email.com", phone: "(555) 060-1234", serviceType: "Pressure Washing", status: "NURTURING", urgency: "LOW", score: 42, estimatedValue: 800, source: "SOCIAL_MEDIA", isHighValue: false, isQualified: false, createdAt: new Date(Date.now() - 72 * 3600000).toISOString() },
  { id: "7", firstName: "Robert", lastName: "Chen", email: "rob.c@email.com", phone: "(555) 070-5678", serviceType: "HVAC Installation", status: "CLOSED_WON", urgency: "HIGH", score: 91, estimatedValue: 8400, source: "WEBSITE", isHighValue: true, isQualified: true, createdAt: new Date(Date.now() - 5 * 24 * 3600000).toISOString() },
  { id: "8", firstName: "Maria", lastName: "Garcia", email: "maria.g@email.com", phone: "(555) 080-9012", serviceType: "Home Cleaning", status: "CLOSED_LOST", urgency: "LOW", score: 38, estimatedValue: 200, source: "GOOGLE_ADS", isHighValue: false, isQualified: false, createdAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString() },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(DEMO_LEADS);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    status: "" as string,
    urgency: "" as string,
    source: "" as string,
    highValue: false,
  });

  const filteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(q) ||
      lead.email?.toLowerCase().includes(q) ||
      lead.phone?.includes(q) ||
      lead.serviceType?.toLowerCase().includes(q);

    const matchesStatus = !filters.status || lead.status === filters.status;
    const matchesUrgency = !filters.urgency || lead.urgency === filters.urgency;
    const matchesSource = !filters.source || lead.source === filters.source;
    const matchesHighValue = !filters.highValue || lead.isHighValue;

    return matchesSearch && matchesStatus && matchesUrgency && matchesSource && matchesHighValue;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{leads.length} Total Leads</h2>
          <p className="text-sm text-gray-500">{filteredLeads.length} matching current filters</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {/* refresh */}}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by name, email, phone, or service..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
          />
        </div>
        <LeadFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Lead Table */}
      <LeadTable leads={filteredLeads} onLeadUpdate={(updated) => {
        setLeads(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l));
      }} />

      {/* New Lead Modal */}
      {showNewModal && (
        <NewLeadModal
          onClose={() => setShowNewModal(false)}
          onCreated={(lead) => {
            setLeads(prev => [lead as Lead, ...prev]);
            setShowNewModal(false);
          }}
        />
      )}
    </div>
  );
}
