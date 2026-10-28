import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import MonthSelector from '../components/MonthSelector';
import TransactionItem from '../components/TransactionItem';
import { useMonth } from '../context/MonthContext';
import { useAuth } from '../context/AuthContext';
import { getTransactionsByMonth, getMonthTotals, deleteTransaction } from '../db/queries';
import { formatMoney } from '../utils/format';
import { colors } from '../theme';

export default function TransactionsScreen({ navigation }) {
  const db = useSQLiteContext();
  const { monthKey } = useMonth();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0, balance: 0 });

  const load = useCallback(async () => {
    setTransactions(await getTransactionsByMonth(db, user?.id, monthKey));
    setTotals(await getMonthTotals(db, user?.id, monthKey));
  }, [db, user?.id, monthKey]);

  // Ekran her öne geldiğinde (ör. form ekranından dönünce) listeyi yenile
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmDelete = (item) => {
    Alert.alert('İşlemi sil', `${item.category_name} - ${formatMoney(item.amount)} silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(db, user?.id, item.id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <MonthSelector />

      <View style={styles.summary}>
        <SummaryBox label="Gelir" value={totals.income} color={colors.income} />
        <SummaryBox label="Gider" value={totals.expense} color={colors.expense} />
        <SummaryBox
          label="Kalan"
          value={totals.balance}
          color={totals.balance >= 0 ? colors.text : colors.expense}
        />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TransactionItem
            item={item}
            onPress={() => navigation.navigate('TransactionForm', { id: item.id })}
            onLongPress={() => confirmDelete(item)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Bu ay için kayıt yok.{'\n'}Sağ alttaki + ile ilk işlemini ekle.
          </Text>
        }
        ListHeaderComponent={
          transactions.length > 0 ? (
            <Text style={styles.hint}>Düzenlemek için dokun, silmek için basılı tut</Text>
          ) : null
        }
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
        onPress={() => navigation.navigate('TransactionForm')}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

function SummaryBox({ label, value, color }) {
  return (
    <View style={styles.box}>
      <Text style={styles.boxLabel}>{label}</Text>
      <Text style={[styles.boxValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatMoney(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  summary: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 12 },
  box: {
    flex: 1,
    backgroundColor: colors.card,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 12,
  },
  boxLabel: { fontSize: 12, color: colors.muted },
  boxValue: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center', marginBottom: 8 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 60, lineHeight: 22 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 34 },
});
