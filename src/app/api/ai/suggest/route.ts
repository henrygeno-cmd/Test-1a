import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { db } from "@/lib/prisma/db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are LeadFlow AI, an expert sales assistant for local home service businesses (HVAC, roofing, landscaping, pressure washing, home cleaning, etc.).

You help business owners:
- Prioritize and manage their leads
- Write compelling follow-up messages (email & SMS)
- Build effective sales sequences
- Improve conversion rates
- Coach on sales best practices for home service businesses

Your responses are:
- Concise and actionable (business owners are busy)
- Specific to home service industry dynamics
- Formatted with markdown for readability
- Focused on closing jobs and growing revenue

When writing messages, make them feel human and personalized — not automated.`;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message, history } = await request.json();

    // Get org context
    let orgContext = "";
    try {
      const member = await db.orgMember.findUnique({
        where: { clerkUserId: userId },
        include: {
          organization: {
            select: { name: true, industry: true },
          },
        },
      });
      if (member?.organization) {
        orgContext = `\n\nBusiness context: ${member.organization.name} (${member.organization.industry} company)`;
      }
    } catch {}

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT + orgContext },
      ...(history || []).map((h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 800,
    });

    return NextResponse.json({
      response: response.choices[0]?.message?.content || "I couldn't generate a response. Please try again.",
    });
  } catch (err) {
    console.error("AI suggest error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
