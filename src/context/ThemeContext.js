// Kullanıcının seçtiği arka plan rengi. Her kullanıcı kendi rengini görür;
// seçim veritabanında saklanır, giriş yapılmamışken varsayılan renk kullanılır.
import { createContext, useContext, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from './AuthContext';
import { getUserSettings, saveBackgroundColor } from '../db/queries';
import { colors } from '../theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const db = useSQLiteContext();
  const { user } = useAuth();
  // Kaydedilen renk hangi kullanıcıya aitse onunla birlikte tutulur;
  // böylece hesap değişince önceki kullanıcının rengi görünmez.
  const [saved, setSaved] = useState({ userId: null, color: null });

  useEffect(() => {
    if (!user) return;
    let active = true;
    getUserSettings(db, user.id).then((row) => {
      if (active) setSaved({ userId: user.id, color: row?.background_color ?? null });
    });
    return () => {
      active = false;
    };
  }, [db, user]);

  const background =
    (user && saved.userId === user.id && saved.color) || colors.background;

  // color null ise varsayılan renge döner
  const setBackground = async (color) => {
    if (!user) return;
    setSaved({ userId: user.id, color });
    await saveBackgroundColor(db, user.id, color);
  };

  return (
    <ThemeContext.Provider value={{ background, setBackground }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
