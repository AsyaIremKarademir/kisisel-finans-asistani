// Tüm SQL sorguları burada. Ekranlar doğrudan SQL yazmaz, bu fonksiyonları çağırır.
// İşlem ve bütçe sorguları userId alır; her kullanıcı yalnızca kendi verisini görür.
import { monthDayKey, shiftMonth } from '../utils/format';

// ---------- Kullanıcılar ----------
export function getUserByUsername(db, username) {
  return db.getFirstAsync('SELECT * FROM users WHERE username = ?', username);
}

// Yeni kullanıcı oluşturur ve oturumu ona açar. İlk kullanıcıysa, giriş sistemi
// eklenmeden önce girilmiş (sahipsiz) işlem ve bütçeleri devralır.
export async function createUser(db, { username, passwordHash, salt }) {
  let userId;
  await db.withTransactionAsync(async () => {
    const { count } = await db.getFirstAsync('SELECT COUNT(*) AS count FROM users');
    const result = await db.runAsync(
      'INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)',
      username,
      passwordHash,
      salt
    );
    userId = result.lastInsertRowId;
    if (count === 0) {
      await db.runAsync('UPDATE transactions SET user_id = ? WHERE user_id IS NULL', userId);
      await db.runAsync('UPDATE budgets SET user_id = ? WHERE user_id IS NULL', userId);
    }
  });
  return userId;
}

// ---------- Oturum ----------
export function getSessionUser(db) {
  return db.getFirstAsync(
    'SELECT u.id, u.username FROM session s JOIN users u ON u.id = s.user_id WHERE s.id = 1'
  );
}

export function saveSession(db, userId) {
  return db.runAsync('INSERT OR REPLACE INTO session (id, user_id) VALUES (1, ?)', userId);
}

export function clearSession(db) {
  return db.runAsync('DELETE FROM session');
}

// ---------- Ayarlar ----------
export function getUserSettings(db, userId) {
  return db.getFirstAsync('SELECT * FROM user_settings WHERE user_id = ?', userId);
}

// color null ise varsayılan renge dönülür
export function saveBackgroundColor(db, userId, color) {
  return db.runAsync(
    `INSERT INTO user_settings (user_id, background_color) VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET background_color = excluded.background_color`,
    userId,
    color
  );
}

// ---------- Kategoriler ----------
export function getCategories(db, type) {
  if (type) {
    return db.getAllAsync('SELECT * FROM categories WHERE type = ? ORDER BY id', type);
  }
  return db.getAllAsync('SELECT * FROM categories ORDER BY type, id');
}

// ---------- İşlemler ----------
export function getTransactionsByMonth(db, userId, monthKey) {
  // monthKey: 'YYYY-MM'
  return db.getAllAsync(
    `SELECT t.*, c.name AS category_name, c.color AS category_color
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = ? AND substr(t.date, 1, 7) = ?
      ORDER BY t.date DESC, t.id DESC`,
    userId,
    monthKey
  );
}

export function getTransactionById(db, userId, id) {
  return db.getFirstAsync('SELECT * FROM transactions WHERE id = ? AND user_id = ?', id, userId);
}

export async function addTransaction(db, userId, { type, amount, categoryId, date, note, recurringId }) {
  const result = await db.runAsync(
    'INSERT INTO transactions (user_id, type, amount, category_id, date, note, recurring_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    userId,
    type,
    amount,
    categoryId,
    date,
    note || null,
    recurringId ?? null
  );
  return result.lastInsertRowId;
}

export function updateTransaction(db, userId, id, { type, amount, categoryId, date, note }) {
  return db.runAsync(
    'UPDATE transactions SET type = ?, amount = ?, category_id = ?, date = ?, note = ? WHERE id = ? AND user_id = ?',
    type,
    amount,
    categoryId,
    date,
    note || null,
    id,
    userId
  );
}

export function deleteTransaction(db, userId, id) {
  return db.runAsync('DELETE FROM transactions WHERE id = ? AND user_id = ?', id, userId);
}

// ---------- Tekrarlayan işlemler ----------
export function getRecurring(db, userId) {
  return db.getAllAsync(
    `SELECT r.*, c.name AS category_name, c.color AS category_color
       FROM recurring r
       JOIN categories c ON c.id = r.category_id
      WHERE r.user_id = ?
      ORDER BY r.type DESC, r.day_of_month, r.id`,
    userId
  );
}

// Girilen işlemi kaydeder ve her ay aynı gün tekrarlanmasını sağlar.
// Bu işlem ilk tekrar sayılır; sonraki kayıt bir sonraki ay oluşturulur.
export async function addRecurringTransaction(db, userId, { type, amount, categoryId, date, note }) {
  const [year, month, day] = date.split('-');
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO recurring (user_id, type, amount, category_id, day_of_month, note, next_month)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      userId,
      type,
      amount,
      categoryId,
      Number(day),
      note || null,
      shiftMonth(`${year}-${month}`, 1)
    );
    await addTransaction(db, userId, {
      type,
      amount,
      categoryId,
      date,
      note,
      recurringId: result.lastInsertRowId,
    });
  });
}

export function updateRecurringAmount(db, userId, id, amount) {
  return db.runAsync('UPDATE recurring SET amount = ? WHERE id = ? AND user_id = ?', amount, id, userId);
}

// Tekrarı durdurur; daha önce oluşturulmuş işlemler silinmez.
export function deleteRecurring(db, userId, id) {
  return db.runAsync('DELETE FROM recurring WHERE id = ? AND user_id = ?', id, userId);
}

// Günü gelmiş (todayKey dahil) ama henüz oluşturulmamış tekrar kayıtlarını ekler.
// Uygulama aylarca açılmasa bile aradaki her ay için bir kayıt oluşur.
export async function generateRecurring(db, userId, todayKey) {
  let created = 0;
  await db.withTransactionAsync(async () => {
    const rules = await db.getAllAsync(
      'SELECT * FROM recurring WHERE user_id = ? AND next_month <= ?',
      userId,
      todayKey.slice(0, 7)
    );
    for (const rule of rules) {
      let month = rule.next_month;
      while (monthDayKey(month, rule.day_of_month) <= todayKey) {
        await addTransaction(db, userId, {
          type: rule.type,
          amount: rule.amount,
          categoryId: rule.category_id,
          date: monthDayKey(month, rule.day_of_month),
          note: rule.note,
          recurringId: rule.id,
        });
        created++;
        month = shiftMonth(month, 1);
      }
      if (month !== rule.next_month) {
        await db.runAsync('UPDATE recurring SET next_month = ? WHERE id = ?', month, rule.id);
      }
    }
  });
  return created;
}

// ---------- Döviz kurları ----------
// Favoriler en üstte, sonra sık kullanılan kurlar, sonra TCMB sırası
const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF'];

export async function getCachedRates(db, userId) {
  const meta = await db.getFirstAsync('SELECT bulletin_date, fetched_at FROM exchange_meta WHERE id = 1');
  const rates = await db.getAllAsync(
    `SELECT r.*, (f.code IS NOT NULL) AS is_favorite
       FROM exchange_rates r
       LEFT JOIN favorite_currencies f ON f.code = r.code AND f.user_id = ?
      ORDER BY is_favorite DESC,
               CASE r.code ${POPULAR_CURRENCIES.map((c, i) => `WHEN '${c}' THEN ${i}`).join(' ')} ELSE 99 END,
               r.sort_order`,
    userId
  );
  return { meta, rates };
}

// TCMB'den gelen kurlarla önbelleği tamamen yeniler
export async function saveRates(db, { bulletinDate, rates }) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM exchange_rates');
    for (const [i, r] of rates.entries()) {
      await db.runAsync(
        'INSERT INTO exchange_rates (code, name, buying, selling, sort_order) VALUES (?, ?, ?, ?, ?)',
        r.code,
        r.name,
        r.buying,
        r.selling,
        i
      );
    }
    await db.runAsync(
      'INSERT OR REPLACE INTO exchange_meta (id, bulletin_date, fetched_at) VALUES (1, ?, ?)',
      bulletinDate,
      Date.now()
    );
  });
}

export function setFavoriteCurrency(db, userId, code, favorite) {
  if (favorite) {
    return db.runAsync(
      'INSERT OR IGNORE INTO favorite_currencies (user_id, code) VALUES (?, ?)',
      userId,
      code
    );
  }
  return db.runAsync('DELETE FROM favorite_currencies WHERE user_id = ? AND code = ?', userId, code);
}

// ---------- Özet ----------
export async function getMonthTotals(db, userId, monthKey) {
  const row = await db.getFirstAsync(
    `SELECT
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
       FROM transactions
      WHERE user_id = ? AND substr(date, 1, 7) = ?`,
    userId,
    monthKey
  );
  return { income: row.income, expense: row.expense, balance: row.income - row.expense };
}

export function getExpenseByCategory(db, userId, monthKey) {
  return db.getAllAsync(
    `SELECT c.id, c.name, c.color, SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = ? AND t.type = 'expense' AND substr(t.date, 1, 7) = ?
      GROUP BY c.id
      ORDER BY total DESC`,
    userId,
    monthKey
  );
}

// ---------- Bütçeler ----------
export function getBudgetsWithSpending(db, userId, monthKey) {
  // Her gider kategorisi için limit (varsa) ve o ayki harcama
  return db.getAllAsync(
    `SELECT c.id AS category_id, c.name, c.color,
            b.monthly_limit,
            COALESCE((SELECT SUM(t.amount) FROM transactions t
                       WHERE t.category_id = c.id
                         AND t.user_id = ?
                         AND t.type = 'expense'
                         AND substr(t.date, 1, 7) = ?), 0) AS spent
       FROM categories c
       LEFT JOIN budgets b ON b.category_id = c.id AND b.user_id = ?
      WHERE c.type = 'expense'
      ORDER BY (b.monthly_limit IS NULL), c.id`,
    userId,
    monthKey,
    userId
  );
}

export function setBudget(db, userId, categoryId, monthlyLimit) {
  return db.runAsync(
    `INSERT INTO budgets (user_id, category_id, monthly_limit) VALUES (?, ?, ?)
     ON CONFLICT(user_id, category_id) DO UPDATE SET monthly_limit = excluded.monthly_limit`,
    userId,
    categoryId,
    monthlyLimit
  );
}

export function removeBudget(db, userId, categoryId) {
  return db.runAsync('DELETE FROM budgets WHERE user_id = ? AND category_id = ?', userId, categoryId);
}

// Bir gider kaydedildikten sonra o kategorinin bütçesi aşıldı mı?
export async function checkBudget(db, userId, categoryId, monthKey) {
  const row = await db.getFirstAsync(
    `SELECT c.name, b.monthly_limit,
            COALESCE((SELECT SUM(amount) FROM transactions
                       WHERE user_id = ? AND category_id = ? AND type = 'expense'
                         AND substr(date, 1, 7) = ?), 0) AS spent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
      WHERE b.user_id = ? AND b.category_id = ?`,
    userId,
    categoryId,
    monthKey,
    userId,
    categoryId
  );
  if (!row) return null; // bu kategoriye bütçe tanımlı değil
  return {
    categoryName: row.name,
    limit: row.monthly_limit,
    spent: row.spent,
    ratio: row.spent / row.monthly_limit,
  };
}
