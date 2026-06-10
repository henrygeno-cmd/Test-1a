"use client";

import { Filter, Star } from "lucide-react";
import { useState } from "react";

type Filters = {
  status: string;
  urgency: string;
  source: string;
  highValue: boolean;
};

const STATUS_OPTIONS = ["", "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATING", "CLOSED_WON", "CLOSED_LOST", "NURTURING"];
const URGENCY_OPTIONS = ["", "LOW", "MEDIUM", "HIGH", "EMERGENCY"];
const SOURCE_OPTIONS = ["", "WEBSITE", "CHAT_WIDGET", "LANDING_PAGE", "REFERRAL", "SOCIAL_MEDIA", "GOOGLE_ADS", "ORGANIC_SEARCH"];

export function LeadFilters({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const [open, setOpen] = useState(false);
  const activeCount = [filters.status, filters.urgency, filters.source, filters.highValue ? "1" : ""].filter(Boolean).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm transition-colors ${
          activeCount > 0 ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
        }`}
      >
        <Filter className="w-4 h-4" />
        Filters
        {activeCount > 0 && (
          <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-20 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-72 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900 text-sm">Filters</p>
            <button
              onClick={() => onChange({ status: "", urgency: "", source: "", highValue: false })}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
            <select
              value={filters.status}
              onChange={(e) => onChange({ ...filters, status: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s ? s.replace("_", " ") : "All statuses"}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Urgency</label>
            <select
              value={filters.urgency}
              onChange={(e) => onChange({ ...filters, urgency: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              {URGENCY_OPTIONS.map((u) => (
                <option key={u} value={u}>{u || "All urgencies"}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Source</label>
            <select
              value={filters.source}
              onChange={(e) => onChange({ ...filters, source: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              {SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s ? s.replace("_", " ") : "All sources"}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.highValue}
              onChange={(e) => onChange({ ...filters, highValue: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 border-gray-300"
            />
            <span className="flex items-center gap-1.5 text-sm text-gray-700">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              High-value leads only
            </span>
          </label>

          <button
            onClick={() => setOpen(false)}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
}
