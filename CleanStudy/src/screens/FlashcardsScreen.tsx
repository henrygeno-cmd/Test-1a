import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../AppContext';
import { BigButton } from '../components';
import { RootStackParamList } from '../nav';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Flashcards'>;

export default function FlashcardsScreen({ navigation, route }: Props) {
  const { folderId, mode } = route.params;
  const { state } = useApp();
  const folder = state.folders.find((f) => f.id === folderId);
  if (!folder) return null;

  return mode === 'edit' ? (
    <EditCards folderId={folderId} />
  ) : (
    <StudyCards folderId={folderId} onDone={() => navigation.goBack()} />
  );
}

function EditCards({ folderId }: { folderId: string }) {
  const { state, addCard, deleteCard } = useApp();
  const folder = state.folders.find((f) => f.id === folderId)!;
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  const add = () => {
    if (!front.trim() || !back.trim()) return;
    addCard(folderId, front.trim(), back.trim());
    setFront('');
    setBack('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.addCardBox}>
          <TextInput
            style={styles.input}
            placeholder="Front (question or term)"
            placeholderTextColor={theme.subtext}
            value={front}
            onChangeText={setFront}
          />
          <TextInput
            style={styles.input}
            placeholder="Back (answer)"
            placeholderTextColor={theme.subtext}
            value={back}
            onChangeText={setBack}
          />
          <TouchableOpacity style={styles.addButton} onPress={add}>
            <Text style={styles.addButtonText}>＋ Add Card</Text>
          </TouchableOpacity>
        </View>

        {folder.flashcards.length === 0 && (
          <Text style={styles.empty}>No cards yet — add your first one above.</Text>
        )}
        {folder.flashcards.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={styles.cardRow}
            onLongPress={() =>
              Alert.alert('Delete card?', card.front, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteCard(folderId, card.id),
                },
              ])
            }
          >
            <Text style={styles.cardFront}>{card.front}</Text>
            <Text style={styles.cardBack}>{card.back}</Text>
          </TouchableOpacity>
        ))}
        {folder.flashcards.length > 0 && (
          <Text style={styles.hint}>Long-press a card to delete it.</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function StudyCards({ folderId, onDone }: { folderId: string; onDone: () => void }) {
  const { state } = useApp();
  const folder = state.folders.find((f) => f.id === folderId)!;
  const [deck] = useState(() => shuffle(folder.flashcards));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [gotIt, setGotIt] = useState(0);

  if (index >= deck.length) {
    return (
      <View style={[styles.screen, styles.doneWrap]}>
        <Text style={styles.doneEmoji}>🎉</Text>
        <Text style={styles.doneTitle}>
          {gotIt} / {deck.length} correct
        </Text>
        <Text style={styles.doneSub}>
          {gotIt === deck.length ? 'Perfect run!' : 'Keep at it — repetition is the trick.'}
        </Text>
        <BigButton label="Done" onPress={onDone} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  const card = deck[index];
  const next = (correct: boolean) => {
    if (correct) setGotIt((g) => g + 1);
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  return (
    <View style={[styles.screen, styles.studyWrap]}>
      <Text style={styles.progress}>
        Card {index + 1} of {deck.length}
      </Text>
      <TouchableOpacity
        style={[styles.bigCard, flipped && styles.bigCardFlipped]}
        activeOpacity={0.9}
        onPress={() => setFlipped((f) => !f)}
      >
        <Text style={styles.bigCardSide}>{flipped ? 'ANSWER' : 'QUESTION'}</Text>
        <Text style={styles.bigCardText}>{flipped ? card.back : card.front}</Text>
        <Text style={styles.bigCardHint}>tap to flip</Text>
      </TouchableOpacity>

      {flipped && (
        <View style={styles.gradeRow}>
          <TouchableOpacity style={[styles.gradeButton, styles.gradeAgain]} onPress={() => next(false)}>
            <Text style={styles.gradeText}>😅 Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gradeButton, styles.gradeGot]} onPress={() => next(true)}>
            <Text style={[styles.gradeText, { color: '#fff' }]}>✅ Got it</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 48 },
  addCardBox: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: theme.text,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  empty: { color: theme.subtext, textAlign: 'center', marginTop: 12 },
  cardRow: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  cardFront: { fontSize: 16, fontWeight: '700', color: theme.text },
  cardBack: { fontSize: 14, color: theme.subtext, marginTop: 4 },
  hint: { color: theme.subtext, fontSize: 12, textAlign: 'center', marginTop: 10 },
  studyWrap: { padding: 20 },
  progress: { color: theme.subtext, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  bigCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: theme.border,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  bigCardFlipped: { backgroundColor: theme.primarySoft, borderColor: theme.primary },
  bigCardSide: { fontSize: 12, fontWeight: '800', color: theme.subtext, letterSpacing: 2 },
  bigCardText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
    marginVertical: 20,
  },
  bigCardHint: { fontSize: 13, color: theme.subtext },
  gradeRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  gradeButton: {
    flex: 1,
    borderRadius: theme.radius,
    paddingVertical: 18,
    alignItems: 'center',
  },
  gradeAgain: { backgroundColor: theme.accentSoft },
  gradeGot: { backgroundColor: theme.primary },
  gradeText: { fontSize: 17, fontWeight: '800', color: theme.text },
  doneWrap: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  doneEmoji: { fontSize: 64 },
  doneTitle: { fontSize: 28, fontWeight: '900', color: theme.text },
  doneSub: { fontSize: 15, color: theme.subtext, marginBottom: 20 },
});
