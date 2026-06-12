import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  ChatMessage,
  DEFAULT_SETTINGS,
  Flashcard,
  Folder,
  FOLDER_COLORS,
  ScanResult,
  Settings,
} from './types';

const STORAGE_KEY = 'cleanstudy:v1';

const INITIAL_STATE: AppState = {
  tokens: 3, // small head start so new users can try the tools
  folders: [],
  settings: DEFAULT_SETTINGS,
  lastScan: null,
};

type AppContextValue = {
  state: AppState;
  loaded: boolean;
  addFolder: (name: string, emoji: string) => void;
  deleteFolder: (folderId: string) => void;
  addCard: (folderId: string, front: string, back: string) => void;
  deleteCard: (folderId: string, cardId: string) => void;
  appendChat: (folderId: string, message: ChatMessage) => void;
  clearChat: (folderId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  recordScan: (scan: ScanResult) => void;
  spendTokens: (amount: number) => boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [loaded, setLoaded] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw) as AppState;
          setState({
            ...INITIAL_STATE,
            ...saved,
            settings: { ...DEFAULT_SETTINGS, ...saved.settings },
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }
  }, [state, loaded]);

  const addFolder = useCallback((name: string, emoji: string) => {
    setState((s) => ({
      ...s,
      folders: [
        ...s.folders,
        {
          id: makeId(),
          name,
          emoji,
          color: FOLDER_COLORS[s.folders.length % FOLDER_COLORS.length],
          flashcards: [],
          chat: [],
        },
      ],
    }));
  }, []);

  const deleteFolder = useCallback((folderId: string) => {
    setState((s) => ({ ...s, folders: s.folders.filter((f) => f.id !== folderId) }));
  }, []);

  const patchFolder = useCallback((folderId: string, patch: (f: Folder) => Folder) => {
    setState((s) => ({
      ...s,
      folders: s.folders.map((f) => (f.id === folderId ? patch(f) : f)),
    }));
  }, []);

  const addCard = useCallback(
    (folderId: string, front: string, back: string) => {
      const card: Flashcard = { id: makeId(), front, back };
      patchFolder(folderId, (f) => ({ ...f, flashcards: [...f.flashcards, card] }));
    },
    [patchFolder],
  );

  const deleteCard = useCallback(
    (folderId: string, cardId: string) => {
      patchFolder(folderId, (f) => ({
        ...f,
        flashcards: f.flashcards.filter((c) => c.id !== cardId),
      }));
    },
    [patchFolder],
  );

  const appendChat = useCallback(
    (folderId: string, message: ChatMessage) => {
      patchFolder(folderId, (f) => ({ ...f, chat: [...f.chat, message] }));
    },
    [patchFolder],
  );

  const clearChat = useCallback(
    (folderId: string) => {
      patchFolder(folderId, (f) => ({ ...f, chat: [] }));
    },
    [patchFolder],
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const recordScan = useCallback((scan: ScanResult) => {
    setState((s) => ({ ...s, lastScan: scan, tokens: s.tokens + scan.tokensEarned }));
  }, []);

  const spendTokens = useCallback((amount: number): boolean => {
    if (stateRef.current.tokens < amount) return false;
    setState((s) => ({ ...s, tokens: s.tokens - amount }));
    return true;
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        loaded,
        addFolder,
        deleteFolder,
        addCard,
        deleteCard,
        appendChat,
        clearChat,
        updateSettings,
        recordScan,
        spendTokens,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
