# Finans Asistanı 💰

React Native (Expo) + JavaScript + SQLite ile yazılmış kişisel finans asistanı.
Mobil Uygulama Geliştirme dersi projesi.

## Özellikler (MVP)

- Gelir / gider ekleme (tutar, kategori, tarih, not)
- İşlem listesi; dokunarak düzenleme, basılı tutarak silme
- Aylık özet: toplam gelir, gider, kalan ve kategori bazlı pasta grafik
- Kategori bazında aylık bütçe limiti; %80'de uyarı, aşılınca alarm
- Tüm veriler cihazda SQLite veritabanında (`finans.db`) saklanır

## Çalıştırma

Gerekenler: Node.js (LTS), VS Code, telefonunda **Expo Go** uygulaması.

```bash
cd finans-asistani
npm install
npx expo start
```

Terminalde çıkan QR kodu Android'de Expo Go ile, iPhone'da kamera ile okut.
Telefon ve bilgisayar aynı Wi-Fi ağında olmalı. Olmuyorsa: `npx expo start --tunnel`

## Klasör yapısı

```
App.js                      Navigasyon + SQLiteProvider (giriş noktası)
src/
  db/
    database.js             Tablo oluşturma, varsayılan kategoriler
    queries.js              Tüm SQL sorguları
  screens/
    TransactionsScreen.js   İşlem listesi + aylık toplamlar
    TransactionFormScreen.js Ekle / düzenle formu, bütçe kontrolü
    SummaryScreen.js        Aylık özet + pasta grafik
    BudgetsScreen.js        Kategori limitleri ve ilerleme çubukları
  components/
    MonthSelector.js        ‹ Ay › seçici (tüm sekmelerde ortak)
    PieChart.js             react-native-svg ile halka grafik
    TransactionItem.js      Listedeki tek işlem kartı
  context/MonthContext.js   Seçili ayın paylaşılan durumu
  utils/format.js           Para (₺) ve tarih biçimlendirme
  theme.js                  Renkler
```

## Veritabanı

| Tablo          | Alanlar                                                   |
|----------------|-----------------------------------------------------------|
| `categories`   | id, name, type (income/expense), color                    |
| `transactions` | id, type, amount, category_id, date (YYYY-MM-DD), note    |
| `budgets`      | category_id, monthly_limit                                |

Şema değişikliği yaparsan `src/db/database.js` içindeki `DB_VERSION`'ı artırıp
yeni bir geçiş adımı ekle. Test sırasında sıfırdan başlamak için uygulamayı
telefondan silip yeniden açman yeterli.
