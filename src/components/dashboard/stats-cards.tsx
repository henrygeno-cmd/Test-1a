"use client";

import { TrendingUp, Users, Star, DollarSign, Zap, Target, Award, ArrowUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Stats = {
  totalLeads: number;
  newToday: number;
  newThisMonth: number;
  qualifiedLeads: number;
  highValueLeads: number;
  totalRevenue: number;
  conversionRate: number;
  activeAutomations: number;
};

export function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    {
      title: "Total Leads",
      value: stats.totalLeads.toLocaleString(),
      change: `+${stats.newToday} today`,
      icon: Users,
      color: "blue",
      trend: "up",
    },
    {
      title: "Qualified Leads",
      value: stats.qualifiedLeads.toLocaleString(),
      change: `${stats.totalLeads > 0 ? Math.round((stats.qualifiedLeads / stats.totalLeads) * 100) : 0}% rate`,
      icon: Target,
      color: "green",
      trend: "up",
    },
    {
      title: "Pipeline Value",
      value: formatCurrency(stats.totalRevenue),
      change: `${stats.newThisMonth} leads this month`,
      icon: DollarSign,
      color: "purple",
      trend: "up",
    },
    {
      title: "Close Rate",
      value: `${stats.conversionRate}%`,
      change: "industry avg: 18%",
      icon: TrendingUp,
      color: "orange",
      trend: stats.conversionRate > 18 ? "up" : "down",
    },
    {
      title: "High-Value Leads",
      value: stats.highValueLeads.toLocaleString(),
      change: "$2,000+ est. value",
      icon: Star,
      color: "yellow",
      trend: "up",
    },
    {
      title: "Active Automations",
      value: stats.activeAutomations.toLocaleString(),
      change: "running 24/7",
      icon: Zap,
      color: "teal",
      trend: "up",
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; light: string }> = {
    blue: { bg: "bg-blue-600", text: "text-blue-600", light: "bg-blue-50" },
    green: { bg: "bg-green-600", text: "text-green-600", light: "bg-green-50" },
    purple: { bg: "bg-purple-600", text: "text-purple-600", light: "bg-purple-50" },
    orange: { bg: "bg-orange-500", text: "text-orange-600", light: "bg-orange-50" },
    yellow: { bg: "bg-yellow-500", text: "text-yellow-600", light: "bg-yellow-50" },
    teal: { bg: "bg-teal-600", text: "text-teal-600", light: "bg-teal-50" },
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => {
        const colors = colorMap[card.color];
        return (
          <div
            key={card.title}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.title}</p>
              <div className={`w-8 h-8 rounded-lg ${colors.light} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${colors.text}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
            <div className="flex items-center gap-1">
              {card.trend === "up" && <ArrowUp className="w-3 h-3 text-green-500" />}
              <p className="text-xs text-gray-500">{card.change}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
