import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { friendlyApiError, scoreCleanliness } from '../api/claude';
import { useApp } from '../AppContext';
import { BigButton } from '../components';
import { RootStackParamList } from '../nav';
import { theme } from '../theme';
import { ScanResult } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

type Photo = { uri: string; base64: string };

const MAX_PHOTOS = 3;

export default function ScanScreen({ navigation }: Props) {
  const { state, recordScan } = useApp();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera needed', 'Allow camera access so the AI can see your space.');
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (picked.canceled || !picked.assets[0]) return;

    // Shrink before upload: faster, cheaper, and plenty for the AI to judge.
    const rendered = await ImageManipulator.manipulate(picked.assets[0].uri)
      .resize({ width: 1024 })
      .renderAsync();
    const small = await rendered.saveAsync({
      compress: 0.6,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (small.base64) {
      setPhotos((p) => [...p, { uri: small.uri, base64: small.base64! }]);
    }
  };

  const check = async () => {
    if (!state.settings.apiKey) {
      Alert.alert('Add your AI key first', 'CleanStudy needs a Claude API key to check photos.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => navigation.navigate('Settings') },
      ]);
      return;
    }
    setChecking(true);
    try {
      const report = await scoreCleanliness(
        state.settings.apiKey,
        photos.map((p) => p.base64),
      );
      const { tokensPer10Percent, minCleanPercent } = state.settings;
      const tokensEarned =
        report.score >= minCleanPercent
          ? Math.round((report.score / 10) * tokensPer10Percent)
          : 0;
      const scan: ScanResult = {
        score: report.score,
        verdict: report.verdict,
        tips: report.tips ?? [],
        tokensEarned,
        date: new Date().toISOString(),
      };
      recordScan(scan);
      setResult(scan);
    } catch (err) {
      Alert.alert('Could not check', friendlyApiError(err));
    } finally {
      setChecking(false);
    }
  };

  if (result) {
    const passed = result.tokensEarned > 0;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={[styles.resultCard, { backgroundColor: passed ? theme.primarySoft : theme.accentSoft }]}>
          <Text style={styles.resultScore}>{result.score}%</Text>
          <Text style={styles.resultLabel}>clean</Text>
          <Text style={styles.resultVerdict}>{result.verdict}</Text>
          <Text style={[styles.resultTokens, { color: passed ? theme.primary : theme.accent }]}>
            {passed ? `+${result.tokensEarned} study tokens! ⚡` : 'No tokens this time 😅'}
          </Text>
        </View>

        {result.tips.length > 0 && (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Quick wins</Text>
            {result.tips.map((tip, i) => (
              <Text key={i} style={styles.tip}>
                • {tip}
              </Text>
            ))}
          </View>
        )}

        {passed ? (
          <BigButton emoji="📚" label="Start Studying" onPress={() => navigation.goBack()} />
        ) : (
          <BigButton
            emoji="🧹"
            label="Tidy Up & Rescan"
            color={theme.accent}
            onPress={() => {
              setPhotos([]);
              setResult(null);
            }}
          />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.steps}>
        <Text style={styles.step}>1️⃣ Tidy up your study space</Text>
        <Text style={styles.step}>2️⃣ Snap a photo of it</Text>
        <Text style={styles.step}>3️⃣ AI checks it — earn study tokens</Text>
      </View>

      {photos.length === 0 ? (
        <TouchableOpacity style={styles.cameraHero} onPress={takePhoto} activeOpacity={0.85}>
          <Text style={styles.cameraHeroEmoji}>📸</Text>
          <Text style={styles.cameraHeroText}>Take Photo</Text>
          <Text style={styles.cameraHeroHint}>One tap — that's it</Text>
        </TouchableOpacity>
      ) : (
        <>
          <View style={styles.photoRow}>
            {photos.map((p, i) => (
              <View key={i} style={styles.thumbWrap}>
                <Image source={{ uri: p.uri }} style={styles.thumb} />
                <TouchableOpacity
                  style={styles.thumbRemove}
                  onPress={() => setPhotos((ph) => ph.filter((_, j) => j !== i))}
                >
                  <Text style={styles.thumbRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity style={styles.thumbAdd} onPress={takePhoto}>
                <Text style={styles.thumbAddText}>＋</Text>
                <Text style={styles.thumbAddHint}>angle</Text>
              </TouchableOpacity>
            )}
          </View>

          {checking ? (
            <View style={styles.checking}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.checkingText}>AI is checking your space…</Text>
            </View>
          ) : (
            <BigButton emoji="✨" label="Check Cleanliness" onPress={check} />
          )}
        </>
      )}

      <Text style={styles.rateHint}>
        You earn {state.settings.tokensPer10Percent} token
        {state.settings.tokensPer10Percent === 1 ? '' : 's'} per 10% clean (needs at least{' '}
        {state.settings.minCleanPercent}%). Change this in Settings.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 48 },
  steps: { marginBottom: 22, gap: 8 },
  step: { fontSize: 16, color: theme.text, fontWeight: '600' },
  cameraHero: {
    backgroundColor: theme.card,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: 'center',
    paddingVertical: 56,
  },
  cameraHeroEmoji: { fontSize: 64 },
  cameraHeroText: { fontSize: 24, fontWeight: '800', color: theme.text, marginTop: 10 },
  cameraHeroHint: { fontSize: 14, color: theme.subtext, marginTop: 4 },
  photoRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 100, height: 100, borderRadius: 14 },
  thumbRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.danger,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRemoveText: { color: '#fff', fontWeight: '700' },
  thumbAdd: {
    width: 100,
    height: 100,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbAddText: { fontSize: 28, color: theme.subtext },
  thumbAddHint: { fontSize: 12, color: theme.subtext },
  checking: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  checkingText: { color: theme.subtext, fontSize: 15 },
  rateHint: { color: theme.subtext, fontSize: 13, marginTop: 24, lineHeight: 19 },
  resultCard: {
    borderRadius: 24,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  resultScore: { fontSize: 64, fontWeight: '900', color: theme.text },
  resultLabel: { fontSize: 16, color: theme.subtext, marginTop: -8 },
  resultVerdict: {
    fontSize: 16,
    color: theme.text,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 22,
  },
  resultTokens: { fontSize: 20, fontWeight: '800', marginTop: 16 },
  tipsCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: 16,
    marginBottom: 18,
  },
  tipsTitle: { fontSize: 15, fontWeight: '800', color: theme.text, marginBottom: 8 },
  tip: { fontSize: 14, color: theme.text, lineHeight: 22 },
});
