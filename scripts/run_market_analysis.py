"""BorsaAI veri + AI sinyal hattini calistirir ve data/ altina JSON yazar.

GitHub Actions tarafindan zamanli olarak, gelistirme sirasinda elle calistirilir:
    python scripts/run_market_analysis.py
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import config
from app.services import ai_engine, bist_service, ipo_service, news_service, tefas_service


def _write(name: str, payload, compact: bool = False) -> None:
    out = ROOT / config.DATA_DIR / name
    out.parent.mkdir(parents=True, exist_ok=True)
    indent = None if compact else 2
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=indent), encoding="utf-8")
    print(f"[ok] {out.relative_to(ROOT)} yazildi.")


def main() -> None:
    now = datetime.now(ZoneInfo("Europe/Istanbul")).isoformat(timespec="seconds")
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()

    print("1/6 Ticker verileri cekiliyor...")
    ticker = bist_service.get_ticker_bar(config.TICKER_SYMBOLS)

    print("2/6 BIST hisse verileri cekiliyor...")
    snapshots, history = bist_service.get_watchlist_data(config.BIST_WATCHLIST)
    print(f"    {len(snapshots)}/{len(config.BIST_WATCHLIST)} hisse alindi.")

    print("3/6 TEFAS fon getirileri cekiliyor...")
    funds = tefas_service.get_fund_returns(config.TEFAS_WATCHLIST)
    print(f"    {len(funds)} fon alindi.")

    print("4/6 Halka arz listesi cekiliyor...")
    ipos = ipo_service.get_ipo_list()
    print(f"    {len(ipos)} halka arz kaydi alindi.")

    print("5/6 Haberler cekiliyor...")
    news = news_service.get_news(config.NEWS_FEEDS, config.NEWS_LIMIT)
    print(f"    {len(news)} haber alindi.")

    print("6/6 AI analizleri uretiliyor (Groq)...")
    news_titles = [n["title"] for n in news]
    snapshots = ai_engine.analyze_stocks(snapshots, news_titles)
    funds = ai_engine.evaluate_funds(funds, config.TEFAS_AI_LIMIT)
    news = ai_engine.summarize_news(news, config.NEWS_AI_LIMIT)
    overview = ai_engine.market_overview(ticker, snapshots)

    _write("history.json", {"updated_at": now, "series": history}, compact=True)
    _write("market_summary.json", {"updated_at": now, "overview": overview, "ticker": ticker})
    _write("signals.json", {"updated_at": now, "signals": snapshots})
    _write("funds.json", {"updated_at": now, "funds": funds})
    _write("ipos.json", {"updated_at": now, "ipos": ipos})
    _write("news.json", {"updated_at": now, "news": news})
    _write("version.json", {"version": version, "updated_at": now})
    print("Tamamlandi.")


if __name__ == "__main__":
    main()
