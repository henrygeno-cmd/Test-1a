"use client";

import { Zap, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

const DEMO_AUTOMATIONS = [
  { name: "New Lead Welcome", status: "running", leads: 12 },
  { name: "Day 3 Follow-Up", status: "running", leads: 8 },
  { name: "Cold Lead Re-engage", status: "running", leads: 23 },
  { name: "Appointment Reminder", status: "running", leads: 4 },
];

export function AutomationStatus({ activeCount }: { activeCount: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Automation Engine</h2>
        <Link href="/automation" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
          Manage <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-medium text-green-700">{activeCount} active sequences</span>
      </div>
      <div className="space-y-3">
        {DEMO_AUTOMATIONS.map((automation) => (
          <div key={automation.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-700">{automation.name}</span>
            </div>
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
              {automation.leads} leads
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
