import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const article = await db.article.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(article);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const article = await db.article.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await db.article.update({
    where: { id: params.id },
    data: {
      title: body.title ?? article.title,
      content: body.content ?? article.content,
      metaTitle: body.metaTitle ?? article.metaTitle,
      metaDescription: body.metaDescription ?? article.metaDescription,
      status: body.status ?? article.status,
      publishedUrl: body.publishedUrl ?? article.publishedUrl,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const article = await db.article.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.article.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
