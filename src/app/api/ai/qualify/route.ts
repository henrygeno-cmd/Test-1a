import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { qualifyLead, generateFollowUpSequence } from "@/lib/ai/qualify";
import { db } from "@/lib/prisma/db";
import { z } from "zod";

const schema = z.object({
  leadId: z.string().optional(),
  leadData: z.object({
    firstName: z.string(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    serviceType: z.string().optional(),
    notes: z.string().optional(),
    source: z.string().optional(),
    answers: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  }),
  generateSequence: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const member = await db.orgMember.findUnique({
      where: { clerkUserId: userId },
      include: { organization: { select: { id: true, name: true, industry: true } } },
    });
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { leadId, leadData, generateSequence } = parsed.data;
    const org = member.organization;

    const [qualification, sequence] = await Promise.all([
      qualifyLead(leadData, org.industry),
      generateSequence
        ? generateFollowUpSequence({
            leadName: `${leadData.firstName} ${leadData.lastName || ""}`,
            serviceType: leadData.serviceType || "general service",
            businessName: org.name,
            industry: org.industry,
            estimatedValue: 0,
          })
        : Promise.resolve(null),
    ]);

    // Update lead in DB if leadId provided
    if (leadId) {
      await db.lead.update({
        where: { id: leadId, organizationId: org.id },
        data: {
          score: qualification.score,
          isQualified: qualification.isQualified,
          isHighValue: qualification.isHighValue,
          urgency: qualification.urgency as any,
          estimatedValue: qualification.estimatedValue,
          aiSummary: qualification.summary,
          aiSuggestedResponse: qualification.suggestedResponse,
        },
      });

      await db.leadActivity.create({
        data: {
          leadId,
          type: "AI_QUALIFIED",
          description: `AI qualified lead: score ${qualification.score}, urgency ${qualification.urgency}`,
          metadata: { qualification },
        },
      });
    }

    return NextResponse.json({ qualification, sequence });
  } catch (err) {
    console.error("AI qualify error:", err);
    return NextResponse.json({ error: "AI qualification failed" }, { status: 500 });
  }
}
