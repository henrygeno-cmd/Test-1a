import Stripe from "stripe";
import type { Plan } from "@/types";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tier: "STARTER",
    monthlyPrice: 49,
    yearlyPrice: 39,
    description: "Perfect for solo operators getting started with lead automation",
    stripePriceIdMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || "",
    stripePriceIdYearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID || "",
    highlights: [
      "Up to 100 leads/month",
      "AI lead capture widget",
      "Basic CRM dashboard",
      "Email follow-ups",
      "1 landing page",
    ],
    features: {
      leads: 100,
      smsAutomation: false,
      emailAutomation: true,
      aiQualification: false,
      aiAssistant: false,
      customLandingPages: 1,
      teamMembers: 1,
      analytics: "basic",
      support: "email",
    },
  },
  {
    id: "growth",
    name: "Growth",
    tier: "GROWTH",
    monthlyPrice: 149,
    yearlyPrice: 119,
    description: "For growing businesses that need AI qualification and SMS automation",
    stripePriceIdMonthly: process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID || "",
    stripePriceIdYearly: process.env.STRIPE_GROWTH_YEARLY_PRICE_ID || "",
    highlights: [
      "Up to 500 leads/month",
      "AI lead qualification",
      "SMS + email automation",
      "Advanced analytics",
      "5 landing pages",
      "3 team members",
    ],
    features: {
      leads: 500,
      smsAutomation: true,
      emailAutomation: true,
      aiQualification: true,
      aiAssistant: false,
      customLandingPages: 5,
      teamMembers: 3,
      analytics: "advanced",
      support: "priority",
    },
  },
  {
    id: "pro",
    name: "Pro",
    tier: "PRO",
    monthlyPrice: 299,
    yearlyPrice: 239,
    description: "For high-volume businesses that demand full AI automation and unlimited scale",
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "",
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || "",
    highlights: [
      "Unlimited leads",
      "Full AI assistant",
      "Advanced automation",
      "Full analytics suite",
      "Unlimited landing pages",
      "Unlimited team members",
      "Dedicated support",
    ],
    features: {
      leads: "unlimited",
      smsAutomation: true,
      emailAutomation: true,
      aiQualification: true,
      aiAssistant: true,
      customLandingPages: -1,
      teamMembers: -1,
      analytics: "full",
      support: "dedicated",
    },
  },
];

export async function createOrRetrieveCustomer(
  email: string,
  name: string,
  orgId: string
): Promise<string> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) return existing.data[0].id;

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { organizationId: orgId },
  });
  return customer.id;
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  orgId: string,
  successUrl: string,
  cancelUrl: string
) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: { organizationId: orgId },
      trial_period_days: 14,
    },
    allow_promotion_codes: true,
  });
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export function getPlanByPriceId(priceId: string): Plan | undefined {
  return PLANS.find(
    (p) => p.stripePriceIdMonthly === priceId || p.stripePriceIdYearly === priceId
  );
}
