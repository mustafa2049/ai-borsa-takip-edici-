"""Turkiye ve dunya piyasa haberleri (RSS kaynaklari)."""

import time

import feedparser
import requests

_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}


def get_news(feeds: list[dict], limit: int = 20) -> list[dict]:
    """Tanimli RSS kaynaklarindan haberleri toplar; erisilemeyen kaynak atlanir."""
    items = []
    for feed in feeds:
        try:
            resp = requests.get(feed["url"], headers=_HEADERS, timeout=20)
            resp.raise_for_status()
            parsed = feedparser.parse(resp.content)
        except Exception:
            continue
        for entry in parsed.entries[:10]:
            title = getattr(entry, "title", "").strip()
            if not title:
                continue
            published = getattr(entry, "published_parsed", None)
            items.append({
                "title": title,
                "url": getattr(entry, "link", None),
                "source": feed["source"],
                "published": time.strftime("%Y-%m-%dT%H:%M:%S", published) if published else None,
                "_sort": time.mktime(published) if published else 0,
            })

    items.sort(key=lambda x: x["_sort"], reverse=True)
    for item in items:
        item.pop("_sort", None)
    return items[:limit]
