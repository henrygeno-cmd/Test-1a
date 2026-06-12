import Anthropic from '@anthropic-ai/sdk';
import { ChatMessage } from '../types';

const MODEL = 'claude-opus-4-8';

function makeClient(apiKey: string): Anthropic {
  // The key lives only on this device (entered in Settings), so the
  // browser-environment guard does not apply here.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export type CleanlinessReport = {
  score: number;
  verdict: string;
  tips: string[];
};

const CLEANLINESS_SCHEMA = {
  type: 'object',
  properties: {
    score: {
      type: 'integer',
      description: 'Cleanliness of the space from 0 (disaster) to 100 (spotless).',
    },
    verdict: {
      type: 'string',
      description: 'One short, friendly sentence summarizing the space.',
    },
    tips: {
      type: 'array',
      items: { type: 'string' },
      description: 'Up to 3 short, concrete tidying tips. Empty if the space is already great.',
    },
  },
  required: ['score', 'verdict', 'tips'],
  additionalProperties: false,
} as const;

export async function scoreCleanliness(
  apiKey: string,
  base64Jpegs: string[],
): Promise<CleanlinessReport> {
  const client = makeClient(apiKey);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      'You judge how clean and tidy a study space is for a student motivation app. ' +
      'Be fair but encouraging. Judge only tidiness and organization of the visible space: ' +
      'clutter, trash, dishes, clothes on the floor, unmade beds, messy desks. ' +
      'Do not judge decor taste, room size, or lighting. ' +
      'If the photos do not show a room or workspace at all, give a score of 0 and say so in the verdict.',
    messages: [
      {
        role: 'user',
        content: [
          ...base64Jpegs.map((data) => ({
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: 'image/jpeg' as const,
              data,
            },
          })),
          {
            type: 'text' as const,
            text: 'Rate how clean and tidy this study space is right now.',
          },
        ],
      },
    ],
    output_config: {
      format: { type: 'json_schema', schema: CLEANLINESS_SCHEMA },
    },
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('The AI could not review this photo. Try a different photo of your space.');
  }

  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  const report = JSON.parse(text) as CleanlinessReport;
  report.score = Math.max(0, Math.min(100, Math.round(report.score)));
  return report;
}

export async function tutorReply(
  apiKey: string,
  className: string,
  history: ChatMessage[],
): Promise<string> {
  const client = makeClient(apiKey);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      `You are a friendly study tutor helping a student with their "${className}" class. ` +
      'Explain things simply, quiz the student when they ask, and encourage them. ' +
      'Keep replies short (a few sentences) so they fit on a phone screen and can be read aloud. ' +
      'Use plain text only: no markdown, no LaTeX, no headers, no bullet symbols. ' +
      'Respond only with your final answer — no exploratory reasoning or meta-commentary.',
    messages: history.map((m) => ({
      role: m.role,
      content: m.text,
    })),
  });

  if (response.stop_reason === 'refusal') {
    return "Sorry, I can't help with that one. Ask me something else about your class!";
  }

  return response.content.find((b) => b.type === 'text')?.text ?? '…';
}

export function friendlyApiError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return 'Your API key was rejected. Double-check it in Settings.';
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'The AI is busy right now. Wait a moment and try again.';
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return 'No connection. Check your internet and try again.';
  }
  if (err instanceof Anthropic.APIError) {
    return `AI error: ${err.message}`;
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}
