import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../AppContext';
import { TokenPill } from '../components';
import { RootStackParamList } from '../nav';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Folder'>;

export default function FolderScreen({ navigation, route }: Props) {
  const { state, spendTokens } = useApp();
  const folder = state.folders.find((f) => f.id === route.params.folderId);

  if (!folder) return null;

  const useTool = (cost: number, go: () => void, needsCards = false) => {
    if (needsCards && folder.flashcards.length === 0) {
      Alert.alert('No cards yet', 'Add some flashcards first (it’s free!).', [
        { text: 'OK' },
        {
          text: 'Add Cards',
          onPress: () =>
            navigation.navigate('Flashcards', { folderId: folder.id, mode: 'edit' }),
        },
      ]);
      return;
    }
    if (!spendTokens(cost)) {
      Alert.alert(
        'Not enough tokens',
        `This tool costs ⚡${cost}, you have ⚡${state.tokens}. Clean your space to earn more!`,
        [
          { text: 'Later', style: 'cancel' },
          { text: '🧹 Clean & Scan', onPress: () => navigation.navigate('Scan') },
        ],
      );
      return;
    }
    go();
  };

  const { costFlashcards, costMemorize, costChat } = state.settings;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.headerEmoji}>{folder.emoji}</Text>
        <TokenPill tokens={state.tokens} />
      </View>
      <Text style={styles.title}>{folder.name}</Text>
      <Text style={styles.subtitle}>Pick a study tool</Text>

      <ToolCard
        emoji="🃏"
        title="Flashcards"
        description="Flip through your cards"
        cost={costFlashcards}
        onPress={() =>
          useTool(
            costFlashcards,
            () => navigation.navigate('Flashcards', { folderId: folder.id, mode: 'study' }),
            true,
          )
        }
      />
      <ToolCard
        emoji="🧠"
        title="Memorize"
        description="Quiz yourself until it sticks"
        cost={costMemorize}
        onPress={() =>
          useTool(
            costMemorize,
            () => navigation.navigate('Memorize', { folderId: folder.id }),
            true,
          )
        }
      />
      <ToolCard
        emoji="💬"
        title="AI Tutor"
        description="Chat or talk it through with AI"
        cost={costChat}
        onPress={() =>
          useTool(costChat, () => navigation.navigate('Chat', { folderId: folder.id }))
        }
      />

      <TouchableOpacity
        style={styles.editCards}
        onPress={() => navigation.navigate('Flashcards', { folderId: folder.id, mode: 'edit' })}
      >
        <Text style={styles.editCardsText}>
          ✏️ Edit cards ({folder.flashcards.length}) — free
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ToolCard({
  emoji,
  title,
  description,
  cost,
  onPress,
}: {
  emoji: string;
  title: string;
  description: string;
  cost: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.toolCard} activeOpacity={0.8} onPress={onPress}>
      <Text style={styles.toolEmoji}>{emoji}</Text>
      <View style={styles.toolInfo}>
        <Text style={styles.toolTitle}>{title}</Text>
        <Text style={styles.toolDescription}>{description}</Text>
      </View>
      <View style={styles.costBadge}>
        <Text style={styles.costText}>⚡{cost}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 48 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerEmoji: { fontSize: 40 },
  title: { fontSize: 26, fontWeight: '900', color: theme.text, marginTop: 10 },
  subtitle: { fontSize: 15, color: theme.subtext, marginTop: 4, marginBottom: 20 },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  toolEmoji: { fontSize: 34, marginRight: 14 },
  toolInfo: { flex: 1 },
  toolTitle: { fontSize: 18, fontWeight: '800', color: theme.text },
  toolDescription: { fontSize: 13, color: theme.subtext, marginTop: 2 },
  costBadge: {
    backgroundColor: '#FFF6E3',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  costText: { fontWeight: '800', color: '#9A6A00' },
  editCards: { alignItems: 'center', padding: 16, marginTop: 6 },
  editCardsText: { color: theme.subtext, fontWeight: '700', fontSize: 15 },
});
