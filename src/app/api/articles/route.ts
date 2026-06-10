import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createArticleSchema = z.object({
  keyword: z.string().min(2).max(200),
  title: z.string().optional(),
  tone: z.enum(["professional", "casual", "technical", "conversational"]).default("professional"),
  targetAudience: z.string().optional(),
  wordCount: z.number().min(500).max(3000).default(1500),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 10);
  const status = searchParams.get("status");

  const where = {
    userId: session.user.id,
    ...(status ? { status: status as any } : {}),
  };

  const [articles, total] = await Promise.all([
    db.article.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        keyword: true,
        status: true,
        wordCount: true,
        seoScore: true,
        createdAt: true,
        updatedAt: true,
        slug: true,
      },
    }),
    db.article.count({ where }),
  ]);

  return NextResponse.json({ articles, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createArticleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Check usage limits
  const subscription = await db.subscription.findUnique({
    where: { userId: session.user.id },
  });

  const limits: Record<string, number> = { FREE: 2, STARTER: 10, PRO: 50, AGENCY: 999 };
  const plan = subscription?.plan ?? "FREE";
  const limit = limits[plan] ?? 2;
  const used = subscription?.articlesUsedThisMonth ?? 0;

  if (used >= limit) {
    return NextResponse.json(
      { error: "Monthly article limit reached. Please upgrade your plan." },
      { status: 403 }
    );
  }

  const article = await db.article.create({
    data: {
      userId: session.user.id,
      keyword: parsed.data.keyword,
      title: parsed.data.title ?? parsed.data.keyword,
      tone: parsed.data.tone,
      targetAudience: parsed.data.targetAudience,
      status: "DRAFT",
    },
  });

  return NextResponse.json(article, { status: 201 });
}
