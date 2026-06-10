import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe, createBillingPortalSession } from "@/lib/stripe";
import { db } from "@/lib/prisma/db";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await db.orgMember.findUnique({
    where: { clerkUserId: userId },
    select: { organizationId: true },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const subscription = await db.subscription.findUnique({
    where: { organizationId: member.organizationId },
    select: { stripeCustomerId: true },
  });
  if (!subscription) return NextResponse.json({ error: "No subscription found" }, { status: 404 });

  const session = await createBillingPortalSession(
    subscription.stripeCustomerId,
    `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`
  );

  return NextResponse.json({ url: session.url });
}
