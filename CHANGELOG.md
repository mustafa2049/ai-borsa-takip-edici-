# Değişiklik Günlüğü

Tüm önemli değişiklikler bu dosyada listelenir. Sürümleme [Semantic Versioning](https://semver.org/lang/tr/) kurallarına uyar.

## [0.1.0] - 2026-07-26

### Eklendi
- Google Stitch ile üretilen 7 ekranlık Türkçe arayüz (Ana Sayfa, Piyasalar, Hisse Analiz, Halka Arz Takvimi, Portföy, Portföy AI Öngörüler, Portföy Kâr/Zarar).
- BIST veri servisi: fiyat, RSI, MACD, SMA 20/50, Bollinger bantları (yfinance).
- TEFAS fon servisi: tüm fonların 1A/3A/6A/YB/1Y getirileri.
- Halka arz servisi (halkarz.com üzerinden takvim).
- Haber servisi: Türkiye + dünya piyasaları RSS akışları.
- Groq AI motoru: Al/Sat sinyalleri, fon değerlendirmeleri, haber etki özetleri, günlük piyasa görünümü (llama-3.3-70b-versatile).
- GitHub Actions cron: BIST seans saatlerinde 30 dakikada bir otomatik güncelleme.
