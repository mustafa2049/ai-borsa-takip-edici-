/* BorsaAI - data/*.json dosyalarini Stitch arayuzune baglayan canli veri katmani. */
(function () {
    "use strict";

    var STOCK_NAMES = {
        THYAO: "Türk Hava Yolları", ASELS: "Aselsan", EREGL: "Ereğli Demir Çelik",
        TUPRS: "Tüpraş", GARAN: "Garanti BBVA", AKBNK: "Akbank", ISCTR: "İş Bankası (C)",
        YKBNK: "Yapı Kredi", KCHOL: "Koç Holding", SAHOL: "Sabancı Holding",
        SISE: "Şişecam", BIMAS: "BİM Mağazalar", FROTO: "Ford Otosan", TOASO: "Tofaş Oto",
        TCELL: "Turkcell", PETKM: "Petkim", ASTOR: "Astor Enerji", PGSUS: "Pegasus",
        EKGYO: "Emlak Konut GYO", ARCLK: "Arçelik"
    };

    var SIGNAL_STYLES = {
        "GÜÇLÜ AL":  { badge: "bg-primary/20 text-primary border border-primary/30", tone: "primary" },
        "AL":        { badge: "border border-primary/50 text-primary", tone: "primary" },
        "NÖTR":      { badge: "bg-surface-container-high text-on-surface-variant border border-white/10", tone: "secondary" },
        "SAT":       { badge: "border border-error/50 text-error", tone: "error" },
        "GÜÇLÜ SAT": { badge: "bg-error/10 text-error border border-error/20", tone: "error" }
    };

    function loadJSON(name) {
        return fetch("data/" + name + ".json?t=" + Date.now()).then(function (r) {
            if (!r.ok) throw new Error(name + " yüklenemedi");
            return r.json();
        });
    }

    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function fmt(n, digits) {
        if (n == null || isNaN(n)) return "—";
        return Number(n).toLocaleString("tr-TR", {
            minimumFractionDigits: digits == null ? 2 : digits,
            maximumFractionDigits: digits == null ? 2 : digits
        });
    }

    function pctHtml(p, extra) {
        if (p == null) return "";
        var cls = p >= 0 ? "text-primary" : "text-error";
        var sign = p >= 0 ? "+" : "";
        return '<span class="' + cls + " " + (extra || "") + '">' + sign + fmt(p) + "%</span>";
    }

    function volFmt(v) {
        if (!v) return "";
        if (v >= 1e9) return fmt(v / 1e9, 1) + "Mr";
        if (v >= 1e6) return fmt(v / 1e6, 1) + "M";
        if (v >= 1e3) return fmt(v / 1e3, 1) + "B";
        return String(v);
    }

    function timeStr(iso) {
        if (!iso) return "";
        var d = new Date(iso);
        return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }) + " " +
               d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    }

    function stockName(sym) { return STOCK_NAMES[sym] || sym; }

    function signalStyle(sig) {
        return SIGNAL_STYLES[sig] || SIGNAL_STYLES["NÖTR"];
    }

    /* ---------- Navigasyon ---------- */

    var NAV_TARGETS = {
        "Ana Sayfa": "index.html",
        "Piyasalar": "piyasalar.html",
        "Portföy": "portfoy.html",
        "AI Analiz": "portfoy-ai-ongoruler.html"
    };

    function wireNav() {
        document.querySelectorAll("nav a, nav button, aside a, aside button").forEach(function (el) {
            // Material ikon ligature metni de textContent'e girdigi icin exact match yerine icerme kontrolu
            var label = el.textContent;
            var target = null;
            Object.keys(NAV_TARGETS).forEach(function (key) {
                if (!target && label.indexOf(key) !== -1) target = NAV_TARGETS[key];
            });
            if (!target) return;
            if (el.tagName === "A") {
                el.setAttribute("href", target);
            } else {
                el.addEventListener("click", function () { window.location.href = target; });
            }
        });
        var back = document.querySelector('button[aria-label="Geri"]');
        if (back) back.addEventListener("click", function () {
            if (history.length > 1) history.back(); else window.location.href = "index.html";
        });
    }

    /* ---------- Ticker ---------- */

    function tickerChip(t) {
        return '<div class="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-full border border-white/5 whitespace-nowrap">' +
            '<span class="text-on-surface-variant">' + esc(t.name) + "</span>" +
            '<span class="font-data-display text-on-surface">' + fmt(t.value) + "</span>" +
            pctHtml(t.change_pct) + "</div>";
    }

    function tickerInline(t) {
        return '<span class="mx-4 whitespace-nowrap"><span class="text-on-surface-variant">' + esc(t.name) + "</span> " +
            '<span class="text-on-surface ml-1">' + fmt(t.value) + "</span> " +
            pctHtml(t.change_pct, "ml-1") + "</span>";
    }

    function renderTicker(summary) {
        var items = summary.ticker || [];
        if (!items.length) return;

        var desktop = document.getElementById("ticker-desktop");
        if (desktop) desktop.innerHTML = items.slice(0, 5).map(tickerChip).join("");

        // Kayan bantlar: sorunsuz dongu icin icerik iki kez basilir
        document.querySelectorAll(".ticker-scroll, .ticker-content").forEach(function (el) {
            var html = items.map(tickerInline).join("");
            el.innerHTML = html + html;
        });
    }

    /* ---------- Ana sayfa: AI sinyal kartlari ---------- */

    function signalCard(s) {
        var ai = s.ai || {};
        var st = signalStyle(ai.signal);
        var conf = ai.confidence != null ? "%" + ai.confidence : "—";
        return '<a href="hisse-analiz.html?s=' + esc(s.symbol) + '" class="glass-panel glass-card-inner-stroke rounded-xl p-panel-padding min-w-[280px] snap-center flex flex-col gap-4 relative overflow-hidden group">' +
            '<div class="absolute inset-0 bg-' + st.tone + '/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>' +
            '<div class="flex justify-between items-start"><div>' +
            '<h3 class="font-headline-md text-headline-md text-on-surface">' + esc(s.symbol) + "</h3>" +
            '<p class="text-body-sm text-on-surface-variant">' + esc(stockName(s.symbol)) + "</p></div>" +
            '<span class="px-3 py-1 rounded-full font-label-caps ' + st.badge + '">' + esc(ai.signal || "NÖTR") + "</span></div>" +
            '<div class="flex items-end justify-between mt-2"><div>' +
            '<span class="font-data-display text-data-display text-on-surface">' + fmt(s.price) + " TL</span>" +
            pctHtml(s.change_pct, "text-body-sm ml-2 font-semibold") + "</div>" +
            '<div class="flex items-center gap-1 text-label-caps text-on-surface-variant">' +
            '<span class="material-symbols-outlined text-[16px]">bolt</span>' +
            'AI Güven: <span class="text-on-surface">' + conf + "</span></div></div></a>";
    }

    function renderSignals(signals) {
        var wrap = document.getElementById("ai-signal-cards");
        if (!wrap) return;
        var withAI = signals.filter(function (s) { return s.ai && s.ai.signal; });
        // En yuksek guvenli sinyaller one gelsin
        withAI.sort(function (a, b) { return (b.ai.confidence || 0) - (a.ai.confidence || 0); });
        var list = withAI.length ? withAI : signals;
        wrap.innerHTML = list.slice(0, 10).map(signalCard).join("");
    }

    /* ---------- Halka arz ---------- */

    function ipoCard(ipo) {
        var chips = [];
        (ipo.details || "").split("|").forEach(function (part) {
            part = part.trim();
            if (part && chips.indexOf(part) === -1 && chips.length < 3) chips.push(part);
        });
        return '<div class="bg-surface-container-low/50 rounded-lg p-4 border border-white/5 flex flex-col gap-3 relative overflow-hidden">' +
            '<div class="flex justify-between items-start"><div>' +
            '<h3 class="font-data-display text-data-display text-on-surface">' + esc(ipo.company) + "</h3></div>" +
            '<span class="bg-secondary text-[#000] px-2 py-1 rounded text-[10px] font-bold tracking-wide">YENİ</span></div>' +
            '<div class="flex items-center gap-2 text-label-caps flex-wrap">' +
            chips.map(function (c) {
                return '<span class="bg-surface-container-high text-on-surface-variant px-2 py-1 rounded border border-white/5">' + esc(c) + "</span>";
            }).join("") + "</div>" +
            '<a href="' + esc(ipo.url) + '" target="_blank" rel="noopener" class="mt-1 flex items-center gap-1 text-body-sm text-secondary hover:underline">' +
            '<span class="material-symbols-outlined text-[18px]">open_in_new</span> Detayları İncele</a></div>';
    }

    function renderIpos(ipos) {
        var section = document.getElementById("ipo-section");
        if (!section) return;
        var heading = section.querySelector("h2");
        var headWrap = heading ? (heading.closest("div") === section ? heading : heading.parentElement) : null;
        Array.prototype.slice.call(section.children).forEach(function (child) {
            if (child !== heading && child !== headWrap) section.removeChild(child);
        });
        var max = window.location.pathname.indexOf("halka-arz") !== -1 ? 8 : 3;
        section.insertAdjacentHTML("beforeend", ipos.slice(0, max).map(ipoCard).join(""));
    }

    /* ---------- Haberler ---------- */

    function renderNews(newsData) {
        var section = document.getElementById("news-section");
        if (!section) return;
        var news = newsData.news || [];
        if (!news.length) return;
        var featured = news.filter(function (n) { return n.ai && n.ai.impact; })[0] || news[0];
        var rest = news.filter(function (n) { return n !== featured; }).slice(0, 4);

        var html = '<div class="flex flex-col gap-4 bg-surface-container-low/50 rounded-lg p-4 border border-white/5 h-full">' +
            '<div class="flex-1 flex flex-col justify-center">' +
            '<a href="' + esc(featured.url) + '" target="_blank" rel="noopener" class="font-data-display text-on-surface mb-2 hover:text-primary transition-colors">' + esc(featured.title) + "</a>" +
            '<p class="text-body-sm text-on-surface-variant mb-4">' + esc(featured.source) + " · " + timeStr(featured.published) + "</p>";
        if (featured.ai && featured.ai.impact) {
            html += '<div class="mt-auto bg-primary/10 border border-primary/20 rounded-lg p-3 relative overflow-hidden">' +
                '<div class="flex items-start gap-2 relative z-10">' +
                '<span class="material-symbols-outlined text-primary text-[20px] mt-0.5">insights</span><div>' +
                '<h4 class="text-label-caps text-primary mb-1">AI Özet &amp; Etki (' + esc(featured.ai.sentiment || "Nötr") + ")</h4>" +
                '<p class="text-body-sm text-on-surface">' + esc(featured.ai.impact) + "</p></div></div></div>";
        }
        html += "</div>" +
            '<div class="flex flex-col divide-y divide-white/5 border-t border-white/5 pt-2">' +
            rest.map(function (n) {
                return '<a href="' + esc(n.url) + '" target="_blank" rel="noopener" class="py-2 flex items-start justify-between gap-3 group">' +
                    '<span class="text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors line-clamp-1">' + esc(n.title) + "</span>" +
                    '<span class="text-label-caps text-on-surface-variant/60 whitespace-nowrap">' + esc(n.source) + "</span></a>";
            }).join("") + "</div></div>";

        var heading = section.querySelector("h2");
        Array.prototype.slice.call(section.children).forEach(function (child) {
            if (child !== heading) section.removeChild(child);
        });
        section.insertAdjacentHTML("beforeend", html);
    }

    /* ---------- Ana sayfa: TEFAS fon bolumu (JS ile eklenir) ---------- */

    function renderFundsSection(fundsData) {
        var anchor = document.getElementById("ipo-section");
        if (!anchor || document.getElementById("funds-section")) return;
        var funds = (fundsData.funds || []).slice(0, 6);
        if (!funds.length) return;

        var rows = funds.map(function (f) {
            var ai = f.ai || {};
            return '<div class="grid grid-cols-12 px-4 py-3 items-center gap-2 hover:bg-white/5 transition-colors">' +
                '<span class="col-span-2 font-data-display text-on-surface">' + esc(f.code) + "</span>" +
                '<span class="col-span-6 text-body-sm text-on-surface-variant truncate">' + esc(f.name) + "</span>" +
                '<span class="col-span-2 text-right text-body-sm">' + pctHtml(f.return_1m) + "</span>" +
                '<span class="col-span-2 text-right text-body-sm">' + pctHtml(f.return_1y) + "</span>" +
                (ai.comment ? '<p class="col-span-12 text-[11px] text-on-surface-variant/80 flex items-start gap-1 mt-1">' +
                    '<span class="material-symbols-outlined text-secondary text-[14px]">auto_awesome</span>' +
                    esc(ai.comment) + (ai.risk ? " (Risk: " + esc(ai.risk) + ")" : "") + "</p>" : "") +
                "</div>";
        }).join("");

        var html = '<section id="funds-section" class="glass-panel glass-card-inner-stroke rounded-xl p-panel-padding flex flex-col gap-4 mt-gutter md:mt-0">' +
            '<h2 class="font-headline-md text-headline-md text-on-surface flex items-center gap-2">' +
            '<span class="material-symbols-outlined text-secondary">savings</span>TEFAS Öne Çıkan Fonlar</h2>' +
            '<div class="rounded-lg overflow-hidden border border-white/5">' +
            '<div class="grid grid-cols-12 px-4 py-2 bg-surface-container/50 text-label-caps text-on-surface-variant gap-2">' +
            '<span class="col-span-2">KOD</span><span class="col-span-6">FON ADI</span>' +
            '<span class="col-span-2 text-right">1 AYLIK</span><span class="col-span-2 text-right">1 YILLIK</span></div>' +
            '<div class="flex flex-col divide-y divide-white/5">' + rows + "</div></div></section>";

        var grid = anchor.closest(".grid") || anchor.parentElement;
        grid.insertAdjacentHTML("afterend", html);
    }

    /* ---------- Piyasalar sayfasi ---------- */

    function stockRow(s) {
        var up = (s.change_pct || 0) >= 0;
        var tone = up ? "primary" : "error";
        var range = "";
        if (s.high_52w && s.low_52w && s.price != null && s.high_52w > s.low_52w) {
            var pos = Math.min(100, Math.max(0, (s.price - s.low_52w) / (s.high_52w - s.low_52w) * 100));
            range = '<div class="mt-1 w-16 h-1 bg-white/10 rounded-full relative">' +
                '<div class="absolute h-full bg-' + tone + '/40 rounded-full" style="left:0;width:' + pos.toFixed(0) + '%"></div></div>' +
                '<span class="text-[10px] text-on-surface-variant mt-0.5">52H: ' + fmt(s.low_52w, 0) + " - " + fmt(s.high_52w, 0) + "</span>";
        }
        return '<a href="hisse-analiz.html?s=' + esc(s.symbol) + '" class="grid grid-cols-4 px-4 py-3 items-center hover:bg-white/5 transition-colors cursor-pointer">' +
            '<div class="col-span-2 flex items-center gap-3">' +
            '<div class="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center text-xs font-bold text-on-surface">' + esc(s.symbol.slice(0, 3)) + "</div>" +
            '<div class="flex flex-col"><span class="font-body-lg text-body-lg text-on-surface">' + esc(s.symbol) + "</span>" +
            '<span class="font-label-caps text-label-caps text-on-surface-variant">' + esc(stockName(s.symbol)) + "</span></div></div>" +
            '<div class="text-right flex flex-col items-end justify-center">' +
            '<span class="font-body-sm text-body-sm text-on-surface">' + fmt(s.price) + " TL</span>" + range + "</div>" +
            '<div class="text-right flex flex-col items-end justify-center">' +
            '<div class="flex items-center gap-1"><span class="material-symbols-outlined text-' + tone + ' text-[16px]">' +
            (up ? "trending_up" : "trending_down") + "</span>" + pctHtml(s.change_pct, "font-body-sm text-body-sm") + "</div>" +
            '<span class="text-[10px] text-on-surface-variant">' + volFmt(s.volume) + " Hacim</span></div></a>";
    }

    function fundRow(f) {
        return '<div class="grid grid-cols-4 px-4 py-3 items-center hover:bg-white/5 transition-colors">' +
            '<div class="col-span-2 flex items-center gap-3">' +
            '<div class="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center text-xs font-bold text-secondary">' + esc(f.code) + "</div>" +
            '<div class="flex flex-col"><span class="font-body-lg text-body-lg text-on-surface">' + esc(f.code) + "</span>" +
            '<span class="font-label-caps text-label-caps text-on-surface-variant truncate max-w-[180px] md:max-w-xs">' + esc(f.name) + "</span></div></div>" +
            '<div class="text-right"><span class="font-body-sm text-body-sm text-on-surface">' + fmt(f.price, 4) + " TL</span></div>" +
            '<div class="text-right flex flex-col items-end justify-center">' + pctHtml(f.return_1m, "font-body-sm text-body-sm") +
            '<span class="text-[10px] text-on-surface-variant">1Y: ' + (f.return_1y == null ? "—" : "%" + fmt(f.return_1y)) + "</span></div></div>";
    }

    function currencyRow(t) {
        var up = (t.change_pct || 0) >= 0;
        return '<div class="grid grid-cols-4 px-4 py-3 items-center hover:bg-white/5 transition-colors">' +
            '<div class="col-span-2 flex items-center gap-3">' +
            '<div class="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center"><span class="material-symbols-outlined text-secondary text-[18px]">currency_exchange</span></div>' +
            '<span class="font-body-lg text-body-lg text-on-surface">' + esc(t.name) + "</span></div>" +
            '<div class="text-right"><span class="font-body-sm text-body-sm text-on-surface">' + fmt(t.value) + "</span></div>" +
            '<div class="text-right"><div class="flex items-center gap-1 justify-end">' +
            (t.change_pct == null ? '<span class="text-body-sm text-on-surface-variant">—</span>' :
                '<span class="material-symbols-outlined text-' + (up ? "primary" : "error") + ' text-[16px]">' + (up ? "trending_up" : "trending_down") + "</span>" +
                pctHtml(t.change_pct, "font-body-sm text-body-sm")) + "</div></div></div>";
    }

    function renderMarketsPage(signals, fundsData, summary) {
        var rowsEl = document.getElementById("stock-list-rows");
        if (!rowsEl) return;

        var forecast = document.getElementById("ai-daily-forecast");
        if (forecast && summary.overview) forecast.textContent = summary.overview;

        var highlights = document.getElementById("market-highlights");
        if (highlights && signals.length) {
            var sorted = signals.slice().sort(function (a, b) { return (b.change_pct || 0) - (a.change_pct || 0); });
            var gainer = sorted[0], loser = sorted[sorted.length - 1];
            var mostVol = signals.slice().sort(function (a, b) { return (b.volume || 0) - (a.volume || 0); })[0];
            highlights.innerHTML =
                '<div class="glass-panel rounded-xl p-4 flex flex-col gap-2"><span class="font-label-caps text-label-caps text-on-surface-variant">En Çok Yükselen</span>' +
                '<div class="flex items-end justify-between"><span class="font-data-display text-data-display text-on-surface">' + esc(gainer.symbol) + "</span>" +
                pctHtml(gainer.change_pct, "font-body-sm text-body-sm font-bold") + "</div></div>" +
                '<div class="glass-panel rounded-xl p-4 flex flex-col gap-2"><span class="font-label-caps text-label-caps text-on-surface-variant">En Çok Düşen</span>' +
                '<div class="flex items-end justify-between"><span class="font-data-display text-data-display text-on-surface">' + esc(loser.symbol) + "</span>" +
                pctHtml(loser.change_pct, "font-body-sm text-body-sm font-bold") + "</div></div>" +
                '<div class="glass-panel rounded-xl p-4 flex flex-col gap-2 col-span-2 md:col-span-1"><span class="font-label-caps text-label-caps text-on-surface-variant">En Yüksek Hacim</span>' +
                '<div class="flex items-end justify-between"><span class="font-data-display text-data-display text-on-surface">' + esc(mostVol.symbol) + "</span>" +
                '<span class="font-body-sm text-body-sm text-on-surface-variant">' + volFmt(mostVol.volume) + " Hacim</span></div></div>";
        }

        var header = document.getElementById("stock-list-header");
        var title = document.getElementById("list-title");

        function show(tab) {
            if (tab === "funds") {
                if (title) title.textContent = "Yatırım Fonları";
                if (header) header.innerHTML = '<span class="font-label-caps text-label-caps text-on-surface-variant col-span-2">Fon</span>' +
                    '<span class="font-label-caps text-label-caps text-on-surface-variant text-right">Fiyat</span>' +
                    '<span class="font-label-caps text-label-caps text-on-surface-variant text-right">1 Aylık %</span>';
                rowsEl.innerHTML = (fundsData.funds || []).map(fundRow).join("") ||
                    '<p class="p-4 text-body-sm text-on-surface-variant">Fon verisi bulunamadı.</p>';
            } else if (tab === "fx") {
                if (title) title.textContent = "Döviz / Altın / Emtia";
                if (header) header.innerHTML = '<span class="font-label-caps text-label-caps text-on-surface-variant col-span-2">Enstrüman</span>' +
                    '<span class="font-label-caps text-label-caps text-on-surface-variant text-right">Değer</span>' +
                    '<span class="font-label-caps text-label-caps text-on-surface-variant text-right">Günlük %</span>';
                var fx = (summary.ticker || []).filter(function (t) {
                    return ["USDTRY=X", "EURTRY=X", "GC=F", "BZ=F", "GRAM-ALTIN"].indexOf(t.symbol) !== -1;
                });
                rowsEl.innerHTML = fx.map(currencyRow).join("");
            } else {
                if (title) title.textContent = "Hisseler";
                if (header) header.innerHTML = '<span class="font-label-caps text-label-caps text-on-surface-variant col-span-2">Sembol</span>' +
                    '<span class="font-label-caps text-label-caps text-on-surface-variant text-right">Fiyat</span>' +
                    '<span class="font-label-caps text-label-caps text-on-surface-variant text-right">Günlük %</span>';
                rowsEl.innerHTML = signals.map(stockRow).join("");
            }
        }

        var tabs = document.getElementById("market-tabs");
        if (tabs) {
            var mapping = { "Hisseler": "stocks", "Yatırım Fonları": "funds", "Döviz/Altın": "fx" };
            var active = "px-4 py-2 rounded-full bg-primary/20 text-primary border border-primary/30 font-label-caps text-label-caps whitespace-nowrap";
            var passive = "px-4 py-2 rounded-full glass-panel text-on-surface-variant hover:text-on-surface transition-colors font-label-caps text-label-caps whitespace-nowrap";
            tabs.querySelectorAll("button").forEach(function (btn) {
                var tab = mapping[btn.textContent.trim()];
                if (!tab) { btn.classList.add("opacity-40", "cursor-not-allowed"); return; }
                btn.addEventListener("click", function () {
                    tabs.querySelectorAll("button").forEach(function (b) { b.className = passive; });
                    btn.className = active;
                    show(tab);
                });
            });
        }
        // Aramadan fon linkiyle gelindiyse fon sekmesini ac
        if (window.location.hash === "#fon" && tabs) {
            var fundBtn = Array.prototype.slice.call(tabs.querySelectorAll("button")).filter(function (b) {
                return b.textContent.indexOf("Yatırım Fonları") !== -1;
            })[0];
            if (fundBtn) { fundBtn.click(); return; }
        }
        show("stocks");
    }

    /* ---------- Hisse detay sayfasi ---------- */

    function renderStockDetail(signals) {
        var titleEl = document.getElementById("stock-title");
        if (!titleEl) return;

        var params = new URLSearchParams(window.location.search);
        var symbol = (params.get("s") || "THYAO").toUpperCase();
        var s = signals.filter(function (x) { return x.symbol === symbol; })[0] || signals[0];
        if (!s) return;

        var ai = s.ai || {};
        var st = signalStyle(ai.signal);
        document.title = "BorsaAI - " + s.symbol + " Detay";
        titleEl.innerHTML = '<span class="text-on-surface">' + esc(s.symbol) + "</span> " +
            '<span class="text-on-surface-variant text-body-sm font-normal block -mt-1 truncate">' + esc(stockName(s.symbol)) + "</span>";

        var priceEl = document.getElementById("stock-price");
        if (priceEl) priceEl.innerHTML = fmt(s.price) + ' <span class="text-body-lg text-on-surface-variant">TL</span>';

        var changeEl = document.getElementById("stock-change");
        if (changeEl) {
            var up = (s.change_pct || 0) >= 0;
            var tone = up ? "primary" : "error";
            changeEl.className = "bg-" + tone + "-container/20 px-3 py-1.5 rounded-md border border-" + tone + "/30 flex items-center gap-1";
            changeEl.innerHTML = '<span class="material-symbols-outlined text-' + tone + ' text-sm">' + (up ? "trending_up" : "trending_down") + "</span>" +
                pctHtml(s.change_pct, "font-data-display text-data-display");
        }

        var sigText = document.getElementById("ai-signal-text");
        if (sigText) {
            sigText.textContent = ai.signal || "VERİ BEKLENİYOR";
            sigText.className = "font-headline-lg-mobile text-headline-lg-mobile font-bold neon-glow text-" + st.tone;
        }
        var confEl = document.getElementById("ai-confidence");
        if (confEl) confEl.textContent = "Güven Skoru: " + (ai.confidence != null ? "%" + ai.confidence : "—");

        var arc = document.getElementById("gauge-arc");
        if (arc) {
            // CSS'teki .gauge-arc kurali attribute'u ezdigi icin inline style kullanilir
            var len = Math.PI * 40;
            var frac = (ai.confidence || 0) / 100;
            arc.style.strokeDasharray = (len * frac).toFixed(1) + " " + (len * 2).toFixed(1);
            arc.style.strokeDashoffset = "0";
            arc.setAttribute("class", "text-" + st.tone);
        }

        function setText(id, text, toneCls) {
            var el = document.getElementById(id);
            if (!el) return;
            el.textContent = text;
            if (toneCls) el.className = el.className.replace(/text-(primary|error|secondary|on-surface)\b/g, "").trim() + " " + toneCls;
        }
        setText("ai-target", ai.target_price != null ? fmt(ai.target_price) + " TL" : "—");
        setText("ai-stop", ai.stop_loss != null ? fmt(ai.stop_loss) + " TL" : "—");
        setText("ai-timeframe", ai.timeframe || "—");

        var maBuy = s.price != null && s.sma_20 != null && s.price > s.sma_20;
        setText("ma-status", s.sma_20 == null ? "—" : (maBuy ? "AL (Fiyat > SMA20)" : "SAT (Fiyat < SMA20)"), maBuy ? "text-primary" : "text-error");
        var macdPos = s.macd != null && s.macd_signal != null && s.macd > s.macd_signal;
        setText("macd-status", s.macd == null ? "—" : (macdPos ? "POZİTİF KESİŞİM" : "NEGATİF KESİŞİM"), macdPos ? "text-primary" : "text-error");

        var ul = document.getElementById("ai-rationale");
        if (ul) {
            var items = (ai.rationale && ai.rationale.length) ? ai.rationale : ["Bu hisse için AI analizi bir sonraki güncellemede üretilecek."];
            ul.innerHTML = items.map(function (r) {
                return '<li class="flex items-start gap-2">' +
                    '<span class="material-symbols-outlined text-' + st.tone + ' text-sm mt-0.5">check_circle</span>' +
                    '<span class="font-body-sm text-body-sm text-on-surface-variant">' + esc(r) + "</span></li>";
            }).join("");
        }

        var extra = document.getElementById("stock-extra-metrics");
        if (extra) {
            extra.innerHTML =
                '<div class="bg-surface-container/50 rounded-lg p-3 border border-white/5"><span class="block text-label-caps font-label-caps text-on-surface-variant mb-1">RSI (14)</span>' +
                '<span class="block font-data-display text-data-display text-on-surface">' + (s.rsi_14 == null ? "—" : fmt(s.rsi_14, 1)) + "</span></div>" +
                '<div class="bg-surface-container/50 rounded-lg p-3 border border-white/5"><span class="block text-label-caps font-label-caps text-on-surface-variant mb-1">52 HAFTA</span>' +
                '<span class="block font-data-display text-data-display text-on-surface text-sm">' + fmt(s.low_52w, 0) + " - " + fmt(s.high_52w, 0) + "</span></div>";
        }
    }

    /* ---------- Mum grafigi (hisse detay) ---------- */

    function candleSvg(data) {
        var W = 800, H = 300, padL = 52, padR = 10, padT = 12, padB = 26;
        var max = -Infinity, min = Infinity;
        data.forEach(function (r) { if (r[2] > max) max = r[2]; if (r[3] < min) min = r[3]; });
        if (!isFinite(max) || !isFinite(min)) return "";
        if (max === min) max = min + 1;
        var iw = W - padL - padR, ih = H - padT - padB;
        function y(v) { return padT + (max - v) / (max - min) * ih; }
        var step = iw / data.length;
        var bw = Math.max(1.5, Math.min(12, step * 0.6));

        var parts = [];
        for (var g = 0; g <= 4; g++) {
            var val = max - (max - min) * g / 4;
            var gy = y(val).toFixed(1);
            parts.push('<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy +
                '" stroke="rgba(255,255,255,0.07)" stroke-dasharray="4" stroke-width="1"/>');
            parts.push('<text x="' + (padL - 6) + '" y="' + (parseFloat(gy) + 3) + '" text-anchor="end" ' +
                'fill="#86948a" font-size="10" font-family="Inter,sans-serif">' + fmt(val, val >= 1000 ? 0 : 2) + "</text>");
        }
        data.forEach(function (r, i) {
            var x = padL + i * step + step / 2;
            var up = r[4] >= r[1];
            var color = up ? "#4edea3" : "#ffb4ab";
            var bodyTop = y(Math.max(r[1], r[4]));
            var bodyH = Math.max(1, Math.abs(y(r[1]) - y(r[4])));
            parts.push('<line x1="' + x.toFixed(1) + '" y1="' + y(r[2]).toFixed(1) + '" x2="' + x.toFixed(1) +
                '" y2="' + y(r[3]).toFixed(1) + '" stroke="' + color + '" stroke-width="1"/>');
            parts.push('<rect x="' + (x - bw / 2).toFixed(1) + '" y="' + bodyTop.toFixed(1) + '" width="' + bw.toFixed(1) +
                '" height="' + bodyH.toFixed(1) + '" rx="1" fill="' + color + '"/>');
        });
        [0, Math.floor(data.length / 2), data.length - 1].forEach(function (i) {
            if (!data[i]) return;
            var x = padL + i * step + step / 2;
            var anchor = i === 0 ? "start" : (i === data.length - 1 ? "end" : "middle");
            var d = new Date(data[i][0]);
            var label = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
            parts.push('<text x="' + x.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + anchor +
                '" fill="#86948a" font-size="10" font-family="Inter,sans-serif">' + label + "</text>");
        });
        return '<svg class="w-full h-full" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none">' + parts.join("") + "</svg>";
    }

    function initChart() {
        var canvas = document.getElementById("chart-canvas");
        if (!canvas) return;
        var symbol = (new URLSearchParams(window.location.search).get("s") || "THYAO").toUpperCase();
        loadJSON("history").then(function (h) {
            var series = (h.series || {})[symbol];
            if (!series || series.length < 5) return;
            var ranges = { "1A": 22, "3A": 66, "6A": 130, "1Y": 100000 };
            var passive = "flex-1 py-1 text-label-caps font-label-caps text-on-surface-variant hover:text-on-surface transition-colors rounded-md";
            var active = "flex-1 py-1 text-label-caps font-label-caps bg-surface-container text-primary shadow-sm rounded-md";

            function draw(key) {
                canvas.innerHTML = candleSvg(series.slice(-ranges[key]));
            }
            var tabs = document.getElementById("chart-tabs");
            if (tabs) {
                tabs.innerHTML = Object.keys(ranges).map(function (k) {
                    return '<button data-range="' + k + '" class="' + (k === "3A" ? active : passive) + '">' + k + "</button>";
                }).join("");
                tabs.querySelectorAll("button").forEach(function (btn) {
                    btn.addEventListener("click", function () {
                        tabs.querySelectorAll("button").forEach(function (b) { b.className = passive; });
                        btn.className = active;
                        draw(btn.getAttribute("data-range"));
                    });
                });
            }
            draw("3A");
        }).catch(function () { /* grafik verisi yoksa placeholder kalir */ });
    }

    /* ---------- Arama ---------- */

    function initSearch(signals, fundsData, ipos) {
        var funds = fundsData.funds || [];

        function buildResults(q) {
            q = q.toLocaleLowerCase("tr");
            var out = [];
            signals.forEach(function (s) {
                if (out.length >= 8) return;
                var name = stockName(s.symbol);
                if (s.symbol.toLocaleLowerCase("tr").indexOf(q) !== -1 || name.toLocaleLowerCase("tr").indexOf(q) !== -1) {
                    out.push({ tag: "HİSSE", tagCls: "text-primary border-primary/40", code: s.symbol, name: name,
                        extra: fmt(s.price) + " TL", href: "hisse-analiz.html?s=" + s.symbol });
                }
            });
            funds.forEach(function (f) {
                if (out.length >= 8) return;
                if (f.code.toLocaleLowerCase("tr").indexOf(q) !== -1 || String(f.name).toLocaleLowerCase("tr").indexOf(q) !== -1) {
                    out.push({ tag: "FON", tagCls: "text-secondary border-secondary/40", code: f.code, name: f.name,
                        extra: f.return_1m == null ? "" : "1A: %" + fmt(f.return_1m), href: "piyasalar.html#fon" });
                }
            });
            ipos.forEach(function (ipo) {
                if (out.length >= 8) return;
                if (String(ipo.company).toLocaleLowerCase("tr").indexOf(q) !== -1) {
                    out.push({ tag: "HALKA ARZ", tagCls: "text-secondary border-secondary/40", code: "", name: ipo.company,
                        extra: "", href: ipo.url, external: true });
                }
            });
            return out;
        }

        document.querySelectorAll('input[placeholder*="Ara"]').forEach(function (input) {
            var parent = input.parentElement;
            if (!parent) return;
            if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
            var dd = document.createElement("div");
            dd.className = "absolute top-full left-0 right-0 mt-2 z-[70] bg-surface-container-high border border-white/10 rounded-lg shadow-2xl overflow-hidden hidden";
            parent.appendChild(dd);

            function hide() { dd.classList.add("hidden"); }
            function show(q) {
                if (!q || q.length < 1) { hide(); return; }
                var results = buildResults(q);
                if (!results.length) {
                    dd.innerHTML = '<p class="px-4 py-3 text-body-sm text-on-surface-variant">Sonuç bulunamadı.</p>';
                } else {
                    dd.innerHTML = results.map(function (r) {
                        return '<a href="' + esc(r.href) + '"' + (r.external ? ' target="_blank" rel="noopener"' : "") +
                            ' class="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">' +
                            '<span class="text-[9px] font-bold border rounded px-1.5 py-0.5 ' + r.tagCls + '">' + r.tag + "</span>" +
                            '<span class="text-body-sm text-on-surface font-semibold">' + esc(r.code) + "</span>" +
                            '<span class="text-body-sm text-on-surface-variant truncate flex-1">' + esc(r.name) + "</span>" +
                            '<span class="text-label-caps text-on-surface-variant whitespace-nowrap">' + esc(r.extra) + "</span></a>";
                    }).join("");
                }
                dd.classList.remove("hidden");
            }
            input.addEventListener("input", function () { show(input.value.trim()); });
            input.addEventListener("focus", function () { if (input.value.trim()) show(input.value.trim()); });
            input.addEventListener("blur", function () { setTimeout(hide, 200); });
        });
    }

    /* ---------- Portfoy (localStorage) ---------- */

    var PF_KEY = "borsaai_portfolio_v1";

    function pfLoad() {
        try { return JSON.parse(localStorage.getItem(PF_KEY)) || []; } catch (e) { return []; }
    }
    function pfSave(list) { localStorage.setItem(PF_KEY, JSON.stringify(list)); }

    function moneyFmt(v) {
        return "₺" + fmt(v);
    }

    function initPortfolio(signals, fundsData) {
        var section = document.getElementById("pf-holdings-section");
        if (!section) return;
        var funds = fundsData.funds || [];
        var path = window.location.pathname;
        var page = path.indexOf("kar-zarar") !== -1 ? "pl" : (path.indexOf("ai-ongoruler") !== -1 ? "ai" : "main");

        function infoOf(h) {
            if (h.type === "fund") {
                var f = funds.filter(function (x) { return x.code === h.code; })[0];
                return f ? { name: f.name, price: f.price, change: null, ai: f.ai || null } : null;
            }
            var s = signals.filter(function (x) { return x.symbol === h.code; })[0];
            return s ? { name: stockName(h.code), price: s.price, change: s.change_pct, ai: s.ai || null } : null;
        }

        function holdingRow(entry) {
            var h = entry.h, inf = entry.inf;
            var initials = h.code.slice(0, 2);
            var left = '<div class="flex items-center gap-3">' +
                '<div class="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center font-headline-md text-headline-md text-on-surface font-bold">' + esc(initials) + "</div><div>" +
                '<h4 class="font-data-display text-data-display font-bold">' + esc(h.code) +
                (h.type === "fund" ? ' <span class="text-label-caps text-on-surface-variant font-normal bg-surface-container-high px-1.5 py-0.5 rounded">FON</span>' : "") + "</h4>" +
                '<p class="font-body-sm text-body-sm text-on-surface-variant truncate max-w-[180px] md:max-w-xs">' + esc(inf.name) + " · " + fmt(h.qty, 0) + " adet</p></div></div>";

            var right = "";
            if (page === "pl") {
                var pl = entry.val - entry.cost;
                var plPct = entry.cost ? pl / entry.cost * 100 : 0;
                right = '<div class="text-right flex flex-col gap-1">' +
                    '<div class="font-data-display text-data-display">' + moneyFmt(entry.val) + "</div>" +
                    '<div class="font-body-sm text-body-sm ' + (pl >= 0 ? "text-primary" : "text-error") + '">' +
                    (pl >= 0 ? "+" : "") + moneyFmt(pl).replace("₺-", "-₺") + " (" + (pl >= 0 ? "+" : "") + fmt(plPct) + "%)</div>" +
                    '<div class="text-[10px] text-on-surface-variant">Maliyet: ' + moneyFmt(entry.cost) + "</div></div>";
            } else if (page === "ai") {
                var ai = inf.ai;
                if (h.type === "fund") {
                    right = '<div class="text-right flex flex-col gap-1 max-w-[220px]">' +
                        (ai && ai.comment ? '<p class="text-body-sm text-on-surface-variant">' + esc(ai.comment) + "</p>" +
                            (ai.risk ? '<span class="text-label-caps text-secondary">Risk: ' + esc(ai.risk) + "</span>" : "")
                        : '<span class="text-body-sm text-on-surface-variant">AI değerlendirmesi yok</span>') + "</div>";
                } else {
                    var st = signalStyle(ai && ai.signal);
                    right = '<div class="text-right flex flex-col items-end gap-1">' +
                        '<span class="px-3 py-1 rounded-full font-label-caps ' + st.badge + '">' + esc((ai && ai.signal) || "VERİ YOK") + "</span>" +
                        (ai ? '<span class="text-label-caps text-on-surface-variant">Güven: %' + (ai.confidence != null ? ai.confidence : "—") +
                            (ai.target_price != null ? " · Hedef: " + fmt(ai.target_price) + " TL" : "") + "</span>" : "") + "</div>";
                }
            } else {
                var daily = inf.change != null ? entry.val * inf.change / 100 : null;
                right = '<div class="text-right flex flex-col gap-1">' +
                    '<div class="font-data-display text-data-display">' + moneyFmt(entry.val) + "</div>" +
                    (daily == null ? '<div class="font-body-sm text-body-sm text-on-surface-variant">günlük veri yok</div>' :
                        '<div class="font-body-sm text-body-sm ' + (daily >= 0 ? "text-primary" : "text-error") + '">' +
                        (daily >= 0 ? "+" : "") + moneyFmt(daily).replace("₺-", "-₺") + " (" + (daily >= 0 ? "+" : "") + fmt(inf.change) + "%)</div>") + "</div>";
            }
            var del = '<button data-del="' + esc(h.code) + '" title="Portföyden çıkar" class="ml-3 text-on-surface-variant hover:text-error transition-colors">' +
                '<span class="material-symbols-outlined text-[20px]">delete</span></button>';
            var href = h.type === "stock" ? ' onclick="if(!event.target.closest(\'button\'))window.location.href=\'hisse-analiz.html?s=' + esc(h.code) + '\'"' : "";
            return '<div class="glass-panel glass-inner-stroke rounded-lg p-4 flex justify-between items-center hover:bg-surface-container-high/50 transition-colors cursor-pointer"' + href + ">" +
                left + '<div class="flex items-center">' + right + del + "</div></div>";
        }

        function addFormHtml() {
            var stockOpts = signals.map(function (s) {
                return '<option value="stock:' + esc(s.symbol) + '">' + esc(s.symbol) + " — " + esc(stockName(s.symbol)) + "</option>";
            }).join("");
            var fundOpts = funds.map(function (f) {
                return '<option value="fund:' + esc(f.code) + '">' + esc(f.code) + " — " + esc(String(f.name).slice(0, 40)) + "</option>";
            }).join("");
            var inputCls = "bg-surface-container-high border border-white/10 rounded-lg px-3 py-2.5 text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary outline-none";
            return '<div class="glass-panel glass-inner-stroke rounded-lg p-4 flex flex-col md:flex-row gap-3 mb-2" id="pf-add">' +
                '<select id="pf-code" class="' + inputCls + ' flex-1"><optgroup label="Hisseler">' + stockOpts + "</optgroup>" +
                '<optgroup label="Yatırım Fonları">' + fundOpts + "</optgroup></select>" +
                '<input id="pf-qty" type="number" min="0" step="any" placeholder="Adet" class="' + inputCls + ' md:w-28"/>' +
                '<input id="pf-cost" type="number" min="0" step="any" placeholder="Birim Maliyet (TL)" class="' + inputCls + ' md:w-44"/>' +
                '<button id="pf-add-btn" class="bg-primary hover:bg-primary-container text-on-primary rounded-lg px-5 py-2.5 font-body-sm font-semibold transition-colors">Ekle</button></div>';
        }

        function renderAlloc(entries, totV) {
            var alloc = document.getElementById("pf-alloc");
            if (!alloc || !totV) return;
            var stockV = 0, fundV = 0;
            entries.forEach(function (e) { if (e.h.type === "fund") fundV += e.val; else stockV += e.val; });
            var sp = Math.round(stockV / totV * 100), fp = 100 - sp;
            alloc.innerHTML = '<h3 class="font-headline-md text-headline-md">Varlık Dağılımı</h3>' +
                '<div class="flex flex-col md:flex-row items-center gap-6">' +
                '<div class="relative w-40 h-40 flex items-center justify-center">' +
                '<svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">' +
                '<circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#313540" stroke-width="3.5"></circle>' +
                '<circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#4edea3" stroke-width="3.5" stroke-dasharray="' + sp + ' 100"></circle>' +
                '<circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#ffb95f" stroke-width="3.5" stroke-dasharray="' + fp + ' 100" stroke-dashoffset="-' + sp + '"></circle></svg>' +
                '<div class="absolute flex flex-col items-center"><span class="text-headline-md font-bold">' + moneyFmt(totV) + '</span><span class="text-label-caps opacity-60">Toplam</span></div></div>' +
                '<div class="flex-1 grid grid-cols-1 gap-3 w-full">' +
                '<div class="flex items-center justify-between p-2 rounded-lg bg-surface-variant/30"><div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-primary"></div><span class="text-body-sm">Hisse Senetleri</span></div><span class="font-bold">%' + sp + "</span></div>" +
                '<div class="flex items-center justify-between p-2 rounded-lg bg-surface-variant/30"><div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-secondary-fixed-dim"></div><span class="text-body-sm">Yatırım Fonları</span></div><span class="font-bold">%' + fp + "</span></div></div></div>";
        }

        function render() {
            var list = pfLoad();
            var entries = [], totV = 0, totC = 0, totD = 0, hasDaily = false;
            list.forEach(function (h) {
                var inf = infoOf(h);
                if (!inf || inf.price == null) return;
                var val = h.qty * inf.price, cost = h.qty * h.cost;
                totV += val; totC += cost;
                if (inf.change != null) { totD += val * inf.change / 100; hasDaily = true; }
                entries.push({ h: h, inf: inf, val: val, cost: cost });
            });

            var totalEl = document.getElementById("pf-total");
            if (totalEl) totalEl.textContent = moneyFmt(totV);
            var dailyEl = document.getElementById("pf-daily");
            if (dailyEl) {
                var amount, pct, label;
                if (page === "pl") {
                    amount = totV - totC;
                    pct = totC ? amount / totC * 100 : 0;
                    label = "Toplam Kâr/Zarar";
                } else {
                    amount = hasDaily ? totD : 0;
                    pct = totV ? amount / totV * 100 : 0;
                    label = "Günlük Değişim";
                }
                var pos = amount >= 0;
                dailyEl.innerHTML = '<span class="font-data-display text-data-display ' + (pos ? "text-primary" : "text-error") + ' flex items-center">' +
                    '<span class="material-symbols-outlined text-sm mr-1">' + (pos ? "arrow_upward" : "arrow_downward") + "</span>" +
                    (pos ? "+" : "") + moneyFmt(amount).replace("₺-", "-₺") + " (" + (pos ? "+" : "") + fmt(pct) + "%)</span>" +
                    '<span class="font-body-sm text-body-sm text-on-surface-variant ml-2">' + label + "</span>";
            }

            var heading = section.querySelector("h3");
            Array.prototype.slice.call(section.children).forEach(function (child) {
                if (child !== heading) section.removeChild(child);
            });
            var html = "";
            if (page === "main") html += addFormHtml();
            if (!entries.length) {
                html += '<div class="glass-panel rounded-lg p-6 text-center text-body-sm text-on-surface-variant">' +
                    (page === "main" ? "Portföyünüz henüz boş. Yukarıdaki formdan ilk varlığınızı ekleyin." :
                        'Portföyünüz henüz boş. <a href="portfoy.html" class="text-primary hover:underline">Portföy sayfasından</a> varlık ekleyebilirsiniz.') + "</div>";
            } else {
                html += entries.map(holdingRow).join("");
            }
            section.insertAdjacentHTML("beforeend", html);
            renderAlloc(entries, totV);

            var addBtn = document.getElementById("pf-add-btn");
            if (addBtn) addBtn.addEventListener("click", function () {
                var sel = document.getElementById("pf-code").value.split(":");
                var qty = parseFloat(document.getElementById("pf-qty").value);
                var cost = parseFloat(document.getElementById("pf-cost").value);
                if (!qty || qty <= 0 || !cost || cost <= 0) {
                    alert("Lütfen geçerli adet ve birim maliyet girin.");
                    return;
                }
                var list2 = pfLoad();
                var existing = list2.filter(function (x) { return x.code === sel[1] && x.type === sel[0]; })[0];
                if (existing) {
                    // Ayni varlik tekrar eklenirse agirlikli ortalama maliyet hesaplanir
                    var newQty = existing.qty + qty;
                    existing.cost = (existing.qty * existing.cost + qty * cost) / newQty;
                    existing.qty = newQty;
                } else {
                    list2.push({ type: sel[0], code: sel[1], qty: qty, cost: cost });
                }
                pfSave(list2);
                render();
            });
            section.querySelectorAll("button[data-del]").forEach(function (btn) {
                btn.addEventListener("click", function (ev) {
                    ev.stopPropagation();
                    var code = btn.getAttribute("data-del");
                    pfSave(pfLoad().filter(function (x) { return x.code !== code; }));
                    render();
                });
            });
        }
        render();
    }

    /* ---------- Surum rozeti ---------- */

    function renderVersionBadge(version) {
        var badge = document.createElement("div");
        badge.className = "fixed bottom-24 md:bottom-4 right-4 z-40 bg-surface-container-high/90 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 text-[11px] text-on-surface-variant flex items-center gap-1.5 pointer-events-none";
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>' +
            "BorsaAI v" + esc(version.version) + " · " + timeStr(version.updated_at);
        document.body.appendChild(badge);
    }

    /* ---------- Baslat ---------- */

    document.addEventListener("DOMContentLoaded", function () {
        wireNav();

        Promise.allSettled([
            loadJSON("market_summary"), loadJSON("signals"), loadJSON("funds"),
            loadJSON("ipos"), loadJSON("news"), loadJSON("version")
        ]).then(function (results) {
            var summary = results[0].value || { ticker: [] };
            var signals = (results[1].value || {}).signals || [];
            var funds = results[2].value || { funds: [] };
            var ipos = (results[3].value || {}).ipos || [];
            var news = results[4].value || { news: [] };
            var version = results[5].value;

            renderTicker(summary);
            renderSignals(signals);
            renderIpos(ipos);
            renderNews(news);
            renderFundsSection(funds);
            renderMarketsPage(signals, funds, summary);
            renderStockDetail(signals);
            initChart();
            initSearch(signals, funds, ipos);
            initPortfolio(signals, funds);
            if (version) renderVersionBadge(version);
        });
    });
})();
