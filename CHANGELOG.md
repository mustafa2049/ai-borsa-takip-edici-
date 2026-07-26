# Değişiklik Günlüğü

Tüm önemli değişiklikler bu dosyada listelenir. Sürümleme [Semantic Versioning](https://semver.org/lang/tr/) kurallarına uyar.

## [0.3.0] - 2026-07-26

### Eklendi
- **Gerçek mum grafiği:** Hisse detay sayfasındaki süs grafik, gerçek 1 yıllık OHLC verisiyle çizilen interaktif mum grafiğiyle değiştirildi (1A / 3A / 6A / 1Y zaman aralıkları, fiyat ve tarih eksenleri). Veri backend'de `data/history.json` olarak üretiliyor.
- **Çalışan arama:** Ana Sayfa ve Piyasalar'daki arama kutuları artık hisse, fon ve halka arzlarda anlık arama yapıyor; sonuca tıklayınca ilgili sayfaya gidiyor.
- **Gerçek portföy takibi (localStorage):** Portföy sayfasından hisse/fon + adet + birim maliyet eklenebiliyor. Toplam varlık, günlük değişim, varlık dağılımı grafiği, Kâr/Zarar sayfasında maliyet bazlı K/Z, AI Öngörüler sayfasında portföydeki varlıkların güncel AI sinyalleri gösteriliyor. Veriler tarayıcıda saklanıyor, silme ve ortalama maliyetle birleştirme destekleniyor.

## [0.2.0] - 2026-07-26

### Eklendi
- Canlı veri katmanı (`assets/js/app.js`): tüm sayfalar artık `data/*.json` dosyalarından gerçek verileri okuyor.
- Ana Sayfa: AI sinyal kartları (güvene göre sıralı 10 kart), halka arz kartları, canlı haber + AI etki özeti, TEFAS öne çıkan fonlar bölümü, canlı ticker.
- Piyasalar: 20 hissenin canlı listesi (52 haftalık aralık çubuğuyla), çalışan sekmeler (Hisseler / Yatırım Fonları / Döviz-Altın), günün özeti kartları, AI piyasa görünümü.
- Hisse Analiz: `?s=SEMBOL` parametresiyle dinamik detay — fiyat, AI sinyal göstergesi (güven skoruna göre dolan gauge), hedef/stop, RSI, MACD, hareketli ortalama durumu ve AI gerekçeleri.
- Sayfalar arası çalışan navigasyon (yan menü + alt bar) ve geri butonu.
- Sağ altta sürüm + son güncelleme rozeti.

### Düzeltildi
- Hisse Analiz sayfasındaki yinelenen metrik blokları kaldırıldı.

## [0.1.0] - 2026-07-26

### Eklendi
- Google Stitch ile üretilen 7 ekranlık Türkçe arayüz (Ana Sayfa, Piyasalar, Hisse Analiz, Halka Arz Takvimi, Portföy, Portföy AI Öngörüler, Portföy Kâr/Zarar).
- BIST veri servisi: fiyat, RSI, MACD, SMA 20/50, Bollinger bantları (yfinance).
- TEFAS fon servisi: tüm fonların 1A/3A/6A/YB/1Y getirileri.
- Halka arz servisi (halkarz.com üzerinden takvim).
- Haber servisi: Türkiye + dünya piyasaları RSS akışları.
- Groq AI motoru: Al/Sat sinyalleri, fon değerlendirmeleri, haber etki özetleri, günlük piyasa görünümü (llama-3.3-70b-versatile).
- GitHub Actions cron: BIST seans saatlerinde 30 dakikada bir otomatik güncelleme.
