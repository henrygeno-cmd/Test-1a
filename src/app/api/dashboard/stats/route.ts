import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [
    totalArticles,
    readyArticles,
    thisMonthArticles,
    subscription,
    recentArticles,
    totalKeywords,
  ] = await Promise.all([
    db.article.count({ where: { userId } }),
    db.article.count({ where: { userId, status: "READY" } }),
    db.article.count({
      where: {
        userId,
        createdAt: { gte: new Date(new Date().setDate(1)) },
      },
    }),
    db.subscription.findUnique({ where: { userId } }),
    db.article.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        keyword: true,
        status: true,
        seoScore: true,
        wordCount: true,
        createdAt: true,
      },
    }),
    db.keyword.count({ where: { userId } }),
  ]);

  const limits: Record<string, number> = { FREE: 2, STARTER: 10, PRO: 50, AGENCY: 999 };
  const plan = subscription?.plan ?? "FREE";
  const monthlyLimit = limits[plan] ?? 2;

  return NextResponse.json({
    totalArticles,
    readyArticles,
    thisMonthArticles,
    articlesUsed: subscription?.articlesUsedThisMonth ?? 0,
    monthlyLimit,
    plan,
    totalKeywords,
    recentArticles,
  });
}
