import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import MonthSelector from '../components/MonthSelector';
import { useMonth } from '../context/MonthContext';
import { useAuth } from '../context/AuthContext';
import { getBudgetsWithSpending, setBudget, removeBudget } from '../db/queries';
import { formatMoney, parseAmount } from '../utils/format';
import { colors } from '../theme';

export default function BudgetsScreen() {
  const db = useSQLiteContext();
  const { monthKey } = useMonth();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // düzenlenen kategori
  const [limitText, setLimitText] = useState('');

  const load = useCallback(async () => {
    setItems(await getBudgetsWithSpending(db, user?.id, monthKey));
  }, [db, user?.id, monthKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openEditor = (item) => {
    setEditing(item);
    setLimitText(item.monthly_limit ? String(item.monthly_limit).replace('.', ',') : '');
  };

  const saveLimit = async () => {
    const value = parseAmount(limitText);
    if (!value || value <= 0) {
      Alert.alert('Geçersiz tutar', 'Lütfen sıfırdan büyük bir limit gir.');
      return;
    }
    await setBudget(db, user?.id, editing.category_id, value);
    setEditing(null);
    load();
  };

  const clearLimit = async () => {
    await removeBudget(db, user?.id, editing.category_id);
    setEditing(null);
    load();
  };

  return (
    <View style={styles.container}>
      <MonthSelector />
      <Text style={styles.hint}>Bir kategoriye dokunarak aylık limit belirle</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.category_id)}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => <BudgetRow item={item} onPress={() => openEditor(item)} />}
      />

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(null)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editing?.name} için aylık limit</Text>
            <TextInput
              style={styles.input}
              value={limitText}
              onChangeText={setLimitText}
              keyboardType="decimal-pad"
              placeholder="Örn. 3000"
              placeholderTextColor={colors.muted}
              autoFocus
            />
            <View style={styles.modalButtons}>
              {editing?.monthly_limit ? (
                <Pressable onPress={clearLimit} style={styles.modalBtn}>
                  <Text style={{ color: colors.expense, fontWeight: '600' }}>Limiti Kaldır</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable onPress={saveLimit} style={[styles.modalBtn, styles.modalSave]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Kaydet</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function BudgetRow({ item, onPress }) {
  const hasLimit = item.monthly_limit != null;
  const ratio = hasLimit ? item.spent / item.monthly_limit : 0;
  const barColor = ratio >= 1 ? colors.expense : ratio >= 0.8 ? colors.warning : colors.income;

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={[styles.dot, { backgroundColor: item.color }]} />
        <Text style={styles.name}>{item.name}</Text>
        {hasLimit ? (
          <Text style={styles.amounts}>
            {formatMoney(item.spent)} / {formatMoney(item.monthly_limit)}
          </Text>
        ) : (
          <Text style={styles.noLimit}>Limit yok · {formatMoney(item.spent)}</Text>
        )}
      </View>

      {hasLimit && (
        <>
          <View style={styles.barBg}>
            <View
              style={[styles.barFill, { width: `${Math.min(ratio, 1) * 100}%`, backgroundColor: barColor }]}
            />
          </View>
          <Text style={[styles.status, { color: barColor }]}>
            {ratio >= 1
              ? `Limit ${formatMoney(item.spent - item.monthly_limit)} aşıldı!`
              : `Kalan: ${formatMoney(item.monthly_limit - item.spent)} (%${Math.round(ratio * 100)} kullanıldı)`}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center', marginBottom: 8 },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  amounts: { fontSize: 13, color: colors.text },
  noLimit: { fontSize: 13, color: colors.muted },
  barBg: { height: 8, backgroundColor: colors.border, borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  status: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: colors.card, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: colors.text,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  modalSave: { backgroundColor: colors.primary },
});
