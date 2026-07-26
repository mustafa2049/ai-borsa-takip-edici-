"""BorsaAI genel yapilandirma."""

# AI analizine girecek BIST hisseleri (BIST30 agirlikli izleme listesi)
BIST_WATCHLIST = [
    "THYAO", "ASELS", "EREGL", "TUPRS", "GARAN",
    "AKBNK", "ISCTR", "YKBNK", "KCHOL", "SAHOL",
    "SISE", "BIMAS", "FROTO", "TOASO", "TCELL",
    "PETKM", "ASTOR", "PGSUS", "EKGYO", "ARCLK",
]

# AI analizine girecek TEFAS fonlari (yeni TEFAS API'si toplu sorguyu
# desteklemedigi icin fonlar tek tek cekilir - liste kisa tutulmali)
TEFAS_WATCHLIST = [
    "TI2", "MAC", "GAF", "NNF", "HKH", "OPH", "TYH", "DAH",  # hisse yogun
    "TTE", "IDH", "GMR",                                      # tematik / endeks
    "AFT", "AFA", "TMG", "YAY",                               # yabanci hisse
    "TCD", "IPB", "YAC", "IPJ", "TGE",                        # degisken / sepet / emtia
]

# Ust bant canli ticker'inda gosterilecek endeksler / kurlar
TICKER_SYMBOLS = {
    "BIST 100": "XU100.IS",
    "S&P 500": "^GSPC",
    "Nasdaq": "^IXIC",
    "DAX": "^GDAXI",
    "Nikkei 225": "^N225",
    "USD/TRY": "USDTRY=X",
    "EUR/TRY": "EURTRY=X",
    "Ons Altin": "GC=F",
    "Brent Petrol": "BZ=F",
}

# Haber kaynaklari (RSS). Erisilemeyen kaynak sessizce atlanir.
NEWS_FEEDS = [
    {"source": "Investing Türkiye", "url": "https://tr.investing.com/rss/news.rss"},
    {"source": "BloombergHT", "url": "https://www.bloomberght.com/rss"},
    {"source": "Dünya Gazetesi", "url": "https://www.dunya.com/rss?dunya"},
    {"source": "CNBC World Markets", "url": "https://www.cnbc.com/id/100003114/device/rss/rss.html"},
]

# Kac haber saklansin / kac tanesi AI ozetine girsin
NEWS_LIMIT = 20
NEWS_AI_LIMIT = 8

# AI degerlendirmesine girecek fon sayisi (getiriye gore ilk N)
TEFAS_AI_LIMIT = 10

# Groq: tek istekte analiz edilecek hisse sayisi (rate limit dostu batching)
AI_BATCH_SIZE = 5
DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"

# Sinyal gecmisi: log kac gun saklansin, bir sinyal kac gun sonra "dogru muydu"
# diye degerlendirilsin (yon karsilastirmasi icin fiyatin degismesine zaman taniyor)
SIGNAL_LOG_RETENTION_DAYS = 120
SIGNAL_EVAL_DAYS = 7

# Uretilen JSON dosyalarinin yazilacagi klasor (repo koku altinda)
DATA_DIR = "data"
