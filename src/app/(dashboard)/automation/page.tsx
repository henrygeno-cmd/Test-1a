"use client";

import { useState } from "react";
import { Zap, Plus, Toggle, Mail, MessageSquare, Bell, Clock, Play, Pause, MoreHorizontal, CheckCircle } from "lucide-react";

type Automation = {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  isActive: boolean;
  runCount: number;
  lastRunAt?: string;
  channel: "email" | "sms" | "both" | "notify";
};

const DEMO_AUTOMATIONS: Automation[] = [
  {
    id: "1",
    name: "New Lead Welcome Sequence",
    trigger: "When a new lead is captured",
    actions: ["Send welcome email immediately", "Send SMS with estimate offer (2 min delay)", "Notify business owner via email"],
    isActive: true,
    runCount: 143,
    lastRunAt: "2 min ago",
    channel: "both",
  },
  {
    id: "2",
    name: "Day 3 Follow-Up",
    trigger: "3 days after lead creation, status = CONTACTED",
    actions: ["Send personalized follow-up email", "Log activity in CRM"],
    isActive: true,
    runCount: 89,
    lastRunAt: "4 hours ago",
    channel: "email",
  },
  {
    id: "3",
    name: "High-Value Lead Alert",
    trigger: "When lead score > 80 or is marked high-value",
    actions: ["Send immediate SMS to owner", "Send priority email to owner", "Update lead urgency to HIGH"],
    isActive: true,
    runCount: 31,
    lastRunAt: "1 hour ago",
    channel: "notify",
  },
  {
    id: "4",
    name: "Cold Lead Re-Engagement",
    trigger: "14 days with no contact, status = NEW or CONTACTED",
    actions: ["Send re-engagement SMS", "Send value-add email 2 days later", "Move to NURTURING status"],
    isActive: true,
    runCount: 56,
    lastRunAt: "6 hours ago",
    channel: "both",
  },
  {
    id: "5",
    name: "Appointment Reminder",
    trigger: "24 hours before scheduled appointment",
    actions: ["Send SMS reminder to customer", "Send calendar details via email"],
    isActive: true,
    runCount: 24,
    lastRunAt: "Yesterday",
    channel: "both",
  },
  {
    id: "6",
    name: "Proposal Follow-Up",
    trigger: "3 days after status changes to PROPOSAL_SENT",
    actions: ["Send follow-up email asking if they have questions", "Log follow-up activity"],
    isActive: false,
    runCount: 0,
    channel: "email",
  },
];

const CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  both: Zap,
  notify: Bell,
};

const CHANNEL_COLORS = {
  email: "text-blue-600 bg-blue-50",
  sms: "text-green-600 bg-green-50",
  both: "text-purple-600 bg-purple-50",
  notify: "text-orange-600 bg-orange-50",
};

export default function AutomationPage() {
  const [automations, setAutomations] = useState(DEMO_AUTOMATIONS);

  const toggleAutomation = (id: string) => {
    setAutomations(prev =>
      prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a)
    );
  };

  const activeCount = automations.filter(a => a.isActive).length;
  const totalRuns = automations.reduce((sum, a) => sum + a.runCount, 0);

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Active Automations</p>
          <p className="text-3xl font-bold text-gray-900">{activeCount}</p>
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Running 24/7
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Actions Triggered</p>
          <p className="text-3xl font-bold text-gray-900">{totalRuns.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">All time</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Hours Saved</p>
          <p className="text-3xl font-bold text-gray-900">~{Math.round(totalRuns * 0.2)}h</p>
          <p className="text-xs text-gray-400 mt-1">Est. manual time saved</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Automation Rules</h2>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          New Automation
        </button>
      </div>

      {/* Automation list */}
      <div className="space-y-3">
        {automations.map((automation) => {
          const ChannelIcon = CHANNEL_ICONS[automation.channel];
          const channelColor = CHANNEL_COLORS[automation.channel];

          return (
            <div
              key={automation.id}
              className={`bg-white rounded-xl border p-5 transition-all ${
                automation.isActive ? "border-gray-200" : "border-gray-100 opacity-60"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Channel icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${channelColor}`}>
                  <ChannelIcon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{automation.name}</h3>
                    {automation.isActive ? (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border border-green-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Active
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full font-medium border border-gray-200">
                        Paused
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 mb-3">
                    <span className="font-medium text-gray-700">Trigger:</span> {automation.trigger}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {automation.actions.map((action, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-gray-600">{action}</span>
                      </div>
                    ))}
                  </div>

                  {(automation.runCount > 0 || automation.lastRunAt) && (
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-gray-400">
                        {automation.runCount} runs total
                      </span>
                      {automation.lastRunAt && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last run: {automation.lastRunAt}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAutomation(automation.id)}
                    className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${
                      automation.isActive ? "bg-blue-600" : "bg-gray-200"
                    }`}
                    title={automation.isActive ? "Pause automation" : "Activate automation"}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        automation.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add automation CTA */}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors cursor-pointer group">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <Plus className="w-6 h-6 text-blue-600" />
        </div>
        <p className="font-medium text-gray-900 mb-1">Create a new automation</p>
        <p className="text-sm text-gray-500">
          Trigger-based sequences for email, SMS, and notifications
        </p>
      </div>
    </div>
  );
}
