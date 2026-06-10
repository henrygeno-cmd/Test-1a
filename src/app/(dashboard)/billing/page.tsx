"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { CreditCard, Check, Loader2, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const plans = [
  {
    key: "STARTER",
    name: "Starter",
    price: "$29",
    articles: 10,
    features: ["10 articles/month", "SEO scoring", "Keyword research", "All exports", "Email support"],
  },
  {
    key: "PRO",
    name: "Pro",
    price: "$79",
    articles: 50,
    popular: true,
    features: ["50 articles/month", "Everything in Starter", "Bulk generation", "Custom tone", "Priority support"],
  },
  {
    key: "AGENCY",
    name: "Agency",
    price: "$199",
    articles: 999,
    features: ["Unlimited articles", "Everything in Pro", "API access", "White-label", "5 team seats"],
  },
];

type Plan = {
  key: string;
  name: string;
  price: string;
  articles: number;
  popular?: boolean;
  features: readonly string[];
};

export default function BillingPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("FREE");

  useEffect(() => {
    // Get plan from session JWT
    const token = session as any;
    setCurrentPlan(token?.plan ?? "FREE");
  }, [session]);

  async function handleUpgrade(planKey: string) {
    setLoading(planKey);
    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      toast({ title: "Error", description: "Failed to start checkout", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      toast({ title: "Error", description: "Failed to open billing portal", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-500 mt-1">Manage your subscription and usage</p>
        </div>
        {currentPlan !== "FREE" && (
          <Button variant="outline" onClick={handlePortal} disabled={portalLoading} className="gap-2">
            {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Manage Subscription
          </Button>
        )}
      </div>

      {/* Current plan banner */}
      <Card className="bg-indigo-50 border-indigo-100">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-indigo-900">
                You're on the <span className="capitalize">{currentPlan.toLowerCase()}</span> plan
              </p>
              <p className="text-sm text-indigo-700">
                {currentPlan === "FREE" ? "Upgrade to unlock more articles and features" : "Thank you for your subscription!"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {(plans as Plan[]).map((plan) => {
          const isCurrent = currentPlan === plan.key;
          return (
            <Card key={plan.key} className={`relative ${plan.popular ? "border-indigo-300 shadow-md" : ""}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-indigo-600 text-white">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && <Badge variant="success">Current</Badge>}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">/mo</span>
                </div>
                <CardDescription>{plan.articles === 999 ? "Unlimited" : plan.articles} articles/month</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : plan.popular ? "default" : "outline"}
                  disabled={isCurrent || loading === plan.key}
                  onClick={() => !isCurrent && handleUpgrade(plan.key)}
                >
                  {loading === plan.key ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : (
                    "Upgrade"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
