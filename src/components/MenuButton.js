// Başlıktaki ☰ düğmesi: soldan açılan basit bir menü gösterir.
import { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

const ITEMS = [{ key: 'Settings', label: 'Ayarlar', icon: '⚙️' }];

export default function MenuButton() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const go = (screen) => {
    setOpen(false);
    navigation.navigate(screen);
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={styles.button}>
        <Text style={styles.icon}>☰</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.panel, { paddingTop: insets.top + 16 }]}>
            <Text style={styles.title}>Finans Asistanı</Text>
            {user && <Text style={styles.user}>{user.username}</Text>}
            {ITEMS.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => go(item.key)}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <Text style={styles.itemLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          {/* Menünün dışına dokununca kapanır */}
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: 16 },
  icon: { fontSize: 22, color: colors.text },
  overlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: { width: '72%', maxWidth: 320, backgroundColor: colors.card, paddingHorizontal: 12 },
  backdrop: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, paddingHorizontal: 8 },
  user: { fontSize: 14, color: colors.muted, paddingHorizontal: 8, marginTop: 4, marginBottom: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  itemPressed: { backgroundColor: colors.border },
  itemIcon: { fontSize: 18, marginRight: 12 },
  itemLabel: { fontSize: 16, color: colors.text, fontWeight: '500' },
});
