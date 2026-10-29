// TCMB döviz kurları ve basit çevirici. Kurlar SQLite'ta saklanır; internet yokken son kurlar görünür.
// Yıldızlanan kurlar kullanıcıya özeldir ve listenin en üstünde durur.
import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getCachedRates, saveRates, setFavoriteCurrency } from '../db/queries';
import { fetchTcmbRates } from '../services/tcmb';
import { formatMoney, formatRate, formatDate, parseAmount } from '../utils/format';
import { colors } from '../theme';

// Bu süreden eski önbellek varsa ekran açılınca kurlar kendiliğinden yenilenir
const STALE_MS = 60 * 60 * 1000;

const pad = (n) => String(n).padStart(2, '0');
const formatTime = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function RatesScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const [rates, setRates] = useState([]);
  const [meta, setMeta] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Çevirici
  const [selectedCode, setSelectedCode] = useState('USD');
  const [amountText, setAmountText] = useState('100');
  const [toTry, setToTry] = useState(true); // true: döviz → TL, false: TL → döviz

  const loadCache = useCallback(async () => {
    const cached = await getCachedRates(db, user?.id);
    setRates(cached.rates);
    setMeta(cached.meta);
    return cached.meta;
  }, [db, user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await saveRates(db, await fetchTcmbRates());
      setError(null);
    } catch {
      setError('Kurlar güncellenemedi. İnternet bağlantını kontrol et.');
    } finally {
      await loadCache();
      setRefreshing(false);
    }
  }, [db, loadCache]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const m = await loadCache();
        if (!m || Date.now() - m.fetched_at > STALE_MS) refresh();
      })();
    }, [loadCache, refresh])
  );

  const toggleFavorite = async (item) => {
    await setFavoriteCurrency(db, user?.id, item.code, !item.is_favorite);
    loadCache();
  };

  const selected = rates.find((r) => r.code === selectedCode);

  const header = (
    <>
      {meta && (
        <Text style={styles.info}>
          TCMB {formatDate(meta.bulletin_date)} bülteni · Son kontrol {formatTime(meta.fetched_at)}
        </Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      {selected && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Çevirici</Text>
          <View style={styles.converterRow}>
            <TextInput
              style={styles.input}
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="decimal-pad"
              placeholder="Tutar"
              placeholderTextColor={colors.muted}
            />
            <Text style={styles.unit}>{toTry ? selected.code : 'TL'}</Text>
            <Pressable onPress={() => setToTry((v) => !v)} hitSlop={8} style={styles.swap}>
              <Text style={styles.swapText}>⇄</Text>
            </Pressable>
          </View>
          <Text style={styles.result}>
            = <ConvertedAmount amount={parseAmount(amountText)} rate={selected} toTry={toTry} />
          </Text>
          <Text style={styles.hint}>
            TCMB döviz {toTry ? 'alış' : 'satış'} kuru ile. Çevirmek istediğin kura listeden dokun.
          </Text>
        </View>
      )}

      {rates.length > 0 && (
        <View style={styles.tableHead}>
          <Text style={[styles.headText, { flex: 1 }]}>Döviz</Text>
          <Text style={[styles.headText, styles.priceCol]}>Alış</Text>
          <Text style={[styles.headText, styles.priceCol]}>Satış</Text>
          <View style={styles.starCol} />
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={rates}
        keyExtractor={(item) => item.code}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <RateRow
            item={item}
            selected={item.code === selectedCode}
            onPress={() => setSelectedCode(item.code)}
            onToggleFavorite={() => toggleFavorite(item)}
          />
        )}
        ListEmptyComponent={
          !refreshing && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💱</Text>
              <Text style={styles.emptyText}>
                Henüz kur bilgisi yok. İnternete bağlanıp listeyi aşağı çekerek yenile.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

// Döviz → TL: banka dövizini senden alış kuruyla alır.
// TL → döviz: banka dövizi sana satış kuruyla satar.
function ConvertedAmount({ amount, rate, toTry }) {
  if (!amount || amount <= 0) return '—';
  if (toTry) return formatMoney(amount * rate.buying);
  return `${formatRate(amount / rate.selling)} ${rate.code}`;
}

function RateRow({ item, selected, onPress, onToggleFavorite }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.code}>{item.code}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      <Text style={[styles.price, styles.priceCol]}>{formatRate(item.buying)}</Text>
      <Text style={[styles.price, styles.priceCol]}>{formatRate(item.selling)}</Text>
      <Pressable onPress={onToggleFavorite} hitSlop={10} style={styles.starCol}>
        <Text style={[styles.star, !item.is_favorite && { opacity: 0.25 }]}>★</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  info: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 12 },
  error: {
    fontSize: 13,
    color: colors.warning,
    textAlign: 'center',
    marginTop: 6,
    marginHorizontal: 16,
  },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  converterRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    color: colors.text,
  },
  unit: { fontSize: 16, fontWeight: '700', color: colors.text, marginLeft: 10, minWidth: 36 },
  swap: {
    marginLeft: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapText: { fontSize: 18, color: colors.primary, fontWeight: '700' },
  result: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 12 },
  hint: { fontSize: 12, color: colors.muted, marginTop: 6 },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
    paddingHorizontal: 14,
  },
  headText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  priceCol: { width: 82, textAlign: 'right' },
  starCol: { width: 32, alignItems: 'flex-end' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowSelected: { borderColor: colors.primary },
  code: { fontSize: 15, fontWeight: '700', color: colors.text },
  name: { fontSize: 12, color: colors.muted, marginTop: 2 },
  price: { fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
  star: { fontSize: 18, color: '#F9A825' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
