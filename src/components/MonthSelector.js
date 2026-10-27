import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useMonth } from '../context/MonthContext';
import { monthLabel, shiftMonth } from '../utils/format';
import { colors } from '../theme';

export default function MonthSelector() {
  const { monthKey, setMonthKey } = useMonth();
  return (
    <View style={styles.row}>
      <Pressable hitSlop={12} onPress={() => setMonthKey(shiftMonth(monthKey, -1))}>
        <Text style={styles.arrow}>‹</Text>
      </Pressable>
      <Text style={styles.label}>{monthLabel(monthKey)}</Text>
      <Pressable hitSlop={12} onPress={() => setMonthKey(shiftMonth(monthKey, 1))}>
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  arrow: { fontSize: 30, color: colors.primary, paddingHorizontal: 8 },
  label: { fontSize: 17, fontWeight: '600', color: colors.text },
});
