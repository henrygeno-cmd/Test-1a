import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateArticle } from "@/lib/openai";
import { calculateSeoScore, slugify } from "@/lib/utils";
import { sendArticleReadyEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { articleId } = body;

  if (!articleId) {
    return NextResponse.json({ error: "articleId required" }, { status: 400 });
  }

  const article = await db.article.findFirst({
    where: { id: articleId, userId: session.user.id },
    include: { user: true },
  });

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  if (article.status === "GENERATING") {
    return NextResponse.json({ error: "Already generating" }, { status: 409 });
  }

  // Mark as generating
  await db.article.update({
    where: { id: articleId },
    data: { status: "GENERATING" },
  });

  try {
    const generated = await generateArticle({
      keyword: article.keyword,
      title: article.title,
      tone: article.tone,
      targetAudience: article.targetAudience ?? undefined,
      userId: session.user.id,
    });

    const seoScore = calculateSeoScore(generated.content, article.keyword);

    const updated = await db.article.update({
      where: { id: articleId },
      data: {
        title: generated.title,
        content: generated.content,
        metaTitle: generated.metaTitle,
        metaDescription: generated.metaDescription,
        slug: slugify(generated.slug),
        wordCount: generated.wordCount,
        seoScore,
        status: "READY",
      },
    });

    // Increment usage counter
    await db.subscription.updateMany({
      where: { userId: session.user.id },
      data: { articlesUsedThisMonth: { increment: 1 } },
    });

    // Send notification email
    if (article.user.email) {
      await sendArticleReadyEmail(
        article.user.email,
        article.user.name ?? "there",
        generated.title,
        articleId
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    await db.article.update({
      where: { id: articleId },
      data: { status: "FAILED" },
    });

    console.error("Generation failed:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
