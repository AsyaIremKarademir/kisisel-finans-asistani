// TCMB (Merkez Bankası) günlük kur bülteni. Anahtar gerektirmez.
// Bülten iş günlerinde öğleden sonra yayımlanır; hafta sonu ve tatilde son bülten döner.
const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';
const TIMEOUT_MS = 15000;

// XDR (IMF özel çekme hakkı) gerçek bir para birimi olmadığı için listelenmez
const SKIP = new Set(['XDR']);

const tag = (block, name) => block.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1]?.trim();

const ABBREVIATIONS = new Set(['ABD']);

// "ABD DOLARI" → "ABD Doları" (Türkçe I/İ kurallarına uygun)
function titleCaseTr(text) {
  return text
    .split(' ')
    .map((word) => {
      if (ABBREVIATIONS.has(word)) return word;
      const lower = word.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
      const first = lower[0] === 'i' ? 'İ' : lower[0] === 'ı' ? 'I' : lower[0].toUpperCase();
      return first + lower.slice(1);
    })
    .join(' ');
}

// Dönüş: { bulletinDate: 'YYYY-MM-DD', rates: [{ code, name, buying, selling }] }
// Fiyatlar 1 birim içindir (JPY gibi 100 birimle verilenler bölünür).
export async function fetchTcmbRates() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let xml;
  try {
    const res = await fetch(TCMB_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`TCMB yanıtı: ${res.status}`);
    xml = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const dateMatch = xml.match(/Tarih="(\d{2})\.(\d{2})\.(\d{4})"/);
  if (!dateMatch) throw new Error('Kur bülteni okunamadı.');
  const [, d, m, y] = dateMatch;

  const rates = [];
  for (const [, code, block] of xml.matchAll(/<Currency[^>]*Kod="([A-Z]+)"[^>]*>([\s\S]*?)<\/Currency>/g)) {
    if (SKIP.has(code)) continue;
    const unit = Number(tag(block, 'Unit')) || 1;
    const buying = Number(tag(block, 'ForexBuying'));
    const selling = Number(tag(block, 'ForexSelling'));
    if (!buying || !selling) continue;
    rates.push({
      code,
      name: titleCaseTr(tag(block, 'Isim') ?? code),
      buying: buying / unit,
      selling: selling / unit,
    });
  }
  if (rates.length === 0) throw new Error('Kur bülteninde kur bulunamadı.');

  return { bulletinDate: `${y}-${m}-${d}`, rates };
}
