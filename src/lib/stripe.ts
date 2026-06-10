import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

export const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    priceId: null,
    articles: 2,
    features: [
      "2 articles per month",
      "Basic SEO scoring",
      "Markdown export",
    ],
  },
  STARTER: {
    name: "Starter",
    price: 29,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    articles: 10,
    features: [
      "10 articles per month",
      "Advanced SEO scoring",
      "Keyword research tool",
      "All export formats",
      "Email support",
    ],
  },
  PRO: {
    name: "Pro",
    price: 79,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    articles: 50,
    features: [
      "50 articles per month",
      "Advanced SEO scoring",
      "Keyword research tool",
      "All export formats",
      "Priority email support",
      "Custom tone & style",
      "Bulk generation",
    ],
  },
  AGENCY: {
    name: "Agency",
    price: 199,
    priceId: process.env.STRIPE_AGENCY_PRICE_ID!,
    articles: 999,
    features: [
      "Unlimited articles",
      "Advanced SEO scoring",
      "Keyword research tool",
      "All export formats",
      "Priority support",
      "Custom tone & style",
      "Bulk generation",
      "API access",
      "White-label exports",
      "Team seats (5 users)",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export async function createCheckoutSession(
  customerId: string | null,
  priceId: string,
  userId: string,
  userEmail: string
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId ?? undefined,
    customer_email: customerId ? undefined : userEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
    metadata: { userId },
    subscription_data: {
      trial_period_days: 7,
      metadata: { userId },
    },
    allow_promotion_codes: true,
  });

  return session.url!;
}

export async function createPortalSession(customerId: string): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  });

  return session.url;
}
