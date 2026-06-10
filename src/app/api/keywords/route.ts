import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateKeywordIdeas } from "@/lib/openai";
import { z } from "zod";

const researchSchema = z.object({
  seed: z.string().min(2).max(100),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check plan - keyword research requires at least STARTER
  const subscription = await db.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (!subscription || subscription.plan === "FREE") {
    return NextResponse.json(
      { error: "Keyword research requires a paid plan" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = researchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const keywords = await generateKeywordIdeas(parsed.data.seed, session.user.id);

  // Save keywords to DB
  const saved = await db.$transaction(
    keywords.map((kw) =>
      db.keyword.create({
        data: {
          userId: session.user.id,
          keyword: kw.keyword,
          intent: kw.intent,
          relatedKeywords: kw.relatedKeywords,
        },
      })
    )
  );

  return NextResponse.json({ keywords: saved });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keywords = await db.keyword.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ keywords });
}
