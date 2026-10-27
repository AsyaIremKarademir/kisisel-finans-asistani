// Veritabanı kurulumu: tablolar ve varsayılan kategoriler.
// SQLiteProvider uygulama açılırken bu fonksiyonu bir kez çalıştırır.

const DB_VERSION = 1;

const DEFAULT_CATEGORIES = [
  // [ad, tür, renk]
  ['Maaş', 'income', '#2E7D32'],
  ['Burs', 'income', '#43A047'],
  ['Serbest Çalışma', 'income', '#66BB6A'],
  ['Diğer Gelir', 'income', '#81C784'],
  ['Market', 'expense', '#E53935'],
  ['Yemek', 'expense', '#FB8C00'],
  ['Ulaşım', 'expense', '#1E88E5'],
  ['Kira', 'expense', '#8E24AA'],
  ['Faturalar', 'expense', '#00897B'],
  ['Eğlence', 'expense', '#F4511E'],
  ['Eğitim', 'expense', '#3949AB'],
  ['Sağlık', 'expense', '#D81B60'],
  ['Giyim', 'expense', '#6D4C41'],
  ['Diğer Gider', 'expense', '#757575'],
];

export async function initDatabase(db) {
  // Yabancı anahtarları ve daha hızlı yazma modunu aç
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion >= DB_VERSION) return;

  if (currentVersion === 0) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id    INTEGER PRIMARY KEY AUTOINCREMENT,
        name  TEXT NOT NULL,
        type  TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        color TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        amount      REAL NOT NULL CHECK (amount > 0),
        category_id INTEGER NOT NULL REFERENCES categories(id),
        date        TEXT NOT NULL,          -- 'YYYY-MM-DD'
        note        TEXT,
        created_at  TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS budgets (
        category_id   INTEGER PRIMARY KEY REFERENCES categories(id) ON DELETE CASCADE,
        monthly_limit REAL NOT NULL CHECK (monthly_limit > 0)
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    `);

    await db.withTransactionAsync(async () => {
      for (const [name, type, color] of DEFAULT_CATEGORIES) {
        await db.runAsync(
          'INSERT INTO categories (name, type, color) VALUES (?, ?, ?)',
          name,
          type,
          color
        );
      }
    });
  }

  // İleride tablo değiştirirsen: DB_VERSION'ı artır, buraya
  // "if (currentVersion < 2) { ... }" şeklinde yeni adım ekle.

  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}
