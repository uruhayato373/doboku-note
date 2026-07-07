/* sns.js — SNSパックタブ（画像/動画目視 + posted バッジ）と SNS状態板タブ（読み取り専用）。
 * 表示値はすべてリポジトリ内のパス・slug・日付。App.esc() でエスケープして挿入する。 */
(function () {
  const { esc, fetchJson } = App;

  function fmtPill(fmt, entry) {
    if (!entry) return `<span class="pill empty">${esc(fmt)} 未</span>`;
    const at = entry.at ? ` ${esc(entry.at)}` : "";
    return `<span class="pill posted">${esc(fmt)}${at}</span>`;
  }

  function thumb(m) {
    if (m.video) {
      // ローカルに mp4 があれば再生、無ければ R2 退避バッジ
      return `<video controls preload="metadata" src="${esc(m.url)}" ` +
        `onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'badge offloaded',textContent:'R2退避 mp4'}))"></video>`;
    }
    return `<img loading="lazy" src="${esc(m.url)}" alt="${esc(m.name)}">`;
  }

  // ── SNSパックタブ ─────────────────────────────────────────
  App.register("sns", {
    async render(main, filterbar) {
      const { igPacks, xDrafts } = await fetchJson("/api/gallery/sns");
      const exams = [...new Set(igPacks.map((p) => p.exam))].sort();

      filterbar.innerHTML =
        `<b>チャネル</b>` +
        `<button class="chip active" data-key="channel" data-val="">全て</button>` +
        `<button class="chip" data-key="channel" data-val="instagram">Instagram <span class="n">${igPacks.length}</span></button>` +
        `<button class="chip" data-key="channel" data-val="x">X <span class="n">${xDrafts.length}</span></button>` +
        `<span class="sep"></span><b>IG資格</b>` +
        `<button class="chip active" data-key="exam" data-val="">全</button>` +
        exams.map((e) =>
          `<button class="chip" data-key="exam" data-val="${esc(e)}">${esc(e)} ` +
          `<span class="n">${igPacks.filter((p) => p.exam === e).length}</span></button>`
        ).join("") +
        `<span class="sep"></span>` +
        `<button class="chip" data-key="posted" data-val="pending">未投稿のみ</button>` +
        `<span class="count"></span>`;

      const igCards = igPacks.map((p) => {
        const allMedia = [...(p.media.carousel || []), ...(p.media.reels || []), ...(p.media.stories || [])];
        const thumbs = allMedia.slice(0, 12).map(thumb).join("");
        const reelBadge = p.media.reelsOffloaded ? `<span class="badge offloaded">reels R2退避</span>` : "";
        const anyPosted = p.posted && ["carousel", "reels", "stories"].some((f) => p.posted[f]);
        return `<div class="pack" data-channel="instagram" data-exam="${esc(p.exam)}" data-posted="${anyPosted ? "done" : "pending"}">` +
          `<h3>${esc(p.slug)}</h3>` +
          `<div class="status-row">${reelBadge}` +
          ["carousel", "reels", "stories"].map((f) => fmtPill(f, p.posted && p.posted[f])).join("") +
          `</div>` +
          (thumbs ? `<div class="thumbs">${thumbs}</div>` : `<div style="font-size:11px;color:#bbb">画像なし</div>`) +
          `</div>`;
      });

      const xCards = xDrafts.map((d) => {
        const imgs = (d.images || []).slice(0, 12)
          .map((i) => `<img loading="lazy" src="${esc(i.url)}" alt="${esc(i.name)}">`).join("");
        const c = d.counts;
        return `<div class="pack" data-channel="x" data-exam="" data-posted="${c.posted > 0 ? "done" : "pending"}">` +
          `<h3>${esc(d.name)}</h3>` +
          `<div class="status-row">` +
          `<span class="pill posted">投稿 ${c.posted}</span>` +
          `<span class="pill scheduled">予約 ${c.scheduled}</span>` +
          `<span class="pill draft">下書 ${c.draft}</span>` +
          `<span style="font-size:11px;color:#999">/ ${d.total}件</span></div>` +
          (imgs ? `<div class="thumbs">${imgs}</div>` : "") +
          `</div>`;
      });

      main.innerHTML = `<div class="grid">${igCards.join("") + xCards.join("")}</div>`;

      const sel = { channel: "", exam: "", posted: "" };
      function apply() {
        let shown = 0;
        main.querySelectorAll(".pack").forEach((el) => {
          const okC = !sel.channel || el.dataset.channel === sel.channel;
          const okE = !sel.exam || el.dataset.exam === sel.exam;
          const okP = !sel.posted || el.dataset.posted === sel.posted;
          el.style.display = okC && okE && okP ? "" : "none";
          if (okC && okE && okP) shown++;
        });
        filterbar.querySelector(".count").textContent = `${shown} パック表示`;
      }
      filterbar.addEventListener("click", (e) => {
        const btn = e.target.closest(".chip");
        if (!btn) return;
        const key = btn.dataset.key;
        // posted は toggle（同値クリックで解除）
        if (key === "posted") {
          sel.posted = sel.posted === btn.dataset.val ? "" : btn.dataset.val;
          btn.classList.toggle("active", sel.posted === btn.dataset.val);
        } else {
          sel[key] = btn.dataset.val;
          filterbar.querySelectorAll(`.chip[data-key="${key}"]`).forEach((b) =>
            b.classList.toggle("active", b === btn)
          );
        }
        apply();
      });
      apply();
    },
  });

  // ── SNS状態板タブ（読み取り専用）───────────────────────────
  App.register("board", {
    async render(main, filterbar) {
      const { ig, x, schedule } = await fetchJson("/api/sns/board");
      filterbar.innerHTML = "";

      // IG 試験別サマリ（ig-status summary と同義）
      const igRows = Object.entries(ig.byExam).map(([exam, s]) => {
        const pct = s.total > 0 ? Math.round((s.done / s.total) * 20) : 0;
        const bar = "█".repeat(pct) + "░".repeat(20 - pct);
        return `<tr><td>${esc(exam)}</td><td>${s.done} / ${s.total}</td>` +
          `<td><span class="bar">${bar}</span></td>` +
          `<td>${s.carousel} / ${s.reels} / ${s.stories}</td></tr>`;
      }).join("");

      // 直近の予約/投稿予定（schedule から未来日を近い順に）
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = [];
      for (const s of schedule) {
        for (const [k, label] of [["ig_carousel_date", "IG carousel"], ["ig_reels_date", "IG reels"], ["yt_post_date", "YouTube"]]) {
          if (s[k] && s[k] >= today) upcoming.push({ date: s[k], label, slug: s.slug });
        }
      }
      upcoming.sort((a, b) => a.date.localeCompare(b.date));
      const upRows = upcoming.slice(0, 40).map((u) =>
        `<tr><td>${esc(u.date)}</td><td>${esc(u.label)}</td><td>${esc(u.slug)}</td></tr>`
      ).join("");

      // X ドラフトの予約/投稿状況
      const xRows = x.drafts.map((d) =>
        `<tr><td>${esc(d.name)}</td><td>${d.counts.posted} / ${d.counts.scheduled} / ${d.counts.draft}</td>` +
        `<td>${d.total}</td><td>${esc(d.updatedAt ? d.updatedAt.slice(0, 10) : "")}</td></tr>`
      ).join("");

      main.innerHTML =
        `<div class="board-section"><h2>Instagram 進捗（いずれか投稿済み: ${ig.totalDone} / ${ig.total}）</h2>` +
        `<table class="summary"><thead><tr><th>資格</th><th>DONE / 合計</th><th>進捗</th><th>C / R / S</th></tr></thead>` +
        `<tbody>${igRows}</tbody></table></div>` +

        `<div class="board-section"><h2>X ドラフト（投稿 / 予約 / 下書き）</h2>` +
        `<table class="summary"><thead><tr><th>ドラフト</th><th>投稿/予約/下書</th><th>tweet数</th><th>更新</th></tr></thead>` +
        `<tbody>${xRows}</tbody></table>` +
        `<p style="font-size:12px;color:#888">合計 tweet: ${x.totals.tweets}　投稿 ${x.totals.posted} / 予約 ${x.totals.scheduled} / 下書 ${x.totals.draft}</p></div>` +

        `<div class="board-section"><h2>直近の予定（schedule.json・今日以降 ${upcoming.length} 件中 40 件）</h2>` +
        `<table class="summary"><thead><tr><th>日付</th><th>チャネル</th><th>slug</th></tr></thead>` +
        `<tbody>${upRows}</tbody></table></div>`;
    },
  });
})();
