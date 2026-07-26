"""AI sinyal gecmisi: sureklilik (bir onceki sinyali hatirlama) ve dogruluk olcumu.

Her calistirmada uretilen sinyaller data/signal_log.json'a (sembol basina
gunde 1 kayit) eklenir. Bu log iki amaca hizmet eder:
1. Sureklilik: yeni sinyal uretilirken AI'ya "bir onceki sinyalin buydu"
   bilgisi verilir, boylece sebepsiz yon degistirmeler azalir.
2. Dogruluk: yeterince eski (SIGNAL_EVAL_DAYS gun once verilmis) sinyallerin
   yonu, guncel fiyatla karsilastirilarak "dogru muydu" diye degerlendirilir.
"""

from datetime import date, timedelta


def load_log(entries: list[dict] | None) -> list[dict]:
    return list(entries or [])


def previous_signal_map(entries: list[dict], before_date: str) -> dict[str, dict]:
    """Her sembol icin, `before_date`den kesinlikle onceki en son sinyal kaydi."""
    latest: dict[str, dict] = {}
    for e in entries:
        if e["date"] >= before_date:
            continue
        current = latest.get(e["symbol"])
        if current is None or e["date"] > current["date"]:
            latest[e["symbol"]] = e
    return latest


def upsert_today(entries: list[dict], today: str, today_signals: list[dict], retention_days: int) -> list[dict]:
    """Bugunun kayitlarini ekler/degistirir ve eski kayitlari budar.

    today_signals: [{"symbol", "signal", "confidence", "price"}, ...] (yalnizca AI sinyali olanlar)
    """
    kept = [e for e in entries if e["date"] != today]
    for s in today_signals:
        kept.append({"date": today, "symbol": s["symbol"], "signal": s["signal"],
                      "confidence": s.get("confidence"), "price": s.get("price")})
    cutoff = (date.fromisoformat(today) - timedelta(days=retention_days)).isoformat()
    return sorted((e for e in kept if e["date"] >= cutoff), key=lambda e: (e["date"], e["symbol"]))


def _is_correct(signal: str, price_then: float, price_now: float) -> bool | None:
    if not signal or price_then is None or price_now is None or not price_then:
        return None
    change = (price_now - price_then) / price_then
    if signal in ("GÜÇLÜ AL", "AL"):
        return change > 0
    if signal in ("SAT", "GÜÇLÜ SAT"):
        return change < 0
    return None  # NÖTR icin yon beklentisi tanimli degil, degerlendirme disi birakilir


def evaluate_accuracy(entries: list[dict], current_prices: dict[str, float], today: str, eval_days: int) -> dict:
    """Yeterince eskimis (>= eval_days gun once verilmis) sinyallerin yon dogrulugunu hesaplar."""
    cutoff = (date.fromisoformat(today) - timedelta(days=eval_days)).isoformat()
    evaluated = []
    for e in entries:
        if e["date"] > cutoff:
            continue
        price_now = current_prices.get(e["symbol"])
        if price_now is None:
            continue
        correct = _is_correct(e["signal"], e.get("price"), price_now)
        if correct is None:
            continue
        change_pct = round((price_now - e["price"]) / e["price"] * 100, 2) if e.get("price") else None
        evaluated.append({**e, "price_now": price_now, "change_pct": change_pct, "correct": correct})

    def _agg(items: list[dict]) -> dict:
        total = len(items)
        correct_n = sum(1 for i in items if i["correct"])
        return {"evaluated": total, "correct": correct_n,
                "accuracy_pct": round(correct_n / total * 100, 1) if total else None}

    by_signal: dict[str, dict] = {}
    by_symbol: dict[str, dict] = {}
    for label in ("GÜÇLÜ AL", "AL", "SAT", "GÜÇLÜ SAT"):
        items = [e for e in evaluated if e["signal"] == label]
        if items:
            by_signal[label] = _agg(items)
    for sym in {e["symbol"] for e in evaluated}:
        by_symbol[sym] = _agg([e for e in evaluated if e["symbol"] == sym])

    recent = sorted(evaluated, key=lambda e: e["date"], reverse=True)[:20]
    return {
        "eval_days": eval_days,
        "overall": _agg(evaluated),
        "by_signal": by_signal,
        "by_symbol": by_symbol,
        "recent": recent,
    }
