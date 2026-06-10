"use client";

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart, Legend
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const MONTHLY_REVENUE = [
  { month: "Jan", revenue: 12400, leads: 28 },
  { month: "Feb", revenue: 18200, leads: 34 },
  { month: "Mar", revenue: 22100, leads: 41 },
  { month: "Apr", revenue: 19800, leads: 37 },
  { month: "May", revenue: 28900, leads: 52 },
  { month: "Jun", revenue: 34200, leads: 61 },
];

const CONVERSION_FUNNEL = [
  { stage: "Leads Captured", count: 100, color: "#2563eb" },
  { stage: "AI Qualified", count: 73, color: "#7c3aed" },
  { stage: "Contacted", count: 58, color: "#0891b2" },
  { stage: "Proposal Sent", count: 41, color: "#d97706" },
  { stage: "Negotiating", count: 29, color: "#ea580c" },
  { stage: "Closed Won", count: 18, color: "#16a34a" },
];

const SOURCE_PERFORMANCE = [
  { source: "Website", leads: 38, closed: 14, revenue: 42000 },
  { source: "Chat Widget", leads: 29, closed: 11, revenue: 38000 },
  { source: "Landing Page", leads: 18, closed: 7, revenue: 28000 },
  { source: "Referral", leads: 12, closed: 6, revenue: 24000 },
  { source: "Google Ads", leads: 8, closed: 2, revenue: 8400 },
];

const MRR_DATA = [
  { month: "Jan", mrr: 4900, churn: 200 },
  { month: "Feb", mrr: 6300, churn: 300 },
  { month: "Mar", mrr: 8200, churn: 400 },
  { month: "Apr", mrr: 10400, churn: 500 },
  { month: "May", mrr: 13100, churn: 600 },
  { month: "Jun", mrr: 16800, churn: 700 },
];

const KPI_CARDS = [
  { title: "Monthly Revenue", value: "$34,200", change: "+18.4%", trend: "up", icon: DollarSign, color: "green" },
  { title: "Lead Conversion Rate", value: "18%", change: "+4.2%", trend: "up", icon: Target, color: "blue" },
  { title: "Avg. Lead Score", value: "72/100", change: "+8 pts", trend: "up", icon: Zap, color: "purple" },
  { title: "Cost Per Lead", value: "$12.40", change: "-22%", trend: "up", icon: TrendingDown, color: "orange" },
  { title: "Customer LTV", value: "$4,800", change: "+12%", trend: "up", icon: Users, color: "teal" },
  { title: "Avg. Close Time", value: "4.2 days", change: "-1.3 days", trend: "up", icon: TrendingUp, color: "indigo" },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {KPI_CARDS.map((kpi) => (
          <div key={kpi.title} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">{kpi.title}</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">{kpi.value}</p>
            <p className={`text-xs font-medium flex items-center gap-1 ${kpi.trend === "up" ? "text-green-600" : "text-red-600"}`}>
              <TrendingUp className="w-3 h-3" />
              {kpi.change} vs last month
            </p>
          </div>
        ))}
      </div>

      {/* Revenue Chart + Funnel */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue over time */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-6">Revenue & Leads Over Time</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={MONTHLY_REVENUE}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v, n) => [n === "revenue" ? formatCurrency(Number(v)) : v, n === "revenue" ? "Revenue" : "Leads"]} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="url(#revenueGradient)" strokeWidth={2} />
              <Line type="monotone" dataKey="leads" stroke="#7c3aed" strokeWidth={2} dot={false} yAxisId={1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-6">Conversion Funnel</h2>
          <div className="space-y-3">
            {CONVERSION_FUNNEL.map((stage, i) => (
              <div key={stage.stage}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{stage.stage}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">{stage.count}</span>
                    {i > 0 && (
                      <span className="text-xs text-gray-400">
                        {Math.round((stage.count / CONVERSION_FUNNEL[0].count) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(stage.count / CONVERSION_FUNNEL[0].count) * 100}%`,
                      backgroundColor: stage.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Source Performance + MRR */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Source Performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-6">Lead Source Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Leads</th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Closed</th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Conv. Rate</th>
                  <th className="pb-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {SOURCE_PERFORMANCE.map((row) => (
                  <tr key={row.source}>
                    <td className="py-3 text-sm font-medium text-gray-900">{row.source}</td>
                    <td className="py-3 text-sm text-gray-600">{row.leads}</td>
                    <td className="py-3 text-sm text-gray-600">{row.closed}</td>
                    <td className="py-3">
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded font-medium">
                        {Math.round((row.closed / row.leads) * 100)}%
                      </span>
                    </td>
                    <td className="py-3 text-sm font-semibold text-gray-900">
                      {formatCurrency(row.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MRR Growth */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-6">MRR Growth</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={MRR_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [formatCurrency(Number(v)), ""]} />
              <Bar dataKey="mrr" fill="#2563eb" radius={[4, 4, 0, 0]} name="MRR" />
              <Bar dataKey="churn" fill="#f87171" radius={[4, 4, 0, 0]} name="Churned MRR" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500">Current MRR</p>
              <p className="text-lg font-bold text-gray-900">$16,800</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Churn Rate</p>
              <p className="text-lg font-bold text-gray-900">4.2%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">MoM Growth</p>
              <p className="text-lg font-bold text-green-600">+28%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
