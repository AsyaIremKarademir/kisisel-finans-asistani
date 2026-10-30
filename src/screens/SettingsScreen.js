import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme';

// Yazılar koyu renkte olduğu için açık tonlar önerilir
const PRESETS = [
  '#F5F6FA', '#FFFFFF', '#FFF8E1', '#FFF3E0', '#FCE4EC', '#F3E5F5',
  '#EDE7F6', '#E8EAF6', '#E3F2FD', '#E0F7FA', '#E0F2F1', '#E8F5E9',
  '#F1F8E9', '#F9FBE7', '#EFEBE9', '#ECEFF1',
];

const HEX_RE = /^#?([0-9a-f]{6})$/i;

// Algılanan parlaklık (0-1); koyu renklerde yazıların okunması zorlaşır
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

export default function SettingsScreen() {
  const { background, setBackground } = useTheme();
  const [hexText, setHexText] = useState(background);

  const match = hexText.trim().match(HEX_RE);
  const customColor = match ? `#${match[1].toUpperCase()}` : null;

  const choose = (color) => {
    setHexText(color ?? colors.background);
    setBackground(color);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Arka Plan Rengi</Text>
        <View style={styles.grid}>
          {PRESETS.map((color) => {
            const selected = color === background.toUpperCase();
            return (
              <Pressable
                key={color}
                onPress={() => choose(color)}
                style={[
                  styles.swatch,
                  { backgroundColor: color },
                  selected && styles.swatchSelected,
                ]}
              >
                {selected && <Text style={styles.check}>✓</Text>}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Özel renk (HEX)</Text>
        <View style={styles.row}>
          <View style={[styles.preview, { backgroundColor: customColor ?? 'transparent' }]} />
          <TextInput
            style={styles.input}
            value={hexText}
            onChangeText={setHexText}
            placeholder="#AABBCC"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
          />
          <Pressable
            onPress={() => choose(customColor)}
            disabled={!customColor}
            style={[styles.apply, !customColor && { opacity: 0.4 }]}
          >
            <Text style={styles.applyText}>Uygula</Text>
          </Pressable>
        </View>
        {!customColor && hexText.length > 0 && (
          <Text style={styles.error}>Geçerli bir renk kodu girin (ör. #E3F2FD).</Text>
        )}
        {customColor && luminance(customColor) < 0.5 && (
          <Text style={styles.error}>Koyu renklerde yazılar zor okunabilir.</Text>
        )}

        <Pressable onPress={() => choose(null)} style={styles.reset}>
          <Text style={styles.resetText}>Varsayılana dön</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  card: { backgroundColor: colors.card, padding: 14, borderRadius: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: { borderWidth: 3, borderColor: colors.primary },
  check: { fontSize: 18, fontWeight: '700', color: colors.primary },
  label: { fontSize: 13, color: colors.muted, marginTop: 18, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  preview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  apply: {
    marginLeft: 10,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  applyText: { color: '#FFFFFF', fontWeight: '600' },
  error: { fontSize: 12, color: colors.warning, marginTop: 6 },
  reset: { alignSelf: 'flex-start', marginTop: 18 },
  resetText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
});
