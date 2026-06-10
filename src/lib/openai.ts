import OpenAI from "openai";
import { db } from "@/lib/db";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

interface GenerateArticleParams {
  keyword: string;
  title?: string;
  tone?: string;
  targetAudience?: string;
  wordCount?: number;
  userId: string;
}

interface GeneratedArticle {
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  content: string;
  wordCount: number;
}

export async function generateArticle(params: GenerateArticleParams): Promise<GeneratedArticle> {
  const { keyword, title, tone = "professional", targetAudience = "general audience", wordCount = 1500, userId } = params;

  const systemPrompt = `You are an expert SEO content writer. Write high-quality, engaging articles optimized for search engines.
Always include:
- Compelling H1 title
- Clear structure with H2 and H3 subheadings
- Introduction that hooks the reader
- Practical, actionable content
- Natural keyword integration (1-2% density)
- FAQ section when relevant
- Strong conclusion with CTA
Format: Return ONLY valid JSON matching the exact schema provided.`;

  const userPrompt = `Write a comprehensive SEO article about: "${keyword}"
${title ? `Suggested title: "${title}"` : ""}
Tone: ${tone}
Target audience: ${targetAudience}
Target word count: ~${wordCount} words

Return JSON with this exact schema:
{
  "title": "SEO-optimized H1 title",
  "metaTitle": "60-char meta title for SEO",
  "metaDescription": "150-160 char meta description with keyword",
  "slug": "url-friendly-slug",
  "content": "Full article in Markdown format with ## headings, bullet lists, etc."
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 4000,
  });

  const usage = response.usage;
  const cost = usage ? (usage.prompt_tokens * 0.00000015 + usage.completion_tokens * 0.0000006) : 0;

  // Log API usage
  await db.apiUsage.create({
    data: {
      userId,
      model: MODEL,
      tokens: usage?.total_tokens ?? 0,
      cost,
      action: "generate_article",
    },
  });

  const result = JSON.parse(response.choices[0].message.content!) as GeneratedArticle;
  result.wordCount = result.content.split(/\s+/).length;

  return result;
}

export async function generateKeywordIdeas(seed: string, userId: string): Promise<Array<{
  keyword: string;
  intent: string;
  difficulty: string;
  relatedKeywords: string[];
}>> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "You are an SEO keyword research expert. Return only valid JSON.",
      },
      {
        role: "user",
        content: `Generate 10 SEO keyword ideas based on the seed keyword: "${seed}"
Return JSON array:
[{
  "keyword": "full keyword phrase",
  "intent": "informational|commercial|transactional|navigational",
  "difficulty": "easy|medium|hard",
  "relatedKeywords": ["related1", "related2", "related3"]
}]`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
    max_tokens: 1500,
  });

  const usage = response.usage;
  const cost = usage ? (usage.prompt_tokens * 0.00000015 + usage.completion_tokens * 0.0000006) : 0;

  await db.apiUsage.create({
    data: {
      userId,
      model: MODEL,
      tokens: usage?.total_tokens ?? 0,
      cost,
      action: "keyword_research",
    },
  });

  const parsed = JSON.parse(response.choices[0].message.content!);
  return parsed.keywords ?? parsed;
}
