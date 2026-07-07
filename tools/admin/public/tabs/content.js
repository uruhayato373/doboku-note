/* content.js — 記事/note/マガジン一覧（P4・読み取り専用）。
 * 表示値はリポジトリ内の slug/title/カテゴリ等。App.esc() でエスケープして挿入する。 */
(function () {
  const { esc, fetchJson } = App;

  const GROUP_LABEL = {
    guide: "ガイド", textbook: "テキスト", keyword: "キーワード", pillar: "まとめ",
    primary: "過去問(一次)", secondary: "過去問(二次)", "past-exam": "過去問", other: "その他",
  };

  function subnav(active) {
    const tabs = [["site", "サイト記事"], ["note", "note記事"], ["mag", "マガジン"]];
    return `<div class="pub-steps" style="margin-bottom:12px">` +
      tabs.map(([k, l]) => `<button class="chip sub ${k === active ? "active" : ""}" data-sub="${k}">${l}</button>`).join("") +
      `</div>`;
  }

  App.register("content", {
    async render(main, filterbar) {
      filterbar.innerHTML = "";
      let view = "site";

      async function draw() {
        main.innerHTML = subnav(view) + '<div class="loading">読み込み中…</div>';
        main.querySelector(".pub-steps").addEventListener("click", (e) => {
          const b = e.target.closest(".chip.sub");
          if (b) { view = b.dataset.sub; draw(); }
        });
        const body = document.createElement("div");
        try {
          if (view === "site") body.innerHTML = await renderSite();
          else if (view === "note") body.innerHTML = await renderNote();
          else body.innerHTML = await renderMag();
        } catch (err) {
          body.innerHTML = `<div class="loading">エラー: ${esc(err.message)}</div>`;
        }
        main.querySelector(".loading")?.replaceWith(body);
        wireFilter(main);
      }

      // クライアント側フィルタ（data-* 一致）
      function wireFilter(root) {
        const bar = root.querySelector(".cfilter");
        if (!bar) return;
        const sel = {};
        bar.addEventListener("click", (e) => {
          const b = e.target.closest(".chip[data-key]");
          if (!b) return;
          const key = b.dataset.key;
          sel[key] = sel[key] === b.dataset.val ? "" : b.dataset.val;
          bar.querySelectorAll(`.chip[data-key="${key}"]`).forEach((x) =>
            x.classList.toggle("active", x.dataset.val === sel[key] && sel[key] !== ""));
          let shown = 0;
          root.querySelectorAll("tr.row").forEach((tr) => {
            const ok = Object.keys(sel).every((k) => !sel[k] || tr.dataset[k] === sel[k]);
            tr.style.display = ok ? "" : "none";
            if (ok) shown++;
          });
          const c = root.querySelector(".cfcount");
          if (c) c.textContent = `${shown} 件`;
        });
      }

      await draw();
    },
  });

  async function renderSite() {
    const { summary, docs } = await fetchJson("/api/content/articles");
    const cats = [...new Set(docs.map((d) => d.category))].sort();
    const groups = [...new Set(docs.map((d) => d.group))];
    const rows = docs.map((d) =>
      `<tr class="row" data-category="${esc(d.category)}" data-group="${esc(d.group)}" data-pub="${d.published ? "y" : "n"}">` +
      `<td><span class="badge gray">${esc(GROUP_LABEL[d.group] || d.group)}</span></td>` +
      `<td>${esc(d.title)}</td>` +
      `<td class="mono">${esc(d.slug)}</td>` +
      `<td>${d.published ? '<span class="pill posted">公開</span>' : '<span class="pill draft">非公開</span>'}</td>` +
      `<td>${esc(d.publishedAt || "")}</td></tr>`
    ).join("");
    return `<div class="cinfo">全 ${summary.total} 記事（公開 ${summary.published} / 非公開 ${summary.unpublished}）</div>` +
      `<div class="cfilter">` +
      `<b>資格</b>` + cats.map((c) => `<button class="chip" data-key="category" data-val="${esc(c)}">${esc(c)}</button>`).join("") +
      `<span class="sep"></span><b>分類</b>` + groups.map((g) => `<button class="chip" data-key="group" data-val="${esc(g)}">${esc(GROUP_LABEL[g] || g)}</button>`).join("") +
      `<span class="sep"></span><button class="chip" data-key="pub" data-val="n">非公開のみ</button>` +
      `<span class="cfcount"></span></div>` +
      `<table class="summary listing"><thead><tr><th>分類</th><th>タイトル</th><th>slug</th><th>状態</th><th>公開日</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  async function renderNote() {
    const items = await fetchJson("/api/content/note");
    const exams = [...new Set(items.map((i) => i.exam))].sort();
    const pub = items.filter((i) => i.published).length;
    const rows = items.map((i) =>
      `<tr class="row" data-exam="${esc(i.exam)}" data-pricing="${esc(i.pricing)}" data-pub="${i.published ? "y" : "n"}">` +
      `<td>${esc(i.title)}</td>` +
      `<td class="mono">${esc(i.dir)}</td>` +
      `<td>${i.pricing === "paid" ? '<span class="pill scheduled">有料</span>' : i.pricing === "free" ? '<span class="pill posted">無料</span>' : '<span class="pill draft">?</span>'}</td>` +
      `<td>${i.published ? `<a href="${esc(i.noteUrl)}" target="_blank" rel="noopener">公開</a>` : '<span class="pill draft">未</span>'}</td></tr>`
    ).join("");
    return `<div class="cinfo">note 原稿 ${items.length} 本（noteUrl あり = 公開済み ${pub}）</div>` +
      `<div class="cfilter"><b>資格</b>` + exams.map((e) => `<button class="chip" data-key="exam" data-val="${esc(e)}">${esc(e)}</button>`).join("") +
      `<span class="sep"></span><button class="chip" data-key="pricing" data-val="paid">有料</button>` +
      `<button class="chip" data-key="pub" data-val="n">未公開のみ</button>` +
      `<span class="cfcount"></span></div>` +
      `<table class="summary listing"><thead><tr><th>タイトル</th><th>ディレクトリ</th><th>価格</th><th>公開</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  async function renderMag() {
    const mags = await fetchJson("/api/content/magazines");
    const pub = mags.filter((m) => m.published).length;
    const rows = mags.map((m) =>
      `<tr class="row" data-pub="${m.published ? "y" : "n"}">` +
      `<td>${esc(m.title || m.id)}</td>` +
      `<td class="mono">${esc(m.id)}</td>` +
      `<td>${esc(m.priceStr || "")}</td>` +
      `<td>${m.published ? `<a href="${esc(m.noteUrl)}" target="_blank" rel="noopener">公開</a>` : '<span class="pill draft">未公開</span>'}</td>` +
      `<td>${esc(m.badge || "")}</td></tr>`
    ).join("");
    return `<div class="cinfo">マガジン ${mags.length} 件（公開 ${pub} / 未公開 ${mags.length - pub}）— SoT: src/lib/note-magazines.ts</div>` +
      `<div class="cfilter"><button class="chip" data-key="pub" data-val="n">未公開のみ</button><span class="cfcount"></span></div>` +
      `<table class="summary listing"><thead><tr><th>タイトル</th><th>id</th><th>価格</th><th>公開</th><th>バッジ</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
})();
