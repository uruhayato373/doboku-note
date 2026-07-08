/* gallery.js — 画像ギャラリー系タブ（OGP / 記事図版 / note画像）。
 * 表示する値はすべてリポジトリ内のファイルパス・slug。App.esc() でエスケープして挿入する。 */
(function () {
  const { esc, fetchJson } = App;

  // ── 共通: フィルタチップ生成 + 適用 ────────────────────────
  function chip(label, value, attr, count) {
    const n = count != null ? ` <span class="n">${count}</span>` : "";
    const dot = attr && attr.dot ? `<span class="dot" style="background:${esc(attr.dot)}"></span>` : "";
    return `<button class="chip" data-key="${esc(attr.key)}" data-val="${esc(value)}">${dot}${esc(label)}${n}</button>`;
  }

  // state: { cat: '', group: '' } のような選択。data-* とマッチした .card のみ表示。
  function wireFilters(filterbar, main, keys) {
    const sel = {};
    keys.forEach((k) => (sel[k] = ""));
    function apply() {
      let shown = 0;
      main.querySelectorAll(".card").forEach((el) => {
        const ok = keys.every((k) => !sel[k] || el.dataset[k] === sel[k]);
        el.style.display = ok ? "" : "none";
        if (ok) shown++;
      });
      const c = filterbar.querySelector(".count");
      if (c) c.textContent = `${shown} 件表示`;
    }
    filterbar.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      const key = btn.dataset.key;
      sel[key] = btn.dataset.val;
      filterbar.querySelectorAll(`.chip[data-key="${key}"]`).forEach((b) =>
        b.classList.toggle("active", b === btn)
      );
      // 資格切替時、その資格に無い分類チップを隠す（OGP タブ用）
      if (typeof filterbar._onFilter === "function") filterbar._onFilter(key, sel);
      apply();
    });
    // セレクトボックス（data-key）も chip と同じ sel に参加させる
    filterbar.addEventListener("change", (e) => {
      const s = e.target.closest("select[data-key]");
      if (!s) return;
      sel[s.dataset.key] = s.value;
      apply();
    });
    filterbar._apply = apply;
    apply();
  }

  // ── OGP タブ ──────────────────────────────────────────────
  App.register("ogp", {
    async render(main, filterbar) {
      const data = await fetchJson("/api/gallery/ogp");
      const { items, catLabel, catOrder, groupLabel } = data;
      const catCount = {};
      items.forEach((i) => (catCount[i.category] = (catCount[i.category] || 0) + 1));
      const cats = [...new Set(items.map((i) => i.category))].sort(
        (a, b) => (catOrder[a] ?? 999) - (catOrder[b] ?? 999) || a.localeCompare(b)
      );
      const groupsByCat = {};
      items.forEach((i) => ((groupsByCat[i.category] ??= new Set()).add(i.group)));
      const allGroups = [...new Set(items.map((i) => i.group))];

      filterbar.innerHTML =
        `<b>資格</b>` +
        `<button class="chip active" data-key="category" data-val="">全て <span class="n">${items.length}</span></button>` +
        cats.map((c) => chip(catLabel[c] || c, c, { key: "category" }, catCount[c])).join("") +
        `<span class="sep"></span><b>分類</b>` +
        `<button class="chip active" data-key="group" data-val="">全分類</button>` +
        allGroups.map((g) => chip(groupLabel[g] || g, g, { key: "group" })).join("") +
        `<span class="count"></span>`;

      main.innerHTML =
        '<div class="grid">' +
        items.map((o) =>
          `<figure class="card" data-category="${esc(o.category)}" data-group="${esc(o.group)}">` +
          `<img loading="lazy" src="${esc(o.url)}" alt="${esc(o.slugDir)}">` +
          `<figcaption>${esc(o.slugDir)}</figcaption></figure>`
        ).join("") +
        "</div>";

      // 資格に無い分類チップを隠す
      filterbar._onFilter = (key, sel) => {
        if (key !== "category") return;
        const allow = sel.category ? groupsByCat[sel.category] : null;
        filterbar.querySelectorAll('.chip[data-key="group"]').forEach((b) => {
          const g = b.dataset.val;
          const ok = !g || !allow || allow.has(g);
          b.hidden = !ok;
          if (!ok && b.classList.contains("active")) {
            b.classList.remove("active");
            filterbar.querySelector('.chip[data-key="group"][data-val=""]').classList.add("active");
            sel.group = "";
          }
        });
      };
      wireFilters(filterbar, main, ["category", "group"]);
    },
  });

  // ── 記事図版タブ（svg / raster / exam-svg + severity）──────
  App.register("figures", {
    async render(main, filterbar) {
      const { items } = await fetchJson("/api/gallery/figures");
      const cats = [...new Set(items.map((i) => i.category))].sort();
      const kinds = [
        ["svg", "コンテンツSVG"],
        ["exam-svg", "試験原図SVG"],
        ["raster", "PNG/WebPクロップ"],
      ].filter(([k]) => items.some((i) => i.kind === k));
      const refCount = items.filter((i) => i.referenced).length;
      const orphanCount = items.length - refCount;
      // 図テキスト品質（ラスタのみ）と公開状態の集計
      const TQ = { leak: "答え漏らし", prose: "写り込み", maybe: "要確認", clean: "クリーン", unaudited: "未監査" };
      const tqCount = {};
      const pubOf = (o) => (!o.articleFound ? "none" : o.published ? "published" : "draft");
      const pubN = { published: 0, draft: 0, none: 0 };
      items.forEach((i) => {
        if (i.kind === "raster") tqCount[i.textStatus || "unaudited"] = (tqCount[i.textStatus || "unaudited"] || 0) + 1;
        pubN[pubOf(i)]++;
      });

      filterbar.innerHTML =
        `<b>資格</b>` +
        `<button class="chip active" data-key="category" data-val="">全て <span class="n">${items.length}</span></button>` +
        cats.map((c) => chip(c, c, { key: "category" }, items.filter((i) => i.category === c).length)).join("") +
        `<span class="sep"></span><b>種別</b>` +
        `<button class="chip active" data-key="kind" data-val="">全種別</button>` +
        kinds.map(([k, l]) => chip(l, k, { key: "kind" })).join("") +
        `<span class="sep"></span><b>品質</b>` +
        `<select class="fsel" data-key="textq">` +
        `<option value="">全て</option>` +
        ["leak", "prose", "maybe", "clean", "unaudited"].map((s) =>
          `<option value="${s}">${TQ[s]} (${tqCount[s] || 0})</option>`
        ).join("") +
        `</select>` +
        `<span class="sep"></span><b>公開</b>` +
        `<select class="fsel" data-key="pub">` +
        `<option value="">全て</option>` +
        `<option value="published">公開のみ (${pubN.published})</option>` +
        `<option value="draft">下書きのみ (${pubN.draft})</option>` +
        (pubN.none ? `<option value="none">記事なし (${pubN.none})</option>` : "") +
        `</select>` +
        `<span class="sep"></span><b>掲載</b>` +
        `<select class="fsel" data-key="placement">` +
        `<option value="">全て</option>` +
        `<option value="referenced">掲載のみ (${refCount})</option>` +
        `<option value="orphan">孤児のみ (${orphanCount})</option>` +
        `</select>` +
        `<span class="sep"></span><b>監査(SVG)</b>` +
        `<button class="chip active" data-key="severity" data-val="">全</button>` +
        ["high", "medium", "low", "clean"].map((s) => chip(s.toUpperCase(), s, { key: "severity" })).join("") +
        `<span class="count"></span>`;

      main.innerHTML =
        '<div class="grid dense">' +
        items.map((o) => {
          const sev = o.severity || "clean";
          const sevBadge = o.kind === "svg"
            ? `<span class="badge ${esc(sev)}">${esc(sev)}</span>`
            : "";
          const tq = o.kind === "raster" ? (o.textStatus || "unaudited") : "na";
          const tqBadge = ["leak", "prose", "maybe"].includes(tq)
            ? `<span class="badge tq-${esc(tq)}" title="図内に文章テキスト（答え/本文）の写り込みを検出">${esc(TQ[tq])}</span>`
            : "";
          const placement = o.referenced ? "referenced" : "orphan";
          const placeBadge = o.referenced
            ? `<span class="badge ref" title="記事本文に掲載されています">掲載</span>`
            : `<span class="badge orphan" title="記事本文から参照されていない孤児画像">孤児</span>`;
          const pub = pubOf(o);
          const pubBadge = pub === "none"
            ? `<span class="badge draft" title="記事MDXが見つかりません">記事なし</span>`
            : pub === "published"
            ? `<span class="badge pub">公開</span>`
            : `<span class="badge draft">下書き</span>`;
          // 下書き(published:false)は getDoc が null を返し本番/ローカルとも 404 になるため
          // 記事リンクは公開記事のみ表示。下書き/記事なしは MDX(編集)リンクのみ。
          const links =
            (o.published
              ? `<a href="${esc(o.articleUrl)}" target="_blank" rel="noopener" title="本番記事を開く">記事↗</a>` +
                `<a href="${esc(o.localUrl)}" target="_blank" rel="noopener" title="ローカルdev(npm run dev / :3020)で開く">ローカル</a>`
              : "") +
            (o.mdxAbs ? `<a href="vscode://file${esc(o.mdxAbs)}" title="MDXをVS Codeで開く">MDX</a>` : "");
          return `<figure class="card ${esc(o.kind === "raster" ? "raster" : "svg")}" ` +
            `data-category="${esc(o.category)}" data-kind="${esc(o.kind)}" data-severity="${esc(sev)}" ` +
            `data-placement="${placement}" data-textq="${esc(tq)}" data-pub="${esc(pub)}">` +
            `<img loading="lazy" src="${esc(o.url)}" alt="${esc(o.slug)}">` +
            `<figcaption><div class="figname">${sevBadge}${tqBadge}${esc(o.slug + "/" + o.name)}</div>` +
            `<div class="figmeta">${placeBadge}${pubBadge}${links}</div></figcaption></figure>`;
        }).join("") +
        "</div>";
      wireFilters(filterbar, main, ["category", "kind", "severity", "placement", "textq", "pub"]);
    },
  });

  // ── note画像タブ（cover / figure + 試験 + 種別）─────────────
  App.register("note", {
    async render(main, filterbar) {
      const { items, examMeta, examOrder } = await fetchJson("/api/gallery/note");
      const examCount = {};
      items.forEach((i) => (examCount[i.exam] = (examCount[i.exam] || 0) + 1));
      const exams = examOrder.filter((k) => examCount[k]);
      const kinds = [
        ["cover", "カバー"],
        ["figure", "図版"],
        ["paid", "有料"],
        ["free", "無料"],
        ["magazine", "マガジン収録"],
      ];

      filterbar.innerHTML =
        `<b>資格</b>` +
        `<button class="chip active" data-key="exam" data-val="">全て <span class="n">${items.length}</span></button>` +
        exams.map((k) =>
          chip(examMeta[k]?.label || k, k, { key: "exam", dot: examMeta[k]?.base }, examCount[k])
        ).join("") +
        `<span class="sep"></span><b>種別</b>` +
        `<button class="chip active" data-key="kindfilter" data-val="">全種別</button>` +
        kinds.filter(([k]) =>
          items.some((i) => i.kind === k || i.pricing === k || (k === "magazine" && i.inMagazine))
        ).map(([k, l]) => chip(l, k, { key: "kindfilter" })).join("") +
        `<span class="count"></span>`;

      main.innerHTML =
        '<div class="grid">' +
        items.map((o) => {
          const kinds = [o.kind];
          if (o.pricing === "paid") kinds.push("paid");
          if (o.pricing === "free") kinds.push("free");
          if (o.inMagazine) kinds.push("magazine");
          const meta = examMeta[o.exam] || {};
          return `<figure class="card" data-exam="${esc(o.exam)}" data-kindfilter="${esc(kinds.join(" "))}">` +
            `<img loading="lazy" src="${esc(o.url)}" alt="${esc(o.rel)}">` +
            `<figcaption><span class="badge" style="background:${esc(meta.base || "#888")}">` +
            `${esc(meta.short || o.exam)}</span>${esc(o.dir + "/" + o.name)}</figcaption></figure>`;
        }).join("") +
        "</div>";

      // 種別は space 区切り複数値 → カスタム apply
      const sel = { exam: "", kindfilter: "" };
      function apply() {
        let shown = 0;
        main.querySelectorAll(".card").forEach((el) => {
          const okE = !sel.exam || el.dataset.exam === sel.exam;
          const okK = !sel.kindfilter || el.dataset.kindfilter.split(" ").includes(sel.kindfilter);
          el.style.display = okE && okK ? "" : "none";
          if (okE && okK) shown++;
        });
        filterbar.querySelector(".count").textContent = `${shown} 件表示`;
      }
      filterbar.addEventListener("click", (e) => {
        const btn = e.target.closest(".chip");
        if (!btn) return;
        const key = btn.dataset.key;
        sel[key] = btn.dataset.val;
        filterbar.querySelectorAll(`.chip[data-key="${key}"]`).forEach((b) =>
          b.classList.toggle("active", b === btn)
        );
        apply();
      });
      apply();
    },
  });
})();
