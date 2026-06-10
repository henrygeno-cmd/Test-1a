import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma/db";
import { qualifyLead } from "@/lib/ai/qualify";
import { z } from "zod";

// Public API — no auth, CORS already set in next.config
const schema = z.object({
  organizationId: z.string(),
  action: z.enum(["init", "message", "submit"]),
  sessionId: z.string().optional(),
  message: z.string().optional(),
  leadData: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    serviceType: z.string().optional(),
    notes: z.string().optional(),
    answers: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  }).optional(),
});

const QUALIFICATION_QUESTIONS_BY_INDUSTRY: Record<string, string[]> = {
  HVAC: [
    "Is this a repair or new installation?",
    "How old is your current HVAC system?",
    "Is the system completely not working, or just underperforming?",
    "What is the approximate square footage of the space?",
    "When do you need this addressed?",
  ],
  ROOFING: [
    "Do you need a full roof replacement or just repairs?",
    "Are you experiencing any active leaks?",
    "How old is your current roof?",
    "What type of roofing material do you prefer?",
    "Do you have homeowner's insurance that might cover this?",
  ],
  LANDSCAPING: [
    "Are you looking for one-time service or ongoing maintenance?",
    "How large is your property?",
    "What services are you interested in (mowing, design, irrigation)?",
    "Do you have a budget range in mind?",
    "When would you like service to start?",
  ],
  DEFAULT: [
    "What specific service do you need?",
    "How soon do you need this done?",
    "Can you describe the scope of work?",
    "Do you have a budget range in mind?",
    "What is your address for service?",
  ],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { organizationId, action, message, leadData } = parsed.data;

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, industry: true, widgetGreeting: true, widgetEnabled: true, primaryColor: true },
    });

    if (!org || !org.widgetEnabled) {
      return NextResponse.json({ error: "Widget not available" }, { status: 404 });
    }

    if (action === "init") {
      const questions =
        QUALIFICATION_QUESTIONS_BY_INDUSTRY[org.industry] ||
        QUALIFICATION_QUESTIONS_BY_INDUSTRY.DEFAULT;

      return NextResponse.json({
        greeting: org.widgetGreeting,
        businessName: org.name,
        primaryColor: org.primaryColor,
        firstQuestion: "What's your name?",
        questions: questions.slice(0, 3),
      });
    }

    if (action === "submit" && leadData) {
      let aiResult = null;
      try {
        aiResult = await qualifyLead(
          {
            firstName: leadData.firstName || "Unknown",
            ...leadData,
            answers: leadData.answers || [],
          },
          org.industry
        );
      } catch (err) {
        console.error("Widget AI qualification failed:", err);
      }

      const lead = await db.lead.create({
        data: {
          organizationId: org.id,
          firstName: leadData.firstName || "Website Visitor",
          lastName: leadData.lastName,
          email: leadData.email || null,
          phone: leadData.phone,
          serviceType: leadData.serviceType,
          source: "CHAT_WIDGET",
          notes: leadData.notes,
          score: aiResult?.score ?? 0,
          isQualified: aiResult?.isQualified ?? false,
          isHighValue: aiResult?.isHighValue ?? false,
          urgency: (aiResult?.urgency ?? "MEDIUM") as any,
          estimatedValue: aiResult?.estimatedValue,
          aiSummary: aiResult?.summary,
          aiSuggestedResponse: aiResult?.suggestedResponse,
        },
      });

      if (leadData.answers && leadData.answers.length > 0) {
        await db.qualificationAnswer.createMany({
          data: leadData.answers.map((a) => ({ leadId: lead.id, question: a.question, answer: a.answer })),
        });
      }

      return NextResponse.json({
        success: true,
        message: aiResult?.suggestedResponse ||
          `Thanks, ${leadData.firstName || "there"}! We've received your information and will be in touch shortly.`,
        leadId: lead.id,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Widget error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { name: true, widgetGreeting: true, primaryColor: true, widgetPosition: true, widgetEnabled: true },
  });

  if (!org || !org.widgetEnabled) {
    return NextResponse.json({ error: "Widget not configured" }, { status: 404 });
  }

  return NextResponse.json(org);
}
