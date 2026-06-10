import OpenAI from "openai";
import type { QualificationResult } from "@/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const QUALIFICATION_SYSTEM_PROMPT = `You are an expert lead qualification AI for local home service businesses (HVAC, roofing, landscaping, pressure washing, home cleaning, etc.).

Your job is to analyze lead information and qualification answers, then:
1. Score the lead 0-100 based on quality signals
2. Determine urgency (LOW/MEDIUM/HIGH/EMERGENCY)
3. Estimate project value in USD
4. Identify if this is a high-value lead (>$2,000 estimated value)
5. Provide a brief summary for the business owner
6. Suggest the best first response message
7. Recommend the next action to take

Scoring criteria:
- Has phone AND email: +20 points
- Emergency/urgent situation: +25 points
- Specific service described: +15 points
- Homeowner (vs renter): +10 points
- Budget mentioned: +15 points
- Timeline within 2 weeks: +10 points
- Repeat customer signals: +5 points

Always respond with valid JSON matching the QualificationResult schema.`;

export async function qualifyLead(
  leadData: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    serviceType?: string;
    notes?: string;
    source?: string;
    answers?: { question: string; answer: string }[];
  },
  industry: string
): Promise<QualificationResult> {
  const prompt = `Qualify this lead for a ${industry} business:

Lead Info:
- Name: ${leadData.firstName} ${leadData.lastName || ""}
- Email: ${leadData.email || "not provided"}
- Phone: ${leadData.phone || "not provided"}
- Service Requested: ${leadData.serviceType || "not specified"}
- Notes: ${leadData.notes || "none"}
- Lead Source: ${leadData.source || "website"}

${
  leadData.answers && leadData.answers.length > 0
    ? `Qualification Answers:
${leadData.answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}`
    : ""
}

Return a JSON object with these exact fields:
{
  "score": number (0-100),
  "isQualified": boolean,
  "isHighValue": boolean,
  "urgency": "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY",
  "estimatedValue": number (USD),
  "summary": "2-3 sentence summary for the business owner",
  "suggestedResponse": "First message to send this lead (personalized, professional, 2-3 sentences)",
  "nextAction": "Specific next step to take",
  "questions": ["follow-up question 1", "follow-up question 2", "follow-up question 3"]
}`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: QUALIFICATION_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 600,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  return JSON.parse(content) as QualificationResult;
}

export async function generateLeadSummary(
  lead: {
    firstName: string;
    lastName?: string;
    serviceType?: string;
    notes?: string;
    score: number;
    urgency: string;
    estimatedValue?: number | null;
    activities?: { type: string; description: string; createdAt: Date }[];
    messages?: { content: string; direction: string; sentAt: Date }[];
  }
): Promise<string> {
  const activityLog =
    lead.activities
      ?.slice(-5)
      .map((a) => `${a.type}: ${a.description}`)
      .join("\n") || "No recent activity";

  const messageLog =
    lead.messages
      ?.slice(-3)
      .map((m) => `[${m.direction}] ${m.content}`)
      .join("\n") || "No messages";

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a sales AI assistant. Write concise, actionable lead summaries in 2-3 sentences. Focus on key signals and recommended action.",
      },
      {
        role: "user",
        content: `Summarize this lead:
Name: ${lead.firstName} ${lead.lastName || ""}
Service: ${lead.serviceType || "unknown"}
Score: ${lead.score}/100
Urgency: ${lead.urgency}
Est. Value: $${lead.estimatedValue || 0}
Recent Activity:
${activityLog}
Recent Messages:
${messageLog}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 200,
  });

  return (
    response.choices[0]?.message?.content || "Unable to generate summary."
  );
}

export async function suggestResponse(
  context: {
    leadName: string;
    serviceType?: string;
    lastMessage?: string;
    conversationHistory?: string;
    businessName: string;
    industry: string;
  }
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a sales coach helping a ${context.industry} business respond to leads. Write responses that are warm, professional, and move toward booking an appointment. Keep responses under 3 sentences.`,
      },
      {
        role: "user",
        content: `Suggest a response for ${context.businessName}:
Lead: ${context.leadName}
Service: ${context.serviceType || "not specified"}
${context.lastMessage ? `Their last message: "${context.lastMessage}"` : ""}
${context.conversationHistory ? `Conversation history: ${context.conversationHistory}` : ""}

Write a response that builds rapport and moves toward scheduling.`,
      },
    ],
    temperature: 0.6,
    max_tokens: 200,
  });

  return (
    response.choices[0]?.message?.content ||
    "Thank you for reaching out! We'd love to help with your project. When would be a good time for a quick call?"
  );
}

export async function generateFollowUpSequence(
  context: {
    leadName: string;
    serviceType: string;
    businessName: string;
    industry: string;
    estimatedValue: number;
  }
): Promise<{ day: number; channel: "email" | "sms"; subject?: string; body: string }[]> {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a follow-up automation expert. Generate a 5-touch follow-up sequence for a home service lead. Return valid JSON array.",
      },
      {
        role: "user",
        content: `Create a follow-up sequence for:
Business: ${context.businessName} (${context.industry})
Lead: ${context.leadName}
Service: ${context.serviceType}
Est. Value: $${context.estimatedValue}

Return JSON array: [{ "day": number, "channel": "email"|"sms", "subject": "...", "body": "..." }]
Day 1: Immediate thank you + next steps
Day 2: SMS check-in
Day 5: Email with value/testimonial
Day 10: Re-engagement SMS
Day 21: Final nurture email`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
    max_tokens: 800,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(content);
  return parsed.sequence || parsed;
}
