import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../AppContext';
import { BigButton } from '../components';
import { RootStackParamList } from '../nav';
import { theme } from '../theme';
import { Flashcard } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Memorize'>;

type Question = {
  card: Flashcard;
  choices: string[]; // shown only in multiple-choice mode
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQuiz(cards: Flashcard[]): Question[] {
  const multipleChoice = cards.length >= 4;
  return shuffle(cards).map((card) => {
    if (!multipleChoice) return { card, choices: [] };
    const wrong = shuffle(cards.filter((c) => c.id !== card.id))
      .slice(0, 3)
      .map((c) => c.back);
    return { card, choices: shuffle([card.back, ...wrong]) };
  });
}

export default function MemorizeScreen({ navigation, route }: Props) {
  const { state } = useApp();
  const folder = state.folders.find((f) => f.id === route.params.folderId);
  const [quiz] = useState(() => buildQuiz(folder?.flashcards ?? []));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);

  if (!folder) return null;

  if (index >= quiz.length) {
    const pct = quiz.length ? Math.round((correct / quiz.length) * 100) : 0;
    return (
      <View style={[styles.screen, styles.doneWrap]}>
        <Text style={styles.doneEmoji}>{pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '🌱'}</Text>
        <Text style={styles.doneTitle}>{pct}% memorized</Text>
        <Text style={styles.doneSub}>
          {correct} of {quiz.length} right.{' '}
          {pct >= 80 ? 'You know this!' : 'Run it again — it sticks more each time.'}
        </Text>
        <BigButton label="Done" onPress={() => navigation.goBack()} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  const question = quiz[index];
  const multipleChoice = question.choices.length > 0;

  const advance = (wasCorrect: boolean) => {
    if (wasCorrect) setCorrect((c) => c + 1);
    setPicked(null);
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.progress}>
        {index + 1} of {quiz.length} · {correct} correct
      </Text>

      <View style={styles.promptCard}>
        <Text style={styles.promptText}>{question.card.front}</Text>
      </View>

      {multipleChoice ? (
        <>
          {question.choices.map((choice, i) => {
            const isRight = choice === question.card.back;
            const isPicked = picked === choice;
            let bg = theme.card;
            if (picked) {
              if (isRight) bg = theme.primarySoft;
              else if (isPicked) bg = '#FBE0E0';
            }
            return (
              <TouchableOpacity
                key={i}
                disabled={picked !== null}
                style={[styles.choice, { backgroundColor: bg }]}
                onPress={() => setPicked(choice)}
              >
                <Text style={styles.choiceText}>{choice}</Text>
              </TouchableOpacity>
            );
          })}
          {picked !== null && (
            <BigButton
              label={picked === question.card.back ? 'Nice! Next →' : 'Next →'}
              color={picked === question.card.back ? theme.primary : theme.accent}
              onPress={() => advance(picked === question.card.back)}
              style={{ marginTop: 12 }}
            />
          )}
        </>
      ) : (
        <>
          {!revealed ? (
            <BigButton label="Reveal Answer" emoji="👀" onPress={() => setRevealed(true)} />
          ) : (
            <>
              <View style={[styles.promptCard, styles.answerCard]}>
                <Text style={styles.promptText}>{question.card.back}</Text>
              </View>
              <Text style={styles.selfGrade}>Did you remember it?</Text>
              <View style={styles.gradeRow}>
                <TouchableOpacity
                  style={[styles.gradeButton, { backgroundColor: theme.accentSoft }]}
                  onPress={() => advance(false)}
                >
                  <Text style={styles.gradeText}>😅 Nope</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.gradeButton, { backgroundColor: theme.primary }]}
                  onPress={() => advance(true)}
                >
                  <Text style={[styles.gradeText, { color: '#fff' }]}>✅ Yes</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          <Text style={styles.modeHint}>
            Add 4+ cards to unlock multiple-choice mode.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 48 },
  progress: { color: theme.subtext, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  promptCard: {
    backgroundColor: theme.card,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
  },
  answerCard: { backgroundColor: theme.primarySoft, borderColor: theme.primary },
  promptText: { fontSize: 22, fontWeight: '700', color: theme.text, textAlign: 'center' },
  choice: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 10,
  },
  choiceText: { fontSize: 16, color: theme.text, fontWeight: '600' },
  selfGrade: { textAlign: 'center', color: theme.subtext, marginBottom: 12, fontSize: 15 },
  gradeRow: { flexDirection: 'row', gap: 12 },
  gradeButton: { flex: 1, borderRadius: theme.radius, paddingVertical: 18, alignItems: 'center' },
  gradeText: { fontSize: 17, fontWeight: '800', color: theme.text },
  modeHint: { color: theme.subtext, fontSize: 12, textAlign: 'center', marginTop: 18 },
  doneWrap: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  doneEmoji: { fontSize: 64 },
  doneTitle: { fontSize: 28, fontWeight: '900', color: theme.text },
  doneSub: { fontSize: 15, color: theme.subtext, marginBottom: 20, textAlign: 'center' },
});
