import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { theme } from './theme';

export function BigButton({
  label,
  emoji,
  onPress,
  color = theme.primary,
  disabled = false,
  style,
}: {
  label: string;
  emoji?: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.bigButton, { backgroundColor: color, opacity: disabled ? 0.5 : 1 }, style]}
    >
      {emoji ? <Text style={styles.bigButtonEmoji}>{emoji}</Text> : null}
      <Text style={styles.bigButtonLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export function TokenPill({ tokens }: { tokens: number }) {
  return (
    <View style={styles.tokenPill}>
      <Text style={styles.tokenPillText}>
        ⚡ {tokens} token{tokens === 1 ? '' : 's'}
      </Text>
    </View>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={styles.stepperButton}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Text style={styles.stepperButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>
          {value}
          {suffix}
        </Text>
        <TouchableOpacity
          style={styles.stepperButton}
          onPress={() => onChange(Math.min(max, value + step))}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bigButton: {
    borderRadius: theme.radius,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  bigButtonEmoji: { fontSize: 26 },
  bigButtonLabel: { color: '#fff', fontSize: 19, fontWeight: '700' },
  tokenPill: {
    backgroundColor: '#FFF6E3',
    borderColor: theme.token,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  tokenPillText: { color: '#9A6A00', fontWeight: '700', fontSize: 15 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  stepperLabel: { fontSize: 15, color: theme.text, flex: 1, paddingRight: 10 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: { fontSize: 22, fontWeight: '700', color: theme.primary },
  stepperValue: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.text,
    minWidth: 48,
    textAlign: 'center',
  },
});
