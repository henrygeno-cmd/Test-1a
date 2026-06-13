export type Flashcard = {
  id: string;
  front: string;
  back: string;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

export type Folder = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  flashcards: Flashcard[];
  chat: ChatMessage[];
};

export type Settings = {
  apiKey: string;
  /** Study tokens earned per 10% of cleanliness. */
  tokensPer10Percent: number;
  /** Below this cleanliness % you earn nothing. */
  minCleanPercent: number;
  costFlashcards: number;
  costMemorize: number;
  costChat: number;
  /** Default tutor mode: true = voice conversation (talk & listen), false = type & read. */
  conversationMode: boolean;
};

export type ScanResult = {
  score: number;
  verdict: string;
  tips: string[];
  tokensEarned: number;
  date: string;
};

export type AppState = {
  tokens: number;
  folders: Folder[];
  settings: Settings;
  lastScan: ScanResult | null;
};

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  tokensPer10Percent: 1,
  minCleanPercent: 50,
  costFlashcards: 1,
  costMemorize: 1,
  costChat: 2,
  conversationMode: true,
};

export const FOLDER_COLORS = ['#FFE3E3', '#FFF3D6', '#E3F6E8', '#E0EFFF', '#F0E4FF', '#FFE8F4'];
export const FOLDER_EMOJIS = ['📐', '🧪', '📖', '🌍', '💻', '🎨', '🎵', '🏛️', '🧬', '✏️'];
