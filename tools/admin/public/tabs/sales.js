/* sales.js — 売上ダッシュボード（P5・読み取り専用）。
 * .claude/state/sales/sales-log.json の月次集計 + インライン SVG 棒グラフ。 */
(function () {
  const { esc, fetchJson } = App;
  const yen = (n) => "¥" + Number(n).toLocaleString("en-US");

  function barChart(months, milestone) {
    if (!months.length) return "";
    const W = 720, H = 220, padL = 48, padB = 28, padT = 16;
    const max = Math.max(milestone, ...months.map((m) => m.revenue)) * 1.1;
    const bw = (W - padL - 12) / months.length;
    const y = (v) => padT + (H - padT - padB) * (1 - v / max);
    const bars = months.map((m, i) => {
      const x = padL + i * bw + bw * 0.15;
      const w = bw * 0.7;
      const top = y(m.revenue);
      const col = m.milestone ? "#1a7f37" : "#16365c";
      return `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${(H - padB - top).toFixed(1)}" fill="${col}" rx="2"></rect>` +
        `<text x="${(x + w / 2).toFixed(1)}" y="${(top - 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="#555">${(m.revenue / 1000).toFixed(0)}k</text>` +
        `<text x="${(x + w / 2).toFixed(1)}" y="${(H - padB + 14).toFixed(1)}" text-anchor="middle" font-size="10" fill="#888">${esc(m.month.slice(2))}</text>`;
    }).join("");
    const my = y(milestone);
    const mline = `<line x1="${padL}" y1="${my.toFixed(1)}" x2="${W - 12}" y2="${my.toFixed(1)}" stroke="#d33" stroke-dasharray="4 3" stroke-width="1"></line>` +
      `<text x="${padL + 2}" y="${(my - 3).toFixed(1)}" font-size="9" fill="#d33">¥15k マイルストーン</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;background:#fff;border:1px solid #e5e5e5;border-radius:8px">${mline}${bars}</svg>`;
  }

  App.register("sales", {
    async render(main, filterbar) {
      filterbar.innerHTML = "";
      const data = await fetchJson("/api/sales");
      const { months, total, source, updatedAt } = data;

      const monthCards = months.slice().reverse().map((m) => {
        const prods = m.products.map((p) =>
          `<tr class="row"><td>${esc(p.title)}</td><td style="text-align:right">${p.count}</td><td style="text-align:right">${yen(p.revenue)}</td></tr>`
        ).join("");
        return `<div class="board-section">` +
          `<h2>${esc(m.month)}　${yen(m.revenue)}　<small style="font-weight:400;color:#888">（${m.count}件）</small>` +
          `${m.milestone ? '　<span class="pill posted">¥15k 達成</span>' : ""}</h2>` +
          `<table class="summary"><thead><tr><th>商品</th><th style="text-align:right">件数</th><th style="text-align:right">売上</th></tr></thead>` +
          `<tbody>${prods}</tbody></table></div>`;
      }).join("");

      main.innerHTML =
        `<div class="pub-wrap" style="max-width:760px">` +
        `<div class="cinfo">累計 ${yen(total.revenue)}　/　${total.count} 件　/　${total.months} ヶ月<br>` +
        `<small style="color:#888">真実源: ${esc(source || "")}　最終更新: ${esc(updatedAt || "")}</small></div>` +
        `<div class="board-section"><h2>月次売上推移</h2>${barChart(months, data.milestone)}</div>` +
        monthCards +
        `</div>`;
    },
  });
})();
