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

      filterbar.innerHTML =
        `<b>資格</b>` +
        `<button class="chip active" data-key="category" data-val="">全て <span class="n">${items.length}</span></button>` +
        cats.map((c) => chip(c, c, { key: "category" }, items.filter((i) => i.category === c).length)).join("") +
        `<span class="sep"></span><b>種別</b>` +
        `<button class="chip active" data-key="kind" data-val="">全種別</button>` +
        kinds.map(([k, l]) => chip(l, k, { key: "kind" })).join("") +
        `<span class="sep"></span><b>監査</b>` +
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
          return `<figure class="card ${esc(o.kind === "raster" ? "raster" : "svg")}" ` +
            `data-category="${esc(o.category)}" data-kind="${esc(o.kind)}" data-severity="${esc(sev)}">` +
            `<img loading="lazy" src="${esc(o.url)}" alt="${esc(o.slug)}">` +
            `<figcaption>${sevBadge}${esc(o.slug + "/" + o.name)}</figcaption></figure>`;
        }).join("") +
        "</div>";
      wireFilters(filterbar, main, ["category", "kind", "severity"]);
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
