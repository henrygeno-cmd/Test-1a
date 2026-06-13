import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { friendlyApiError, tutorReply } from '../api/claude';
import { useApp } from '../AppContext';
import { RootStackParamList } from '../nav';
import { theme } from '../theme';
import { ChatMessage } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const voiceAvailable = (() => {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
})();

export default function ChatScreen({ navigation, route }: Props) {
  const { folderId } = route.params;
  const { state, appendChat, clearChat, updateSettings } = useApp();
  const folder = state.folders.find((f) => f.id === folderId);

  const [talkMode, setTalkMode] = useState(state.settings.conversationMode && voiceAvailable);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const transcriptRef = useRef('');

  // Keep the latest folder/state available to async callbacks.
  const folderRef = useRef(folder);
  folderRef.current = folder;

  useEffect(() => {
    return () => {
      Speech.stop();
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        /* not running */
      }
    };
  }, []);

  // --- Voice input events ---
  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results[0]?.transcript ?? '';
    transcriptRef.current = text;
    setInterim(text);
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    const text = transcriptRef.current.trim();
    transcriptRef.current = '';
    setInterim('');
    if (text) void send(text, true);
  });

  useSpeechRecognitionEvent('error', (e) => {
    setListening(false);
    setInterim('');
    transcriptRef.current = '';
    if (e.error !== 'no-speech' && e.error !== 'aborted') {
      Alert.alert('Voice error', e.message || e.error);
    }
  });

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          hitSlop={10}
          onPress={() =>
            Alert.alert('Clear chat?', 'This deletes the conversation for this class.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => clearChat(folderId) },
            ])
          }
        >
          <Text style={styles.headerButton}>🗑️</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, clearChat, folderId]);

  if (!folder) return null;

  const requireKey = (): boolean => {
    if (state.settings.apiKey) return true;
    Alert.alert('Add your AI key first', 'Set your Claude API key in Settings to chat.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => navigation.navigate('Settings') },
    ]);
    return false;
  };

  const send = async (text: string, spoken: boolean) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    if (!requireKey()) return;
    setInput('');
    const userMessage: ChatMessage = { role: 'user', text: trimmed };
    appendChat(folderId, userMessage);
    setThinking(true);
    try {
      const history = [...(folderRef.current?.chat ?? []), userMessage];
      const reply = await tutorReply(state.settings.apiKey, folder.name, history);
      appendChat(folderId, { role: 'assistant', text: reply });
      if (spoken) {
        Speech.stop();
        Speech.speak(reply, { rate: 1.0 });
      }
    } catch (err) {
      appendChat(folderId, { role: 'assistant', text: `⚠️ ${friendlyApiError(err)}` });
    } finally {
      setThinking(false);
    }
  };

  const startListening = async () => {
    if (!requireKey()) return;
    Speech.stop();
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Microphone needed', 'Allow microphone and speech access to talk to your tutor.');
      return;
    }
    transcriptRef.current = '';
    setInterim('');
    setListening(true);
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
    });
  };

  const stopListening = () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      setListening(false);
    }
  };

  const switchMode = (toTalk: boolean) => {
    if (toTalk && !voiceAvailable) {
      Alert.alert(
        'Voice not available',
        'Speech recognition needs a development build of the app (it does not run in Expo Go). You can still type and read here.',
      );
      return;
    }
    if (listening) stopListening();
    Speech.stop();
    setTalkMode(toTalk);
    updateSettings({ conversationMode: toTalk });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeOption, talkMode && styles.modeOptionActive]}
          onPress={() => switchMode(true)}
        >
          <Text style={[styles.modeText, talkMode && styles.modeTextActive]}>🎙️ Talk</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeOption, !talkMode && styles.modeOptionActive]}
          onPress={() => switchMode(false)}
        >
          <Text style={[styles.modeText, !talkMode && styles.modeTextActive]}>⌨️ Read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={folder.chat}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>{talkMode ? '🎙️' : '💬'}</Text>
            <Text style={styles.emptyText}>
              {talkMode
                ? `Tap the mic and talk to your ${folder.name} tutor.\nIt answers out loud — and you can read along here.`
                : `Ask your ${folder.name} tutor anything!\nTry “quiz me” or “explain ___ simply”.`}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
            ]}
          >
            <Text style={[styles.bubbleText, item.role === 'user' && { color: '#fff' }]}>
              {item.text}
            </Text>
          </View>
        )}
        ListFooterComponent={
          thinking ? (
            <View style={[styles.bubble, styles.bubbleAssistant, styles.thinkingBubble]}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={styles.thinkingText}>thinking…</Text>
            </View>
          ) : null
        }
      />

      {talkMode ? (
        <View style={styles.talkBar}>
          {listening && (
            <Text style={styles.interim} numberOfLines={2}>
              {interim || 'Listening…'}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.micButton, listening && styles.micButtonActive]}
            onPress={listening ? stopListening : startListening}
            disabled={thinking}
            activeOpacity={0.85}
          >
            <Text style={styles.micEmoji}>{listening ? '⏹️' : '🎙️'}</Text>
          </TouchableOpacity>
          <Text style={styles.micHint}>
            {listening ? 'Tap to stop' : thinking ? 'Tutor is replying…' : 'Tap to talk'}
          </Text>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask your tutor…"
            placeholderTextColor={theme.subtext}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input, false)}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || thinking) && { opacity: 0.4 }]}
            onPress={() => send(input, false)}
            disabled={!input.trim() || thinking}
          >
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  headerButton: { fontSize: 20 },
  modeToggle: {
    flexDirection: 'row',
    margin: 12,
    padding: 4,
    backgroundColor: theme.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modeOption: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 999 },
  modeOptionActive: { backgroundColor: theme.primary },
  modeText: { fontWeight: '700', color: theme.subtext, fontSize: 15 },
  modeTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: theme.subtext, textAlign: 'center', fontSize: 15, lineHeight: 22 },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: theme.primary },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bubbleText: { fontSize: 15.5, color: theme.text, lineHeight: 22 },
  thinkingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { color: theme.subtext, fontSize: 14 },
  talkBar: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  interim: { color: theme.text, fontSize: 15, textAlign: 'center', fontStyle: 'italic' },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: { backgroundColor: theme.danger },
  micEmoji: { fontSize: 34 },
  micHint: { color: theme.subtext, fontSize: 13, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 10,
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.text,
    maxHeight: 110,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontSize: 20 },
});
