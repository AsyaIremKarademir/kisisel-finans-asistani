// Tüm SQL sorguları burada. Ekranlar doğrudan SQL yazmaz, bu fonksiyonları çağırır.

// ---------- Kategoriler ----------
export function getCategories(db, type) {
  if (type) {
    return db.getAllAsync('SELECT * FROM categories WHERE type = ? ORDER BY id', type);
  }
  return db.getAllAsync('SELECT * FROM categories ORDER BY type, id');
}

// ---------- İşlemler ----------
export function getTransactionsByMonth(db, monthKey) {
  // monthKey: 'YYYY-MM'
  return db.getAllAsync(
    `SELECT t.*, c.name AS category_name, c.color AS category_color
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
      WHERE substr(t.date, 1, 7) = ?
      ORDER BY t.date DESC, t.id DESC`,
    monthKey
  );
}

export function getTransactionById(db, id) {
  return db.getFirstAsync('SELECT * FROM transactions WHERE id = ?', id);
}

export async function addTransaction(db, { type, amount, categoryId, date, note }) {
  const result = await db.runAsync(
    'INSERT INTO transactions (type, amount, category_id, date, note) VALUES (?, ?, ?, ?, ?)',
    type,
    amount,
    categoryId,
    date,
    note || null
  );
  return result.lastInsertRowId;
}

export function updateTransaction(db, id, { type, amount, categoryId, date, note }) {
  return db.runAsync(
    'UPDATE transactions SET type = ?, amount = ?, category_id = ?, date = ?, note = ? WHERE id = ?',
    type,
    amount,
    categoryId,
    date,
    note || null,
    id
  );
}

export function deleteTransaction(db, id) {
  return db.runAsync('DELETE FROM transactions WHERE id = ?', id);
}

// ---------- Özet ----------
export async function getMonthTotals(db, monthKey) {
  const row = await db.getFirstAsync(
    `SELECT
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
       FROM transactions
      WHERE substr(date, 1, 7) = ?`,
    monthKey
  );
  return { income: row.income, expense: row.expense, balance: row.income - row.expense };
}

export function getExpenseByCategory(db, monthKey) {
  return db.getAllAsync(
    `SELECT c.id, c.name, c.color, SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
      WHERE t.type = 'expense' AND substr(t.date, 1, 7) = ?
      GROUP BY c.id
      ORDER BY total DESC`,
    monthKey
  );
}

// ---------- Bütçeler ----------
export function getBudgetsWithSpending(db, monthKey) {
  // Her gider kategorisi için limit (varsa) ve o ayki harcama
  return db.getAllAsync(
    `SELECT c.id AS category_id, c.name, c.color,
            b.monthly_limit,
            COALESCE((SELECT SUM(t.amount) FROM transactions t
                       WHERE t.category_id = c.id
                         AND t.type = 'expense'
                         AND substr(t.date, 1, 7) = ?), 0) AS spent
       FROM categories c
       LEFT JOIN budgets b ON b.category_id = c.id
      WHERE c.type = 'expense'
      ORDER BY (b.monthly_limit IS NULL), c.id`,
    monthKey
  );
}

export function setBudget(db, categoryId, monthlyLimit) {
  return db.runAsync(
    `INSERT INTO budgets (category_id, monthly_limit) VALUES (?, ?)
     ON CONFLICT(category_id) DO UPDATE SET monthly_limit = excluded.monthly_limit`,
    categoryId,
    monthlyLimit
  );
}

export function removeBudget(db, categoryId) {
  return db.runAsync('DELETE FROM budgets WHERE category_id = ?', categoryId);
}

// Bir gider kaydedildikten sonra o kategorinin bütçesi aşıldı mı?
export async function checkBudget(db, categoryId, monthKey) {
  const row = await db.getFirstAsync(
    `SELECT c.name, b.monthly_limit,
            COALESCE((SELECT SUM(amount) FROM transactions
                       WHERE category_id = ? AND type = 'expense'
                         AND substr(date, 1, 7) = ?), 0) AS spent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
      WHERE b.category_id = ?`,
    categoryId,
    monthKey,
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
