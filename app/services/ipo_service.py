"""Halka arz takvimi (halkarz.com uzerinden en-iyi-caba kazima)."""

import requests
from bs4 import BeautifulSoup

_URL = "https://halkarz.com/"
_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}


def get_ipo_list(limit: int = 15) -> list[dict]:
    """Guncel/yaklasan halka arz listesi. Kaynak erisilemezse bos liste doner."""
    try:
        resp = requests.get(_URL, headers=_HEADERS, timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
    except Exception:
        return []

    ipos = []
    for article in soup.find_all("article")[: limit * 2]:
        title_el = article.find(["h2", "h3"])
        link_el = article.find("a", href=True)
        if not title_el:
            continue
        title = title_el.get_text(strip=True)
        if not title:
            continue
        # Kart uzerindeki kisa metinler (tarih, fiyat, durum rozetleri)
        details = " | ".join(
            el.get_text(strip=True)
            for el in article.find_all(["li", "span", "time"])
            if el.get_text(strip=True)
        )[:400]
        ipos.append({
            "company": title,
            "url": link_el["href"] if link_el else _URL,
            "details": details or None,
        })
        if len(ipos) >= limit:
            break
    return ipos
