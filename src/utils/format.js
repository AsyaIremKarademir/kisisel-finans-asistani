// Para ve tarih yardımcıları

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const pad = (n) => String(n).padStart(2, '0');

export function formatMoney(value) {
  const n = Number(value) || 0;
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '-' : ''}${withDots},${dec} ₺`;
}

// Kullanıcının yazdığı "1.250,50" veya "1250.5" gibi metni sayıya çevirir
export function parseAmount(text) {
  if (!text) return NaN;
  let s = String(text).trim().replace(/\s/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return Number(s);
}

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toMonthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  return toMonthKey(new Date(y, m - 1 + delta, 1));
}

// Ayın belirli günü: 'YYYY-MM' + 31 → o ayda 31 yoksa ayın son günü
export function monthDayKey(monthKey, day) {
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${monthKey}-${pad(Math.min(day, lastDay))}`;
}

export function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTHS_TR[m - 1]} ${y}`;
}

export function formatDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return `${d} ${MONTHS_TR[m - 1]} ${y}`;
}
