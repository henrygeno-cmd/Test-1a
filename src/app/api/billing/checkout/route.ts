import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe, createOrRetrieveCustomer, createCheckoutSession } from "@/lib/stripe";
import { db } from "@/lib/prisma/db";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { priceId } = await request.json();
  if (!priceId) return NextResponse.json({ error: "Missing priceId" }, { status: 400 });

  const member = await db.orgMember.findUnique({
    where: { clerkUserId: userId },
    include: { organization: { select: { id: true, name: true, email: true } } },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const org = member.organization;
  const email = member.email;

  const customerId = await createOrRetrieveCustomer(email, org.name, org.id);

  const session = await createCheckoutSession(
    customerId,
    priceId,
    org.id,
    `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
    `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?cancelled=true`
  );

  return NextResponse.json({ url: session.url });
}
