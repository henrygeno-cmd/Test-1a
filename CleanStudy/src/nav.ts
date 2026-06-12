export type RootStackParamList = {
  Home: undefined;
  Scan: undefined;
  Folder: { folderId: string };
  Flashcards: { folderId: string; mode: 'edit' | 'study' };
  Memorize: { folderId: string };
  Chat: { folderId: string };
  Settings: undefined;
};
