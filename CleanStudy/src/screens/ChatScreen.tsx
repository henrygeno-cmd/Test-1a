import { NativeStackScreenProps } from '@react-navigation/native-stack';
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

export default function ChatScreen({ navigation, route }: Props) {
  const { folderId } = route.params;
  const { state, appendChat, clearChat, updateSettings } = useApp();
  const folder = state.folders.find((f) => f.id === folderId);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const speak = state.settings.speakReplies;

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity
            hitSlop={10}
            onPress={() => updateSettings({ speakReplies: !speak })}
          >
            <Text style={styles.headerButton}>{speak ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>
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
        </View>
      ),
    });
  }, [navigation, speak, updateSettings, clearChat, folderId]);

  if (!folder) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    if (!state.settings.apiKey) {
      Alert.alert('Add your AI key first', 'Set your Claude API key in Settings to chat.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => navigation.navigate('Settings') },
      ]);
      return;
    }
    setInput('');
    const userMessage: ChatMessage = { role: 'user', text };
    appendChat(folderId, userMessage);
    setThinking(true);
    try {
      const reply = await tutorReply(state.settings.apiKey, folder.name, [
        ...folder.chat,
        userMessage,
      ]);
      appendChat(folderId, { role: 'assistant', text: reply });
      if (state.settings.speakReplies) {
        Speech.stop();
        Speech.speak(reply, { rate: 1.0 });
      }
    } catch (err) {
      appendChat(folderId, { role: 'assistant', text: `⚠️ ${friendlyApiError(err)}` });
    } finally {
      setThinking(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={listRef}
        data={folder.chat}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>
              Ask your {folder.name} tutor anything!{'\n'}Try “quiz me” or “explain ___ simply”.
            </Text>
            {speak && <Text style={styles.emptyHint}>🔊 Replies will be read out loud</Text>}
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
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask your tutor…"
          placeholderTextColor={theme.subtext}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || thinking) && { opacity: 0.4 }]}
          onPress={send}
          disabled={!input.trim() || thinking}
        >
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  headerButtons: { flexDirection: 'row', gap: 16 },
  headerButton: { fontSize: 20 },
  list: { padding: 16, paddingBottom: 24, flexGrow: 1 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: theme.subtext, textAlign: 'center', fontSize: 15, lineHeight: 22 },
  emptyHint: { color: theme.primary, fontSize: 13, fontWeight: '700' },
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
