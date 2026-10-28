// Veritabanı kurulumu: tablolar ve varsayılan kategoriler.
// SQLiteProvider uygulama açılırken bu fonksiyonu bir kez çalıştırır.

const DB_VERSION = 2;

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

  // v2: kullanıcılar ve oturum. İşlemler ve bütçeler kullanıcıya bağlanır.
  // Eski kayıtların user_id'si NULL kalır; ilk üye olan kullanıcı bunları devralır.
  if (currentVersion < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        salt          TEXT NOT NULL,
        created_at    TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Açık oturum: en fazla tek satır
      CREATE TABLE IF NOT EXISTS session (
        id      INTEGER PRIMARY KEY CHECK (id = 1),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
      );

      ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);

      -- budgets'ın birincil anahtarı değiştiği için tablo yeniden oluşturulur
      CREATE TABLE budgets_new (
        user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        monthly_limit REAL NOT NULL CHECK (monthly_limit > 0),
        UNIQUE (user_id, category_id)
      );
      INSERT INTO budgets_new (category_id, monthly_limit) SELECT category_id, monthly_limit FROM budgets;
      DROP TABLE budgets;
      ALTER TABLE budgets_new RENAME TO budgets;
    `);
  }

  // İleride tablo değiştirirsen: DB_VERSION'ı artır, buraya
  // "if (currentVersion < 3) { ... }" şeklinde yeni adım ekle.

  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}
