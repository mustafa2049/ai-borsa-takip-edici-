"""Groq uzerinden Turkce Al/Sat sinyalleri ve piyasa yorumlari ureten AI motoru.

GROQ_API_KEY tanimli degilse tum fonksiyonlar AI alanlarini bos birakarak
veri toplama hattinin calismasina izin verir.
"""

import json
import os
import time

import config

try:
    from groq import Groq
except ImportError:  # groq kurulmamissa da veri hatti calissin
    Groq = None

_SYSTEM = (
    "Sen kidemli bir BIST ve finans analistisin. Sadece gecerli JSON dondurursun, "
    "tum metinler Turkce olur. Bu ciktinin yatirim tavsiyesi olmadigini bilirsin."
)


def _client():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key or Groq is None:
        return None
    return Groq(api_key=api_key)


def _model():
    return os.environ.get("GROQ_MODEL", config.DEFAULT_GROQ_MODEL)


def _chat_json(client, prompt: str, retries: int = 2) -> dict | None:
    """JSON modunda tek istek; rate limit durumunda bekleyip yeniden dener."""
    for attempt in range(retries + 1):
        try:
            resp = client.chat.completions.create(
                model=_model(),
                messages=[
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            return json.loads(resp.choices[0].message.content)
        except Exception as exc:
            if attempt < retries:
                wait = 15 if "rate" in str(exc).lower() else 5
                time.sleep(wait)
            else:
                print(f"[ai_engine] Groq istegi basarisiz: {exc}")
    return None


def analyze_stocks(snapshots: list[dict], news_titles: list[str], prior_signals: dict | None = None) -> list[dict]:
    """Hisseleri AI_BATCH_SIZE'lik paketler halinde analiz eder, sinyalleri snapshot'lara ekler.

    prior_signals: {sembol: {"signal","date","confidence"}} - bir onceki calistirmada
    verilen sinyal. AI'ya sureklilik icin baglam olarak verilir; boylece sebepsiz
    sinyal degistirmeler yerine gercekten degisen bir sey oldugunda yon degisir.
    """
    client = _client()
    if not client:
        print("[ai_engine] GROQ_API_KEY yok - sinyal uretimi atlandi.")
        for snap in snapshots:
            snap["ai"] = None
        return snapshots

    prior_signals = prior_signals or {}
    news_block = "\n".join(f"- {t}" for t in news_titles[:10]) or "- (haber verisi yok)"
    by_symbol = {s["symbol"]: s for s in snapshots}

    for i in range(0, len(snapshots), config.AI_BATCH_SIZE):
        batch = snapshots[i:i + config.AI_BATCH_SIZE]
        prior_block_items = {
            s["symbol"]: {"signal": prior_signals[s["symbol"]]["signal"], "tarih": prior_signals[s["symbol"]]["date"]}
            for s in batch if s["symbol"] in prior_signals
        }
        prior_block = json.dumps(prior_block_items, ensure_ascii=False) if prior_block_items else "(gecmis sinyal yok)"

        prompt = f"""
Asagidaki BIST hisselerinin teknik ve temel verilerini, guncel haber basliklarini degerlendir.

TEKNIK VE TEMEL VERILER (rsi_14/macd/sma teknik; pe_ratio=F/K, pb_ratio=PD/DD, roe=ozkaynak karliligi %,
profit_margin=net kar marji %, revenue_growth=gelir buyumesi % - temel analiz alanlaridir, null ise o veri mevcut degildir):
{json.dumps(batch, ensure_ascii=False)}

GUNCEL HABER BASLIKLARI:
{news_block}

ONCEKI CALISTIRMADA VERILEN SINYALLER (sureklilik icin - sebepsiz yon degistirme, degisiyorsa gerekcede acikca belirt):
{prior_block}

Her hisse icin SADECE su JSON semasiyla yanit ver:
{{
  "signals": [
    {{
      "symbol": "THYAO",
      "signal": "GÜÇLÜ AL" | "AL" | "NÖTR" | "SAT" | "GÜÇLÜ SAT",
      "confidence": 0-100 arasi tamsayi,
      "target_price": sayi veya null,
      "stop_loss": sayi veya null,
      "timeframe": "orn. 2-4 Hafta",
      "rationale": ["Turkce gerekce 1", "Turkce gerekce 2", "Turkce gerekce 3"]
    }}
  ]
}}
"""
        result = _chat_json(client, prompt)
        if result:
            for sig in result.get("signals", []):
                snap = by_symbol.get(sig.get("symbol"))
                if snap:
                    snap["ai"] = {
                        "signal": sig.get("signal"),
                        "confidence": sig.get("confidence"),
                        "target_price": sig.get("target_price"),
                        "stop_loss": sig.get("stop_loss"),
                        "timeframe": sig.get("timeframe"),
                        "rationale": sig.get("rationale", []),
                    }
        time.sleep(3)  # ucretsiz katman rate limitine saygi

    for snap in snapshots:
        snap.setdefault("ai", None)
    return snapshots


def evaluate_funds(funds: list[dict], top_n: int) -> list[dict]:
    """En iyi getirili fonlar icin kisa Turkce AI degerlendirmesi ekler."""
    client = _client()
    subset = funds[:top_n]
    if not client or not subset:
        return funds

    prompt = f"""
Asagidaki TEFAS yatirim fonlarinin donemsel getirilerini degerlendir.

FONLAR:
{json.dumps(subset, ensure_ascii=False)}

SADECE su JSON semasiyla yanit ver:
{{
  "funds": [
    {{"code": "ABC", "risk": "Düşük" | "Orta" | "Yüksek", "comment": "En fazla 2 cumlelik Turkce degerlendirme"}}
  ]
}}
"""
    result = _chat_json(client, prompt)
    if result:
        by_code = {f.get("code"): f for f in result.get("funds", [])}
        for fund in subset:
            ai = by_code.get(fund["code"])
            if ai:
                fund["ai"] = {"risk": ai.get("risk"), "comment": ai.get("comment")}
    return funds


def summarize_news(news: list[dict], top_n: int) -> list[dict]:
    """One cikan haberlere 2 cumlelik Turkce piyasa etkisi ozeti ekler.

    Sadece baslik degil, RSS'ten alinan ozet metni (summary) de gonderilir;
    boylece duygu/etki degerlendirmesi haberin icerigine dayanir, baslik
    tahmininden ibaret kalmaz.
    """
    client = _client()
    subset = news[:top_n]
    if not client or not subset:
        return news

    titles = [
        {"id": i, "title": n["title"], "source": n["source"], "ozet": n.get("summary") or "(ozet yok)"}
        for i, n in enumerate(subset)
    ]
    prompt = f"""
Asagidaki finans haberlerinin (baslik + ozet metni) Turkiye ve dunya piyasalarina olasi etkisini degerlendir.

HABERLER:
{json.dumps(titles, ensure_ascii=False)}

SADECE su JSON semasiyla yanit ver:
{{
  "items": [
    {{"id": 0, "impact": "En fazla 2 cumlelik Turkce etki ozeti", "sentiment": "Pozitif" | "Negatif" | "Nötr"}}
  ]
}}
"""
    result = _chat_json(client, prompt)
    if result:
        by_id = {item.get("id"): item for item in result.get("items", [])}
        for i, item in enumerate(subset):
            ai = by_id.get(i)
            if ai:
                item["ai"] = {"impact": ai.get("impact"), "sentiment": ai.get("sentiment")}
    return news


def market_overview(ticker: list[dict], signals: list[dict]) -> str | None:
    """Ana sayfa icin genel piyasa gorunumu paragrafi uretir."""
    client = _client()
    if not client:
        return None

    prompt = f"""
Asagidaki endeks/kur verileri ve hisse sinyallerine gore gunun piyasa gorunumunu yaz.

ENDEKSLER: {json.dumps(ticker, ensure_ascii=False)}
SINYAL OZETI: {json.dumps([{"symbol": s["symbol"], "signal": (s.get("ai") or {}).get("signal")} for s in signals], ensure_ascii=False)}

SADECE su JSON semasiyla yanit ver:
{{"overview": "3-4 cumlelik Turkce genel piyasa degerlendirmesi"}}
"""
    result = _chat_json(client, prompt)
    return result.get("overview") if result else None
