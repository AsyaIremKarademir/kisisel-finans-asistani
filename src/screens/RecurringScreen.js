// Her ay otomatik eklenen işlemlerin listesi. Tutar değiştirilebilir ya da tekrar durdurulabilir.
// Yeni tekrar, işlem formundaki "Her ay tekrarla" anahtarıyla oluşturulur.
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
import { useAuth } from '../context/AuthContext';
import { getRecurring, updateRecurringAmount, deleteRecurring } from '../db/queries';
import { formatMoney, formatDate, parseAmount, monthDayKey } from '../utils/format';
import { colors } from '../theme';

export default function RecurringScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // düzenlenen tekrar
  const [amountText, setAmountText] = useState('');

  const load = useCallback(async () => {
    setItems(await getRecurring(db, user?.id));
  }, [db, user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openEditor = (item) => {
    setEditing(item);
    setAmountText(String(item.amount).replace('.', ','));
  };

  const saveAmount = async () => {
    const value = parseAmount(amountText);
    if (!value || value <= 0) {
      Alert.alert('Geçersiz tutar', 'Lütfen sıfırdan büyük bir tutar gir.');
      return;
    }
    await updateRecurringAmount(db, user?.id, editing.id, value);
    setEditing(null);
    load();
  };

  const stop = () => {
    const item = editing;
    Alert.alert(
      'Tekrarı durdur',
      `${item.category_name} artık her ay eklenmeyecek. Daha önce eklenen kayıtlar silinmez.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Durdur',
          style: 'destructive',
          onPress: async () => {
            await deleteRecurring(db, user?.id, item.id);
            setEditing(null);
            load();
          },
        },
      ]
    );
  };

  const monthlyNet = items.reduce((sum, r) => sum + (r.type === 'income' ? r.amount : -r.amount), 0);

  return (
    <View style={styles.container}>
      {items.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Aylık düzenli net</Text>
          <Text
            style={[styles.summaryValue, { color: monthlyNet >= 0 ? colors.income : colors.expense }]}
          >
            {formatMoney(monthlyNet)}
          </Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 24, flexGrow: 1 }}
        renderItem={({ item }) => <RecurringRow item={item} onPress={() => openEditor(item)} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔁</Text>
            <Text style={styles.emptyTitle}>Henüz tekrarlayan işlem yok</Text>
            <Text style={styles.emptyText}>
              Yeni işlem eklerken &quot;Her ay tekrarla&quot; seçeneğini açarsan kira, maaş, abonelik
              gibi kalemler her ay kendiliğinden eklenir.
            </Text>
          </View>
        }
      />

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(null)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editing?.category_name} · aylık tutar</Text>
            <Text style={styles.modalHint}>Yeni tutar bundan sonraki aylarda kullanılır.</Text>
            <TextInput
              style={styles.input}
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="decimal-pad"
              placeholder="Örn. 15000"
              placeholderTextColor={colors.muted}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable onPress={stop} style={styles.modalBtn}>
                <Text style={{ color: colors.expense, fontWeight: '600' }}>Tekrarı Durdur</Text>
              </Pressable>
              <Pressable onPress={saveAmount} style={[styles.modalBtn, styles.modalSave]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Kaydet</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function RecurringRow({ item, onPress }) {
  const isIncome = item.type === 'income';
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: item.category_color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.category_name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          Her ayın {item.day_of_month}. günü
          {item.note ? ` · ${item.note}` : ''}
        </Text>
        <Text style={styles.meta}>
          Sıradaki: {formatDate(monthDayKey(item.next_month, item.day_of_month))}
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
  container: { flex: 1, backgroundColor: colors.background },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
  },
  summaryLabel: { fontSize: 14, color: colors.muted },
  summaryValue: { fontSize: 17, fontWeight: '700' },
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
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700', marginLeft: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: colors.card, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  modalHint: { fontSize: 12, color: colors.muted, marginTop: 4, marginBottom: 12 },
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
