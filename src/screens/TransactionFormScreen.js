// Hem "yeni işlem" hem "düzenle" ekranı. route.params.id varsa düzenleme modundadır.
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  Platform,
  KeyboardAvoidingView,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getCategories,
  getTransactionById,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  checkBudget,
  addRecurringTransaction,
  generateRecurring,
} from '../db/queries';
import { formatMoney, formatDate, parseAmount, toDateKey, fromDateKey } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export default function TransactionFormScreen({ navigation, route }) {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const editId = route.params?.id;

  const [type, setType] = useState('expense');
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [repeat, setRepeat] = useState(false); // yalnızca yeni işlemde
  const [fromRecurring, setFromRecurring] = useState(false);

  // Düzenleme modundaysa mevcut kaydı forma doldur
  useEffect(() => {
    navigation.setOptions({ title: editId ? 'İşlemi Düzenle' : 'Yeni İşlem' });
    if (!editId) return;
    (async () => {
      const t = await getTransactionById(db, user?.id, editId);
      if (!t) return;
      setType(t.type);
      setAmountText(String(t.amount).replace('.', ','));
      setCategoryId(t.category_id);
      setDate(fromDateKey(t.date));
      setNote(t.note ?? '');
      setFromRecurring(t.recurring_id != null);
    })();
  }, [db, user?.id, editId, navigation]);

  // Tür değişince o türün kategorilerini yükle
  useEffect(() => {
    (async () => {
      const list = await getCategories(db, type);
      setCategories(list);
      setCategoryId((current) => (list.some((c) => c.id === current) ? current : null));
    })();
  }, [db, type]);

  const save = async () => {
    const amount = parseAmount(amountText);
    if (!amount || amount <= 0) {
      Alert.alert('Eksik bilgi', 'Lütfen geçerli bir tutar gir.');
      return;
    }
    if (!categoryId) {
      Alert.alert('Eksik bilgi', 'Lütfen bir kategori seç.');
      return;
    }

    const dateKey = toDateKey(date);
    const data = { type, amount, categoryId, date: dateKey, note: note.trim() };

    if (editId) {
      await updateTransaction(db, user?.id, editId, data);
    } else if (repeat) {
      await addRecurringTransaction(db, user?.id, data);
      // Geçmiş bir tarih seçildiyse aradaki ayların kayıtlarını da oluştur
      await generateRecurring(db, user?.id, toDateKey(new Date()));
    } else {
      await addTransaction(db, user?.id, data);
    }

    // Gider ise bütçe kontrolü yap
    if (type === 'expense') {
      const budget = await checkBudget(db, user?.id, categoryId, dateKey.slice(0, 7));
      if (budget && budget.ratio >= 1) {
        Alert.alert(
          '⚠️ Bütçe aşıldı',
          `${budget.categoryName} bütçeni aştın.\nHarcanan: ${formatMoney(budget.spent)}\nLimit: ${formatMoney(budget.limit)}`,
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
        return;
      }
      if (budget && budget.ratio >= 0.8) {
        Alert.alert(
          'Bütçe uyarısı',
          `${budget.categoryName} bütçenin %${Math.round(budget.ratio * 100)}'ini kullandın.`,
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
        return;
      }
    }
    navigation.goBack();
  };

  const remove = () => {
    Alert.alert('İşlemi sil', 'Bu işlem kalıcı olarak silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(db, user?.id, editId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Gelir / Gider seçimi */}
        <View style={styles.segment}>
          {[
            ['expense', 'Gider', colors.expense],
            ['income', 'Gelir', colors.income],
          ].map(([value, label, color]) => (
            <Pressable
              key={value}
              onPress={() => setType(value)}
              style={[styles.segmentItem, type === value && { backgroundColor: color }]}
            >
              <Text style={[styles.segmentText, type === value && { color: '#fff' }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Tutar (₺)</Text>
        <TextInput
          style={[styles.input, styles.amountInput]}
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0,00"
          keyboardType="decimal-pad"
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Kategori</Text>
        <View style={styles.chips}>
          {categories.map((c) => {
            const selected = c.id === categoryId;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                style={[
                  styles.chip,
                  { borderColor: c.color },
                  selected && { backgroundColor: c.color },
                ]}
              >
                <Text style={[styles.chipText, selected && { color: '#fff' }]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Tarih</Text>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            locale="tr-TR"
            maximumDate={new Date()}
            onValueChange={(_, selected) => setDate(selected)}
            style={{ alignSelf: 'flex-start' }}
          />
        ) : (
          <>
            <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
              <Text style={{ fontSize: 16, color: colors.text }}>{formatDate(toDateKey(date))}</Text>
            </Pressable>
            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                maximumDate={new Date()}
                onValueChange={(_, selected) => {
                  setShowPicker(false);
                  setDate(selected);
                }}
                onDismiss={() => setShowPicker(false)}
              />
            )}
          </>
        )}

        <Text style={styles.label}>Not (isteğe bağlı)</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="Örn. haftalık market alışverişi"
          placeholderTextColor={colors.muted}
          maxLength={100}
        />

        {editId ? (
          fromRecurring && (
            <Text style={styles.recurringInfo}>
              🔁 Bu kayıt tekrarlayan bir işlemden oluşturuldu. Buradaki değişiklik yalnızca bu ayı
              etkiler; tekrarı Tekrarlar sekmesinden yönetebilirsin.
            </Text>
          )
        ) : (
          <View style={styles.repeatRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.repeatTitle}>Her ay tekrarla</Text>
              <Text style={styles.repeatHint}>
                {repeat
                  ? `Her ayın ${date.getDate()}. günü otomatik eklenecek`
                  : 'Kira, maaş, abonelik gibi düzenli kalemler için'}
              </Text>
            </View>
            <Switch
              value={repeat}
              onValueChange={setRepeat}
              trackColor={{ true: colors.primary }}
            />
          </View>
        )}

        <Pressable style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]} onPress={save}>
          <Text style={styles.saveText}>{editId ? 'Güncelle' : 'Kaydet'}</Text>
        </Pressable>

        {editId ? (
          <Pressable style={styles.deleteBtn} onPress={remove}>
            <Text style={styles.deleteText}>İşlemi Sil</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segmentText: { fontSize: 15, fontWeight: '600', color: colors.muted },
  label: { fontSize: 13, color: colors.muted, marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  amountInput: { fontSize: 24, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.card,
  },
  chipText: { fontSize: 14, color: colors.text },
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
  },
  repeatTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  repeatHint: { fontSize: 12, color: colors.muted, marginTop: 2 },
  recurringInfo: { fontSize: 12, color: colors.muted, marginTop: 16, lineHeight: 17 },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { alignItems: 'center', paddingVertical: 16, marginBottom: 40 },
  deleteText: { color: colors.expense, fontSize: 15, fontWeight: '600' },
});
