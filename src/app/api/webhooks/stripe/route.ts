import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        const priceId = subscription.items.data[0].price.id;
        const planMap: Record<string, string> = {
          [process.env.STRIPE_STARTER_PRICE_ID!]: "STARTER",
          [process.env.STRIPE_PRO_PRICE_ID!]: "PRO",
          [process.env.STRIPE_AGENCY_PRICE_ID!]: "AGENCY",
        };

        await db.subscription.upsert({
          where: { userId },
          update: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            plan: (planMap[priceId] ?? "STARTER") as any,
            status: "ACTIVE",
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
          create: {
            userId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            plan: (planMap[priceId] ?? "STARTER") as any,
            status: "ACTIVE",
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const sub = invoice.subscription as string;
        if (sub) {
          const dbSub = await db.subscription.findFirst({
            where: { stripeSubscriptionId: sub },
          });
          if (dbSub) {
            await db.subscription.update({
              where: { id: dbSub.id },
              data: { status: "PAST_DUE" },
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await db.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: "CANCELED", plan: "FREE" },
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0].price.id;
        const planMap: Record<string, string> = {
          [process.env.STRIPE_STARTER_PRICE_ID!]: "STARTER",
          [process.env.STRIPE_PRO_PRICE_ID!]: "PRO",
          [process.env.STRIPE_AGENCY_PRICE_ID!]: "AGENCY",
        };

        await db.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            plan: (planMap[priceId] ?? "FREE") as any,
            status: subscription.status === "active" ? "ACTIVE" : "PAST_DUE",
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });
        break;
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
