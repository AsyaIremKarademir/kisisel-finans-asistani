// Giriş ve üye ol ekranı. Tek form, iki mod arasında geçiş yapılır.
import { useState } from 'react';
import {
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, AuthError } from '../context/AuthContext';
import { colors } from '../theme';

const USERNAME_PATTERN = /^[a-zA-Z0-9._]{3,20}$/;
const MIN_PASSWORD = 6;

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  const switchMode = (next) => {
    setMode(next);
    setPassword('');
    setPassword2('');
  };

  const submit = async () => {
    const name = username.trim();
    if (!name || !password) {
      Alert.alert('Eksik bilgi', 'Kullanıcı adı ve şifre gir.');
      return;
    }
    if (isRegister) {
      if (!USERNAME_PATTERN.test(name)) {
        Alert.alert(
          'Geçersiz kullanıcı adı',
          'Kullanıcı adı 3-20 karakter olmalı; harf, rakam, nokta ve alt çizgi içerebilir.'
        );
        return;
      }
      if (password.length < MIN_PASSWORD) {
        Alert.alert('Zayıf şifre', `Şifre en az ${MIN_PASSWORD} karakter olmalı.`);
        return;
      }
      if (password !== password2) {
        Alert.alert('Şifreler uyuşmuyor', 'İki şifre alanı aynı olmalı.');
        return;
      }
    }

    setBusy(true);
    try {
      if (isRegister) await register(name, password);
      else await login(name, password);
      // Başarılıysa AuthProvider kullanıcıyı ayarlar, uygulama ana ekrana geçer
    } catch (e) {
      setBusy(false);
      if (e instanceof AuthError && e.code === 'not_found') {
        Alert.alert('Üyelik bulunamadı', `"${name}" adında bir hesap yok. Üye olmak ister misin?`, [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Üye Ol', onPress: () => switchMode('register') },
        ]);
      } else if (e instanceof AuthError) {
        Alert.alert(isRegister ? 'Üyelik oluşturulamadı' : 'Giriş yapılamadı', e.message);
      } else {
        Alert.alert('Hata', 'Beklenmeyen bir hata oluştu, tekrar dene.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>💰</Text>
          <Text style={styles.title}>Finans Asistanı</Text>
          <Text style={styles.subtitle}>
            {isRegister ? 'Yeni bir hesap oluştur' : 'Hesabına giriş yap'}
          </Text>

          <Text style={styles.label}>Kullanıcı adı</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="ör. irem.k"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            maxLength={20}
          />

          <Text style={styles.label}>Şifre</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={isRegister ? `En az ${MIN_PASSWORD} karakter` : 'Şifren'}
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            textContentType={isRegister ? 'newPassword' : 'password'}
            onSubmitEditing={isRegister ? undefined : submit}
          />

          {isRegister && (
            <>
              <Text style={styles.label}>Şifre (tekrar)</Text>
              <TextInput
                style={styles.input}
                value={password2}
                onChangeText={setPassword2}
                placeholder="Şifreni tekrar gir"
                placeholderTextColor={colors.muted}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={submit}
              />
            </>
          )}

          <Pressable
            style={({ pressed }) => [styles.submitBtn, (pressed || busy) && { opacity: 0.8 }]}
            onPress={submit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>{isRegister ? 'Üye Ol' : 'Giriş Yap'}</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.switchBtn}
            onPress={() => switchMode(isRegister ? 'login' : 'register')}
            disabled={busy}
          >
            <Text style={styles.switchText}>
              {isRegister ? 'Zaten hesabın var mı? ' : 'Hesabın yok mu? '}
              <Text style={styles.switchLink}>{isRegister ? 'Giriş yap' : 'Üye ol'}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 56, textAlign: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
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
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchBtn: { alignItems: 'center', paddingVertical: 16 },
  switchText: { fontSize: 14, color: colors.muted },
  switchLink: { color: colors.primary, fontWeight: '700' },
});
