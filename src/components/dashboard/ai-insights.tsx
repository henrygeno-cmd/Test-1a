"use client";

import { Bot, TrendingUp, AlertCircle, Lightbulb, ChevronRight } from "lucide-react";

type InsightType = {
  type: "opportunity" | "alert" | "tip" | "win";
  icon: typeof Bot;
  color: string;
  title: string;
  body: string;
  action?: string;
  href?: string;
};

export function AIInsights({ stats, recentLeads }: {
  stats: { highValueLeads: number; conversionRate: number; totalLeads: number };
  recentLeads: { urgency: string; status: string }[];
}) {
  const emergencyLeads = recentLeads.filter((l) => l.urgency === "EMERGENCY").length;
  const newLeads = recentLeads.filter((l) => l.status === "NEW").length;

  const insights: InsightType[] = [
    ...(emergencyLeads > 0
      ? [{
          type: "alert" as const,
          icon: AlertCircle,
          color: "red",
          title: `${emergencyLeads} Emergency Lead${emergencyLeads > 1 ? "s" : ""} Need Immediate Attention`,
          body: "Emergency leads have the highest close rates when contacted within 1 hour. These should be your priority right now.",
          action: "View Emergency Leads →",
          href: "/leads?urgency=EMERGENCY",
        }]
      : []),
    ...(stats.highValueLeads > 0
      ? [{
          type: "opportunity" as const,
          icon: TrendingUp,
          color: "blue",
          title: `${stats.highValueLeads} High-Value Leads in Your Pipeline`,
          body: `You have ${stats.highValueLeads} leads with estimated value over $2,000. Prioritizing these could significantly impact your revenue this month.`,
          action: "Focus on High-Value →",
          href: "/leads?highValue=true",
        }]
      : []),
    {
      type: "tip" as const,
      icon: Lightbulb,
      color: "yellow",
      title: "Enable SMS Follow-Ups to Boost Response Rates",
      body: "Businesses using SMS automation see 3x higher response rates than email alone. Upgrade to Growth plan to unlock SMS automation.",
      action: "Upgrade Plan →",
      href: "/settings/billing",
    },
    ...(newLeads > 3
      ? [{
          type: "alert" as const,
          icon: AlertCircle,
          color: "orange",
          title: `${newLeads} Leads Haven't Been Contacted Yet`,
          body: "Leads contacted within the first hour are 7x more likely to qualify. Set up an automation to ensure no lead goes untouched.",
          action: "Create Automation →",
          href: "/automation",
        }]
      : []),
  ].slice(0, 3);

  const colorMap: Record<string, string> = {
    red: "border-red-200 bg-red-50",
    blue: "border-blue-200 bg-blue-50",
    yellow: "border-yellow-200 bg-yellow-50",
    orange: "border-orange-200 bg-orange-50",
    green: "border-green-200 bg-green-50",
  };

  const iconColorMap: Record<string, string> = {
    red: "text-red-600",
    blue: "text-blue-600",
    yellow: "text-yellow-600",
    orange: "text-orange-600",
    green: "text-green-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Bot className="w-5 h-5 text-blue-600" />
        <h2 className="font-semibold text-gray-900">AI Insights & Recommendations</h2>
        <span className="ml-auto text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
          Powered by GPT-4
        </span>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`border rounded-xl p-4 ${colorMap[insight.color]}`}
          >
            <div className="flex items-start gap-3 mb-3">
              <insight.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColorMap[insight.color]}`} />
              <p className="font-medium text-gray-900 text-sm">{insight.title}</p>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{insight.body}</p>
            {insight.action && (
              <a
                href={insight.href || "#"}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {insight.action} <ChevronRight className="w-4 h-4" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
