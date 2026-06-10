import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCheckoutSession, PLANS } from "@/lib/stripe";
import { z } from "zod";

const schema = z.object({
  plan: z.enum(["STARTER", "PRO", "AGENCY"]),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const plan = PLANS[parsed.data.plan];
  if (!plan.priceId) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const subscription = await db.subscription.findUnique({
    where: { userId: session.user.id },
  });

  const url = await createCheckoutSession(
    subscription?.stripeCustomerId ?? null,
    plan.priceId,
    session.user.id,
    session.user.email
  );

  return NextResponse.json({ url });
}
