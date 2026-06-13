import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp } from '../AppContext';
import { Stepper } from '../components';
import { RootStackParamList } from '../nav';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen(_props: Props) {
  const { state, updateSettings } = useApp();
  const s = state.settings;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Earning tokens</Text>
      <View style={styles.card}>
        <Stepper
          label="Study tokens per 10% clean"
          value={s.tokensPer10Percent}
          onChange={(v) => updateSettings({ tokensPer10Percent: v })}
          min={1}
          max={10}
        />
        <View style={styles.divider} />
        <Stepper
          label="Minimum cleanliness to earn"
          value={s.minCleanPercent}
          onChange={(v) => updateSettings({ minCleanPercent: v })}
          min={0}
          max={90}
          step={10}
          suffix="%"
        />
        <Text style={styles.example}>
          Example: a {Math.max(s.minCleanPercent, 80)}% clean room earns ⚡
          {Math.round((Math.max(s.minCleanPercent, 80) / 10) * s.tokensPer10Percent)} tokens.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Tool prices</Text>
      <View style={styles.card}>
        <Stepper
          label="🃏 Flashcards session"
          value={s.costFlashcards}
          onChange={(v) => updateSettings({ costFlashcards: v })}
          min={1}
          max={10}
        />
        <View style={styles.divider} />
        <Stepper
          label="🧠 Memorize session"
          value={s.costMemorize}
          onChange={(v) => updateSettings({ costMemorize: v })}
          min={1}
          max={10}
        />
        <View style={styles.divider} />
        <Stepper
          label="💬 AI Tutor session"
          value={s.costChat}
          onChange={(v) => updateSettings({ costChat: v })}
          min={1}
          max={10}
        />
      </View>

      <Text style={styles.sectionTitle}>AI Tutor</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>🎙️ Start chats in conversation mode</Text>
          <Switch
            value={s.conversationMode}
            onValueChange={(v) => updateSettings({ conversationMode: v })}
            trackColor={{ true: theme.primary }}
          />
        </View>
        <Text style={styles.example}>
          On: talk to the tutor and it answers out loud. Off: type and read silently. You can
          switch any time inside a chat.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Claude API key</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="sk-ant-…"
          placeholderTextColor={theme.subtext}
          value={s.apiKey}
          onChangeText={(v) => updateSettings({ apiKey: v.trim() })}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Text style={styles.keyHint}>
          Powers the cleanliness check and AI tutor. Get a key at console.anthropic.com — it is
          stored only on this device.
        </Text>
      </View>

      <Text style={styles.footer}>CleanStudy · clean space, clear mind ✨</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 48 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 18,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  divider: { height: 1, backgroundColor: theme.border },
  example: { color: theme.subtext, fontSize: 13, paddingBottom: 12, lineHeight: 18 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  switchLabel: { fontSize: 15, color: theme.text },
  input: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: theme.text,
    marginVertical: 12,
  },
  keyHint: { color: theme.subtext, fontSize: 13, paddingBottom: 12, lineHeight: 18 },
  footer: { textAlign: 'center', color: theme.subtext, fontSize: 13, marginTop: 28 },
});
