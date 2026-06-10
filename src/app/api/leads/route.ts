import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma/db";
import { qualifyLead } from "@/lib/ai/qualify";
import { newLeadNotificationEmail } from "@/lib/email/resend";
import { z } from "zod";

const CreateLeadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  serviceType: z.string().optional(),
  source: z.string().default("WEBSITE"),
  notes: z.string().optional(),
  qualifyWithAI: z.boolean().default(true),
  answers: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = CreateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { qualifyWithAI, answers, ...leadData } = parsed.data;

    const member = await db.orgMember.findUnique({
      where: { clerkUserId: userId },
      include: { organization: { select: { id: true, name: true, industry: true, email: true } } },
    });

    if (!member) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const org = member.organization;
    let aiData: { score: number; isQualified: boolean; isHighValue: boolean; urgency: string; estimatedValue: number; aiSummary: string; aiSuggestedResponse: string } | null = null;

    if (qualifyWithAI) {
      try {
        const result = await qualifyLead(
          {
            ...leadData,
            email: leadData.email || undefined,
            answers: answers || [],
          },
          org.industry
        );
        aiData = {
          score: result.score,
          isQualified: result.isQualified,
          isHighValue: result.isHighValue,
          urgency: result.urgency,
          estimatedValue: result.estimatedValue,
          aiSummary: result.summary,
          aiSuggestedResponse: result.suggestedResponse,
        };
      } catch (err) {
        console.error("AI qualification failed:", err);
      }
    }

    const lead = await db.lead.create({
      data: {
        organizationId: org.id,
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        email: leadData.email || null,
        phone: leadData.phone,
        serviceType: leadData.serviceType,
        source: leadData.source as any,
        notes: leadData.notes,
        score: aiData?.score ?? 0,
        isQualified: aiData?.isQualified ?? false,
        isHighValue: aiData?.isHighValue ?? false,
        urgency: (aiData?.urgency ?? "MEDIUM") as any,
        estimatedValue: aiData?.estimatedValue,
        aiSummary: aiData?.aiSummary,
        aiSuggestedResponse: aiData?.aiSuggestedResponse,
      },
    });

    // Save answers if provided
    if (answers && answers.length > 0) {
      await db.qualificationAnswer.createMany({
        data: answers.map((a) => ({ leadId: lead.id, question: a.question, answer: a.answer })),
      });
    }

    // Log activity
    await db.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "CREATED",
        description: `Lead created via ${leadData.source}`,
        metadata: { qualifiedByAI: qualifyWithAI, score: lead.score },
      },
    });

    // Notify business owner
    if (org.email) {
      try {
        await newLeadNotificationEmail({
          businessName: org.name,
          ownerEmail: org.email,
          lead: {
            firstName: lead.firstName,
            lastName: lead.lastName || undefined,
            email: lead.email || undefined,
            phone: lead.phone || undefined,
            serviceType: lead.serviceType || undefined,
            score: lead.score,
            urgency: lead.urgency,
          },
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/leads/${lead.id}`,
        });
      } catch (err) {
        console.error("Failed to send notification email:", err);
      }
    }

    return NextResponse.json({ lead, aiData }, { status: 201 });
  } catch (err) {
    console.error("Create lead error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const member = await db.orgMember.findUnique({
      where: { clerkUserId: userId },
      select: { organizationId: true },
    });
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "50");
    const status = searchParams.get("status");
    const urgency = searchParams.get("urgency");
    const source = searchParams.get("source");
    const highValue = searchParams.get("highValue") === "true";
    const search = searchParams.get("search") || "";

    const where: any = { organizationId: member.organizationId };
    if (status) where.status = status;
    if (urgency) where.urgency = urgency;
    if (source) where.source = source;
    if (highValue) where.isHighValue = true;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { serviceType: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, leads] = await Promise.all([
      db.lead.count({ where }),
      db.lead.findMany({
        where,
        orderBy: [{ score: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return NextResponse.json({
      data: leads,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (err) {
    console.error("Get leads error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
