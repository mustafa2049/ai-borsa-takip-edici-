"""TEFAS yatirim fonu getirileri (tefas-crawler uzerinden).

Yeni TEFAS API'si toplu sorguyu desteklemedigi icin config.TEFAS_WATCHLIST'teki
fonlar tek tek cekilir ve donemsel getiriler fiyat serisinden hesaplanir.
"""

import time
from datetime import date, timedelta

from tefas import Crawler


def _return_pct(prices, days: int):
    """Bugunden `days` gun oncesine gore yuzde getiri (seri yeterse)."""
    target = date.today() - timedelta(days=days)
    past = [row for row in prices if row["date"] <= target]
    if not past or not prices:
        return None
    old = past[-1]["price"]
    last = prices[-1]["price"]
    if not old:
        return None
    return round((last - old) / old * 100, 2)


def get_fund_returns(watchlist: list[str]) -> list[dict]:
    """Izleme listesindeki fonlarin 1A/3A/6A/1Y getirilerini hesaplar.

    Erisilemeyen fon atlanir; sonuc 1 aylik getiriye gore sirali doner.
    """
    crawler = Crawler()
    end = date.today()
    start = end - timedelta(days=400)
    funds = []

    for code in watchlist:
        try:
            data = crawler.fetch(
                start=start.isoformat(),
                end=end.isoformat(),
                name=code,
                columns=["date", "code", "title", "price"],
            )
        except Exception:
            continue
        if data is None or len(data) < 25:
            continue

        rows = sorted(
            ({"date": r["date"], "price": float(r["price"])} for _, r in data.iterrows()),
            key=lambda r: r["date"],
        )
        funds.append({
            "code": code,
            "name": data.iloc[0]["title"],
            "price": round(rows[-1]["price"], 6),
            "return_1m": _return_pct(rows, 30),
            "return_3m": _return_pct(rows, 91),
            "return_6m": _return_pct(rows, 182),
            "return_1y": _return_pct(rows, 365),
        })
        time.sleep(0.3)

    funds.sort(key=lambda f: (f["return_1m"] is None, -(f["return_1m"] or 0)))
    return funds
