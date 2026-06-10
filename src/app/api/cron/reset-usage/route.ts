import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Called by Vercel Cron on the 1st of each month
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db.subscription.updateMany({
    data: { articlesUsedThisMonth: 0 },
  });

  console.log(`Reset usage for ${result.count} subscriptions`);
  return NextResponse.json({ reset: result.count });
}
