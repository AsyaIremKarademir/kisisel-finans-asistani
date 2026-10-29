import { View, Text, Pressable, StyleSheet } from 'react-native';
import { formatMoney, formatDate } from '../utils/format';
import { colors } from '../theme';

export default function TransactionItem({ item, onPress, onLongPress }) {
  const isIncome = item.type === 'income';
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={[styles.dot, { backgroundColor: item.category_color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.category}>{item.category_name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.recurring_id != null ? '🔁 ' : ''}
          {formatDate(item.date)}
          {item.note ? ` · ${item.note}` : ''}
        </Text>
      </View>
      <Text style={[styles.amount, { color: isIncome ? colors.income : colors.expense }]}>
        {isIncome ? '+' : '-'}
        {formatMoney(item.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  category: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700', marginLeft: 8 },
});
