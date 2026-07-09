/* quality.js — コンテンツ品質ダッシュボード（読み取り専用）。
 * lint ラチェットの baseline × GA4 人気度を join した /api/quality を表示する。
 * 状態は持たず、常に live データを描画する（SoT は baseline.json / content-rules.json）。 */
(function () {
  const { esc, fetchJson } = App;

  const GROUP_LABEL = {
    guide: "ガイド", textbook: "テキスト", keyword: "キーワード", pillar: "まとめ",
    primary: "過去問(一次)", secondary: "過去問(二次)", "past-exam": "過去問", other: "その他", "": "—",
  };
  const sevClass = (s) => (s === "HIGH" ? "high" : s === "LOW" ? "low" : "medium");

  // 違反バーンダウン（履歴 >=2 で折れ線、1 点なら現況カード）。
  function burndown(history) {
    if (!history.length) return "";
    // 同日重複は最後を採用
    const byDate = {};
    for (const h of history) byDate[h.date] = h;
    const pts = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    if (pts.length < 2) {
      const p = pts[0];
      return `<div class="cinfo">履歴 1 点（${esc(p.date)}）。<b>週次で <code>npm run quality-snapshot</code></b> を回すと違反バーンダウンが出ます。<br>` +
        `<small style="color:#888">現況: 違反 ${p.violations}（HIGH ${p.totals.HIGH} / MEDIUM ${p.totals.MEDIUM} / LOW ${p.totals.LOW}）</small></div>`;
    }
    const W = 720, H = 200, padL = 44, padB = 26, padT = 14;
    const max = Math.max(...pts.map((p) => p.violations)) * 1.1 || 1;
    const x = (i) => padL + (W - padL - 12) * (pts.length === 1 ? 0 : i / (pts.length - 1));
    const y = (v) => padT + (H - padT - padB) * (1 - v / max);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.violations).toFixed(1)}`).join(" ");
    const area = `M${x(0).toFixed(1)},${(H - padB).toFixed(1)} ` +
      pts.map((p, i) => `L${x(i).toFixed(1)},${y(p.violations).toFixed(1)}`).join(" ") +
      ` L${x(pts.length - 1).toFixed(1)},${(H - padB).toFixed(1)} Z`;
    const dots = pts.map((p, i) =>
      `<circle cx="${x(i).toFixed(1)}" cy="${y(p.violations).toFixed(1)}" r="3" fill="#16365c"></circle>` +
      `<text x="${x(i).toFixed(1)}" y="${(y(p.violations) - 7).toFixed(1)}" text-anchor="middle" font-size="10" fill="#555">${p.violations}</text>` +
      `<text x="${x(i).toFixed(1)}" y="${(H - padB + 14).toFixed(1)}" text-anchor="middle" font-size="9" fill="#999">${esc(p.date.slice(5))}</text>`
    ).join("");
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;background:#fff;border:1px solid #e5e5e5;border-radius:8px">` +
      `<path d="${area}" fill="#16365c" opacity="0.08"></path>` +
      `<path d="${line}" fill="none" stroke="#16365c" stroke-width="1.5"></path>${dots}</svg>`;
  }

  // ルーブリック採点カバレッジ census（資格 × group の採点済み/未採点/不合格/薄層）。
  // 真実源は .claude/state/quality/census.json（npm run quality-census で生成）。
  function censusSection(c) {
    if (!c || !c.present) {
      return `<div class="board-section"><h2>採点カバレッジ（census）</h2>` +
        `<div class="cinfo">未生成。<code>npm run quality-census</code> を実行すると資格 × group の採点率が出ます。</div></div>`;
    }
    const t = c.totals || {};
    const th = c.thresholds || {};
    const head = `<div class="cinfo">全 published <b>${t.total}</b> 件　/　採点済み <b>${t.scored}</b>（${t.coverage_pct}%）` +
      `　未採点 <b>${t.unscored}</b>　不合格 <b>${t.failed}</b>　薄層 <b>${t.thin}</b>` +
      `<br><small style="color:#888">薄層 = ${(th.thin_groups || []).join("/")} かつ 本文 ${th.thin_chars} 字未満（frontmatter 除外・空白除去）。` +
      `不合格 = weighted &lt; ${th.fail}。rewrite queue ${c.rewrite_queue_count} 件。生成 ${esc((c.generated_at || "").slice(0, 10))}</small></div>`;
    const rows = [];
    for (const [cat, node] of Object.entries(c.by_category || {})) {
      const ct = node.totals || {};
      rows.push(`<tr class="row" style="background:#fafafa"><td><b>${esc(cat)}</b></td><td>—</td>` +
        `<td style="text-align:right"><b>${ct.scored}/${ct.total}</b></td>` +
        `<td style="text-align:right">${ct.unscored || ""}</td>` +
        `<td style="text-align:right">${ct.failed || ""}</td>` +
        `<td style="text-align:right">${ct.thin || ""}</td><td></td></tr>`);
      for (const [g, a] of Object.entries(node.groups || {})) {
        const gap = a.unscored || a.failed || a.thin;
        rows.push(`<tr class="row"><td style="padding-left:20px;color:#666">${esc(GROUP_LABEL[g] || g)}</td>` +
          `<td style="text-align:right;color:#999">${a.avg_weighted != null ? a.avg_weighted : "—"}</td>` +
          `<td style="text-align:right">${a.scored}/${a.total}</td>` +
          `<td style="text-align:right">${a.unscored ? `<span class="badge medium">${a.unscored}</span>` : ""}</td>` +
          `<td style="text-align:right">${a.failed ? `<span class="badge high">${a.failed}</span>` : ""}</td>` +
          `<td style="text-align:right">${a.thin ? `<span class="badge low">${a.thin}</span>` : ""}</td>` +
          `<td>${gap ? "" : "<span style=\"color:#3a3\">✓</span>"}</td></tr>`);
      }
    }
    return `<div class="board-section"><h2>採点カバレッジ（census）</h2>${head}` +
      `<table class="summary"><thead><tr><th>資格 / 分類</th><th style="text-align:right">avg</th>` +
      `<th style="text-align:right">採点/総数</th><th style="text-align:right">未採点</th>` +
      `<th style="text-align:right">不合格</th><th style="text-align:right">薄層</th><th></th></tr></thead>` +
      `<tbody>${rows.join("")}</tbody></table></div>`;
  }

  App.register("quality", {
    async render(main, filterbar) {
      filterbar.innerHTML = "";
      const [data, census] = await Promise.all([
        fetchJson("/api/quality"),
        fetchJson("/api/quality-census").catch(() => null),
      ]);
      const { totals, articleCount, articles, byRule, byExam, history, window: win, generatedFrom } = data;

      // サマリカード
      const winStr = win ? `${win.start}〜${win.end}` : "";
      const cinfo =
        `<div class="cinfo">違反のある記事 <b>${articleCount}</b> 件　/　違反計 ` +
        `<span class="badge high">HIGH ${totals.HIGH}</span> ` +
        `<span class="badge medium">MEDIUM ${totals.MEDIUM}</span> ` +
        `<span class="badge low">LOW ${totals.LOW}</span><br>` +
        `<small style="color:#888">対象 = fullScan ルール（表/入れ子/段落/見出し/文体）の baseline。` +
        `優先度 = 違反数 × GA4 activeUsers（${esc(winStr)}）。更新は <code>npm run check-content-quality</code> → <code>update-content-quality-baseline</code></small></div>`;

      // ルール別集計
      const ruleRows = byRule.map((r) =>
        `<tr class="row"><td><span class="badge ${sevClass(r.severity)}">${esc(r.rule)}</span></td>` +
        `<td>${esc(r.severity)}</td><td style="text-align:right">${r.files}</td><td style="text-align:right">${r.total}</td></tr>`
      ).join("");
      const ruleTable = `<div class="board-section"><h2>ルール別（違反の内訳）</h2>` +
        `<table class="summary"><thead><tr><th>ルール</th><th>重大度</th><th style="text-align:right">記事数</th><th style="text-align:right">違反数</th></tr></thead>` +
        `<tbody>${ruleRows}</tbody></table></div>`;

      // フィルタ用の候補
      const exams = [...new Set(articles.map((a) => a.exam))].sort();
      const groups = [...new Set(articles.map((a) => a.group))].filter(Boolean).sort();
      const topRules = byRule.slice(0, 12).map((r) => r.rule);

      // 記事テーブル（優先度順）
      const rows = articles.map((a, i) => {
        const chips = Object.entries(a.counts).sort((x, y) => y[1] - x[1])
          .map(([rule, n]) => `<span class="badge ${sevClass(data.ruleSeverity[rule] || "MEDIUM")}" style="margin:1px">${esc(rule)}:${n}</span>`).join(" ");
        const pop = a.users ? `${a.users} / #${a.rank}` : "—";
        return `<tr class="row" data-exam="${esc(a.exam)}" data-group="${esc(a.group)}" data-rules="${esc(Object.keys(a.counts).join(" "))}">` +
          `<td style="text-align:right;color:#999">${i + 1}</td>` +
          `<td>${esc(a.title)}<br><a class="mono" href="https://doboku-note.com/docs/${esc(a.slug)}" target="_blank" rel="noopener" style="font-size:11px">/docs/${esc(a.slug)}</a></td>` +
          `<td><span class="badge gray">${esc(a.exam)}</span> ${esc(GROUP_LABEL[a.group] || a.group)}</td>` +
          `<td style="text-align:right">${pop}</td>` +
          `<td style="text-align:right"><b>${a.total}</b></td>` +
          `<td>${chips}</td></tr>`;
      }).join("");

      const filterBar =
        `<div class="cfilter"><b>資格</b>` +
        exams.map((e) => `<button class="chip" data-key="exam" data-val="${esc(e)}">${esc(e)}</button>`).join("") +
        `<span class="sep"></span><b>分類</b>` +
        groups.map((g) => `<button class="chip" data-key="group" data-val="${esc(g)}">${esc(GROUP_LABEL[g] || g)}</button>`).join("") +
        `<span class="sep"></span><b>ルール</b>` +
        topRules.map((r) => `<button class="chip" data-key="rule" data-val="${esc(r)}">${esc(r)}</button>`).join("") +
        `<span class="cfcount"></span></div>`;

      const artTable =
        `<div class="board-section"><h2>記事別（優先度＝違反数 × 人気）</h2>${filterBar}` +
        `<table class="summary listing"><thead><tr><th>#</th><th>記事</th><th>資格・分類</th><th style="text-align:right">人気(users/順位)</th><th style="text-align:right">違反</th><th>内訳</th></tr></thead>` +
        `<tbody>${rows}</tbody></table></div>`;

      main.innerHTML =
        `<div class="pub-wrap" style="max-width:900px">` +
        censusSection(census) +
        cinfo +
        `<div class="board-section"><h2>違反バーンダウン</h2>${burndown(history)}</div>` +
        ruleTable +
        artTable +
        `</div>`;

      // フィルタ配線（exam/group は完全一致、rule は data-rules に含むか）
      const bar = main.querySelector(".cfilter");
      const sel = {};
      bar.addEventListener("click", (e) => {
        const b = e.target.closest(".chip[data-key]");
        if (!b) return;
        const key = b.dataset.key;
        sel[key] = sel[key] === b.dataset.val ? "" : b.dataset.val;
        bar.querySelectorAll(`.chip[data-key="${key}"]`).forEach((x) =>
          x.classList.toggle("active", x.dataset.val === sel[key] && sel[key] !== ""));
        let shown = 0;
        main.querySelectorAll("table.listing tr.row").forEach((tr) => {
          const okExam = !sel.exam || tr.dataset.exam === sel.exam;
          const okGroup = !sel.group || tr.dataset.group === sel.group;
          const okRule = !sel.rule || (" " + tr.dataset.rules + " ").includes(" " + sel.rule + " ");
          const ok = okExam && okGroup && okRule;
          tr.style.display = ok ? "" : "none";
          if (ok) shown++;
        });
        const c = main.querySelector(".cfcount");
        if (c) c.textContent = `${shown} 件`;
      });
    },
  });
})();
