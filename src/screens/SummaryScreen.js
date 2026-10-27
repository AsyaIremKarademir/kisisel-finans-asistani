import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import MonthSelector from '../components/MonthSelector';
import PieChart from '../components/PieChart';
import { useMonth } from '../context/MonthContext';
import { getMonthTotals, getExpenseByCategory } from '../db/queries';
import { formatMoney } from '../utils/format';
import { colors } from '../theme';

export default function SummaryScreen() {
  const db = useSQLiteContext();
  const { monthKey } = useMonth();
  const [totals, setTotals] = useState({ income: 0, expense: 0, balance: 0 });
  const [byCategory, setByCategory] = useState([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setTotals(await getMonthTotals(db, monthKey));
        setByCategory(await getExpenseByCategory(db, monthKey));
      })();
    }, [db, monthKey])
  );

  const savingRate = totals.income > 0 ? Math.round((totals.balance / totals.income) * 100) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <MonthSelector />

      <View style={styles.card}>
        <Row label="Toplam Gelir" value={totals.income} color={colors.income} />
        <Row label="Toplam Gider" value={totals.expense} color={colors.expense} />
        <View style={styles.divider} />
        <Row
          label="Kalan"
          value={totals.balance}
          color={totals.balance >= 0 ? colors.text : colors.expense}
          bold
        />
        {savingRate !== null && (
          <Text style={styles.note}>
            {savingRate >= 0
              ? `Gelirinin %${savingRate}'ini biriktirdin.`
              : `Gelirinden %${Math.abs(savingRate)} fazla harcadın.`}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Kategorilere Göre Giderler</Text>
        {byCategory.length === 0 ? (
          <Text style={styles.empty}>Bu ay gider kaydı yok.</Text>
        ) : (
          <>
            <View style={styles.chartWrap}>
              <PieChart
                data={byCategory.map((c) => ({ value: c.total, color: c.color }))}
                size={210}
                holeColor={colors.card}
              />
              <View style={styles.chartCenter} pointerEvents="none">
                <Text style={styles.centerLabel}>Gider</Text>
                <Text style={styles.centerValue}>{formatMoney(totals.expense)}</Text>
              </View>
            </View>

            {byCategory.map((c) => (
              <View key={c.id} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: c.color }]} />
                <Text style={styles.legendName}>{c.name}</Text>
                <Text style={styles.legendPct}>
                  %{Math.round((c.total / totals.expense) * 100)}
                </Text>
                <Text style={styles.legendValue}>{formatMoney(c.total)}</Text>
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Row({ label, value, color, bold }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { fontWeight: '700', color: colors.text }]}>{label}</Text>
      <Text style={[styles.rowValue, { color }, bold && { fontSize: 18 }]}>{formatMoney(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 15, color: colors.muted },
  rowValue: { fontSize: 16, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  note: { fontSize: 13, color: colors.muted, marginTop: 8 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  chartWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  chartCenter: { position: 'absolute', alignItems: 'center' },
  centerLabel: { fontSize: 12, color: colors.muted },
  centerValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendName: { flex: 1, fontSize: 14, color: colors.text },
  legendPct: { fontSize: 13, color: colors.muted, width: 48, textAlign: 'right' },
  legendValue: { fontSize: 14, fontWeight: '600', color: colors.text, width: 110, textAlign: 'right' },
});
