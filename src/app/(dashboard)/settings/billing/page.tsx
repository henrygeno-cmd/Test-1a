"use client";

import { useState } from "react";
import { CreditCard, CheckCircle, Zap, Star, Crown, ExternalLink, Loader2 } from "lucide-react";
import { PLANS } from "@/lib/stripe";
import { formatCurrency } from "@/lib/utils";

export default function BillingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [currentPlan] = useState("STARTER");
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string, priceId: string) => {
    setLoading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } finally {
      setLoading(null);
    }
  };

  const planIcons = { STARTER: Zap, GROWTH: Star, PRO: Crown };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Current plan */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Current Plan</p>
            <h2 className="text-3xl font-bold">Starter</h2>
            <p className="text-blue-200 mt-1">$49/month · Renews July 10, 2026</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3">
            <Zap className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="bg-white/10 rounded-lg px-3 py-2 text-sm">
            <span className="text-blue-200">Leads used:</span> <span className="font-semibold">47 / 100</span>
          </div>
          <button
            onClick={handleManageBilling}
            disabled={loading === "portal"}
            className="flex items-center gap-2 bg-white text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            {loading === "portal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Manage Billing
          </button>
        </div>
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 rounded-xl p-1 flex gap-1">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              billing === "monthly" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              billing === "yearly" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Yearly
            <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">-20%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = planIcons[plan.tier as keyof typeof planIcons] || Zap;
          const isCurrent = currentPlan === plan.tier;
          const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
          const priceId = billing === "monthly" ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border-2 p-6 ${
                isCurrent ? "border-blue-500 shadow-lg shadow-blue-50" : "border-gray-200"
              }`}
            >
              {isCurrent && (
                <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">
                  Current Plan
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-500">{plan.description}</p>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-4xl font-black text-gray-900">{formatCurrency(price)}</span>
                <span className="text-gray-500">/mo</span>
                {billing === "yearly" && (
                  <p className="text-xs text-green-600 mt-1">
                    You save {formatCurrency((plan.monthlyPrice - plan.yearlyPrice) * 12)}/year
                  </p>
                )}
              </div>

              <ul className="space-y-2 mb-6">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{h}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  onClick={handleManageBilling}
                  className="w-full py-2.5 border-2 border-blue-200 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                  Manage Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id, priceId)}
                  disabled={loading === plan.id}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading === plan.id ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Usage stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Usage This Month</h2>
        <div className="space-y-4">
          {[
            { label: "Leads Captured", used: 47, limit: 100 },
            { label: "AI Qualifications", used: 31, limit: 100 },
            { label: "Emails Sent", used: 89, limit: 500 },
            { label: "Landing Pages", used: 1, limit: 1 },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{item.label}</span>
                <span className="text-sm font-medium text-gray-900">
                  {item.used} / {item.limit === -1 ? "∞" : item.limit}
                </span>
              </div>
              {item.limit !== -1 && (
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.used / item.limit > 0.9 ? "bg-red-500" :
                      item.used / item.limit > 0.7 ? "bg-yellow-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${Math.min((item.used / item.limit) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
