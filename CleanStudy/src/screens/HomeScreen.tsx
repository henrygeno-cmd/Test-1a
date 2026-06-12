import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../AppContext';
import { BigButton, TokenPill } from '../components';
import { RootStackParamList } from '../nav';
import { theme } from '../theme';
import { FOLDER_EMOJIS } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { state, addFolder, deleteFolder } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState(FOLDER_EMOJIS[0]);

  const createFolder = () => {
    const name = newName.trim();
    if (!name) return;
    addFolder(name, newEmoji);
    setNewName('');
    setNewEmoji(FOLDER_EMOJIS[0]);
    setModalOpen(false);
  };

  const confirmDelete = (folderId: string, name: string) => {
    Alert.alert(`Delete "${name}"?`, 'Its flashcards and chat history will be deleted too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteFolder(folderId) },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <TokenPill tokens={state.tokens} />
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={10}>
          <Text style={styles.gear}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.tagline}>Clean your space. Earn your study tools.</Text>

      <BigButton
        emoji="🧹"
        label="Clean & Scan"
        color={theme.accent}
        onPress={() => navigation.navigate('Scan')}
        style={styles.scanButton}
      />
      {state.lastScan && (
        <Text style={styles.lastScan}>
          Last scan: {state.lastScan.score}% clean · +{state.lastScan.tokensEarned} tokens
        </Text>
      )}

      <Text style={styles.sectionTitle}>My Classes</Text>
      {state.folders.length === 0 && (
        <Text style={styles.emptyText}>
          No classes yet. Add one to start making flashcards and chatting with your AI tutor.
        </Text>
      )}
      {state.folders.map((folder) => (
        <TouchableOpacity
          key={folder.id}
          style={[styles.folderCard, { backgroundColor: folder.color }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Folder', { folderId: folder.id })}
          onLongPress={() => confirmDelete(folder.id, folder.name)}
        >
          <Text style={styles.folderEmoji}>{folder.emoji}</Text>
          <View style={styles.folderInfo}>
            <Text style={styles.folderName}>{folder.name}</Text>
            <Text style={styles.folderMeta}>
              {folder.flashcards.length} card{folder.flashcards.length === 1 ? '' : 's'}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.addFolder} onPress={() => setModalOpen(true)}>
        <Text style={styles.addFolderText}>＋ New Class</Text>
      </TouchableOpacity>

      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Class</Text>
            <TextInput
              style={styles.input}
              placeholder="Class name (e.g. Biology)"
              placeholderTextColor={theme.subtext}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.emojiRow}>
              {FOLDER_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setNewEmoji(e)}
                  style={[styles.emojiChoice, newEmoji === e && styles.emojiChosen]}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createFolder} style={styles.modalCreate}>
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 48 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  gear: { fontSize: 26 },
  tagline: { fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 16 },
  scanButton: { paddingVertical: 24 },
  lastScan: { color: theme.subtext, fontSize: 13, marginTop: 8, textAlign: 'center' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
    marginTop: 28,
    marginBottom: 12,
  },
  emptyText: { color: theme.subtext, fontSize: 14, marginBottom: 12, lineHeight: 20 },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius,
    padding: 16,
    marginBottom: 10,
  },
  folderEmoji: { fontSize: 30, marginRight: 14 },
  folderInfo: { flex: 1 },
  folderName: { fontSize: 17, fontWeight: '700', color: theme.text },
  folderMeta: { fontSize: 13, color: theme.subtext, marginTop: 2 },
  chevron: { fontSize: 26, color: theme.subtext },
  addFolder: {
    borderRadius: theme.radius,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.border,
    padding: 16,
    alignItems: 'center',
  },
  addFolderText: { color: theme.subtext, fontSize: 16, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { backgroundColor: theme.card, borderRadius: theme.radius, padding: 20 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: theme.text, marginBottom: 14 },
  input: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: theme.text,
    marginBottom: 14,
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  emojiChoice: { padding: 8, borderRadius: 10, backgroundColor: theme.bg },
  emojiChosen: { backgroundColor: theme.primarySoft, borderWidth: 1.5, borderColor: theme.primary },
  emojiText: { fontSize: 22 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { padding: 12 },
  modalCancelText: { color: theme.subtext, fontWeight: '700', fontSize: 16 },
  modalCreate: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  modalCreateText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
