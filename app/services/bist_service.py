"""BIST hisse verileri ve teknik indikatorler (yfinance uzerinden)."""

import math
import time

import pandas as pd
import yfinance as yf


def _num(value, digits=2):
    """NaN/None guvenli yuvarlama."""
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, digits)
    except (TypeError, ValueError):
        return None


def _rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / period, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / period, adjust=False).mean()
    rs = gain / loss
    return 100 - 100 / (1 + rs)


def get_stock_snapshot(symbol: str, hist: pd.DataFrame | None = None) -> dict | None:
    """Tek BIST hissesi icin fiyat + teknik gosterge ozeti."""
    if hist is None:
        try:
            hist = yf.Ticker(f"{symbol}.IS").history(period="1y", auto_adjust=False)
        except Exception:
            return None
    if hist is None or len(hist) < 60:
        return None

    close = hist["Close"]
    last, prev = close.iloc[-1], close.iloc[-2]
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26
    macd_signal = macd.ewm(span=9, adjust=False).mean()
    sma20 = close.rolling(20).mean()
    sma50 = close.rolling(50).mean()
    std20 = close.rolling(20).std()

    return {
        "symbol": symbol,
        "price": _num(last),
        "change_pct": _num((last - prev) / prev * 100),
        "change_pct_1w": _num((last - close.iloc[-6]) / close.iloc[-6] * 100) if len(close) > 6 else None,
        "change_pct_1m": _num((last - close.iloc[-22]) / close.iloc[-22] * 100) if len(close) > 22 else None,
        "volume": int(hist["Volume"].iloc[-1] or 0),
        "rsi_14": _num(_rsi(close).iloc[-1], 1),
        "macd": _num(macd.iloc[-1], 3),
        "macd_signal": _num(macd_signal.iloc[-1], 3),
        "sma_20": _num(sma20.iloc[-1]),
        "sma_50": _num(sma50.iloc[-1]),
        "bollinger_upper": _num((sma20 + 2 * std20).iloc[-1]),
        "bollinger_lower": _num((sma20 - 2 * std20).iloc[-1]),
        "high_52w": _num(close.max()),
        "low_52w": _num(close.min()),
    }


def _ohlc_series(hist: pd.DataFrame) -> list[list]:
    """Grafik icin kompakt gunluk OHLC serisi: [tarih, acilis, yuksek, dusuk, kapanis]."""
    series = []
    for ts, row in hist.iterrows():
        try:
            series.append([
                ts.strftime("%Y-%m-%d"),
                round(float(row["Open"]), 2),
                round(float(row["High"]), 2),
                round(float(row["Low"]), 2),
                round(float(row["Close"]), 2),
            ])
        except (TypeError, ValueError):
            continue
    return series


def get_watchlist_data(symbols: list[str]) -> tuple[list[dict], dict[str, list]]:
    """Izleme listesi icin snapshot listesi + sembol bazli OHLC gecmisi dondurur."""
    snapshots, history = [], {}
    for symbol in symbols:
        try:
            hist = yf.Ticker(f"{symbol}.IS").history(period="1y", auto_adjust=False)
        except Exception:
            hist = None
        snap = get_stock_snapshot(symbol, hist)
        if snap:
            snapshots.append(snap)
            history[symbol] = _ohlc_series(hist)
        time.sleep(0.4)  # yfinance rate limitine takilmamak icin
    return snapshots, history


def get_ticker_bar(ticker_symbols: dict[str, str]) -> list[dict]:
    """Ust bant canli ticker verisi: endeksler, kurlar, emtia."""
    items = []
    usdtry = None
    gold_usd = None
    for label, symbol in ticker_symbols.items():
        try:
            hist = yf.Ticker(symbol).history(period="5d")
            close = hist["Close"].dropna()
            if len(close) < 2:
                continue
            last, prev = close.iloc[-1], close.iloc[-2]
            items.append({
                "name": label,
                "symbol": symbol,
                "value": _num(last),
                "change_pct": _num((last - prev) / prev * 100),
            })
            if symbol == "USDTRY=X":
                usdtry = float(last)
            if symbol == "GC=F":
                gold_usd = float(last)
        except Exception:
            continue
        time.sleep(0.3)

    # Gram altin (TL) = ons fiyati * USD/TRY / 31.1035
    if usdtry and gold_usd:
        items.append({
            "name": "Gram Altın",
            "symbol": "GRAM-ALTIN",
            "value": _num(gold_usd * usdtry / 31.1035),
            "change_pct": None,
        })
    return items
