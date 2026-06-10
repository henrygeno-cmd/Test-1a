"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle, Zap, Star, Crown } from "lucide-react";
import { PLANS } from "@/lib/stripe";
import { formatCurrency } from "@/lib/utils";

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-24 max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-600">
            Start free for 14 days. No credit card required. Cancel anytime.
          </p>
          <div className="flex justify-center mt-8">
            <div className="bg-gray-100 rounded-xl p-1 flex gap-1">
              <button onClick={() => setBilling("monthly")} className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${billing === "monthly" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>Monthly</button>
              <button onClick={() => setBilling("yearly")} className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${billing === "yearly" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
                Yearly <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan) => {
            const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
            const isPopular = plan.tier === "GROWTH";
            const Icon = plan.tier === "PRO" ? Crown : plan.tier === "GROWTH" ? Star : Zap;

            return (
              <div key={plan.id} className={`rounded-2xl border-2 p-8 ${isPopular ? "border-blue-500 shadow-2xl shadow-blue-50 scale-105" : "border-gray-200"} relative`}>
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                    <p className="text-xs text-gray-500">{plan.description}</p>
                  </div>
                </div>
                <div className="mb-6">
                  <span className="text-5xl font-black text-gray-900">{formatCurrency(price)}</span>
                  <span className="text-gray-500">/mo</span>
                  {billing === "yearly" && (
                    <p className="text-sm text-green-600 mt-1">
                      Save {formatCurrency((plan.monthlyPrice - plan.yearlyPrice) * 12)}/year
                    </p>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{h}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={`block text-center py-3.5 rounded-xl font-semibold transition-all ${
                    isPopular
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                      : "border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  Start Free Trial
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-500 mb-4">All plans include:</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            {["14-day free trial", "No setup fees", "Cancel anytime", "Data export", "99.9% uptime SLA", "SOC 2 compliant"].map((f) => (
              <span key={f} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
