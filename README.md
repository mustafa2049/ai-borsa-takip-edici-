# BorsaAI — Yapay Zeka Destekli Borsa Takip Uygulaması

BIST hisseleri, TEFAS yatırım fonları, halka arzlar ve dünya piyasası haberlerini takip eden; **Groq AI** (Llama 3.3 70B) ile Türkçe **Al/Sat sinyalleri** üreten, tamamen ücretsiz altyapıyla çalışan web uygulaması.

> ⚠️ **Uyarı:** Üretilen sinyaller yatırım tavsiyesi değildir; eğitim ve bilgilendirme amaçlıdır.

## Mimari

```
GitHub Actions (30 dk'da bir, BIST seans saatleri)
   └─> scripts/run_market_analysis.py
         ├─ bist_service   → yfinance: fiyat + RSI, MACD, SMA, Bollinger
         ├─ tefas_service  → TEFAS fon getirileri (1A/3A/6A/YB/1Y)
         ├─ ipo_service    → halka arz takvimi
         ├─ news_service   → TR + dünya RSS haber akışı
         └─ ai_engine      → Groq API: sinyaller, fon yorumları, haber özetleri
   └─> data/*.json  (commit + push → statik API)
GitHub Pages → index.html + data/*.json
```

## Kurulum

1. **Groq API anahtarı:** [console.groq.com/keys](https://console.groq.com/keys) → repo `Settings → Secrets and variables → Actions` altına `GROQ_API_KEY` olarak ekleyin.
2. **GitHub Pages:** `Settings → Pages → Source: Deploy from a branch → main / (root)` seçin.
3. **Actions:** `Actions` sekmesinden workflow'u etkinleştirin. "BorsaAI Veri ve Sinyal Guncelleme" workflow'unu **Run workflow** ile elle de tetikleyebilirsiniz.

## Yerelde çalıştırma

```bash
pip install -r requirements.txt
set GROQ_API_KEY=gsk_...   # PowerShell: $env:GROQ_API_KEY="gsk_..."
python scripts/run_market_analysis.py
```

Çıktılar `data/` klasörüne yazılır: `market_summary.json`, `signals.json`, `funds.json`, `ipos.json`, `news.json`, `version.json`.

## Sürümleme

- Sürüm numarası `VERSION` dosyasında tutulur, her güncellemede `data/version.json`'a yazılır.
- Değişiklikler `CHANGELOG.md`'de listelenir; her sürüm `git tag vX.Y.Z` ile etiketlenir.

## Ekranlar (Google Stitch)

| Dosya | Ekran |
|---|---|
| `index.html` | Ana Sayfa (AI sinyalleri, halka arz, fonlar, haberler) |
| `piyasalar.html` | Piyasalar (BIST + dünya endeksleri) |
| `hisse-analiz.html` | Hisse Detay + AI Al/Sat Raporu |
| `halka-arz.html` | Halka Arz Takvimi |
| `portfoy.html` | Portföy |
| `portfoy-ai-ongoruler.html` | Portföy AI Öngörüleri |
| `portfoy-kar-zarar.html` | Portföy Kâr/Zarar |

Tasarım sistemi: [docs/tasarim/DESIGN.md](docs/tasarim/DESIGN.md)
