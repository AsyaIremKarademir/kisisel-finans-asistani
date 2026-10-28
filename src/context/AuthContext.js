// Giriş yapan kullanıcı ve giriş / üye ol / çıkış işlemleri.
// Şifreler düz metin saklanmaz: rastgele tuz + SHA-256 özeti tutulur.
import { createContext, useContext, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import {
  getUserByUsername,
  createUser,
  getSessionUser,
  saveSession,
  clearSession,
} from '../db/queries';

const AuthContext = createContext(null);

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

function hashPassword(password, salt) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + password);
}

// Hata mesajları doğrudan kullanıcıya gösterilir
export class AuthError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

export function AuthProvider({ children }) {
  const db = useSQLiteContext();
  const [user, setUser] = useState(null); // { id, username }
  const [loading, setLoading] = useState(true);

  // Uygulama açılırken önceki oturumu geri yükle
  useEffect(() => {
    (async () => {
      setUser((await getSessionUser(db)) ?? null);
      setLoading(false);
    })();
  }, [db]);

  const login = async (username, password) => {
    const row = await getUserByUsername(db, username);
    if (!row) throw new AuthError('Bu kullanıcı adıyla bir üyelik bulunamadı.', 'not_found');
    if ((await hashPassword(password, row.salt)) !== row.password_hash) {
      throw new AuthError('Şifre hatalı.', 'wrong_password');
    }
    await saveSession(db, row.id);
    setUser({ id: row.id, username: row.username });
  };

  const register = async (username, password) => {
    if (await getUserByUsername(db, username)) {
      throw new AuthError('Bu kullanıcı adı zaten alınmış.', 'taken');
    }
    const salt = toHex(await Crypto.getRandomBytesAsync(16));
    const passwordHash = await hashPassword(password, salt);
    const id = await createUser(db, { username, passwordHash, salt });
    await saveSession(db, id);
    setUser({ id, username });
  };

  const logout = async () => {
    await clearSession(db);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
