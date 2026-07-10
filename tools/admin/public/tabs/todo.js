/* todo.js — docs/todo/*.md の read-only 統合ビュー（TODO タブ）。
 * 表示する値は全てリポジトリ内の md 本文。App.esc() でエスケープしてから
 * 太字/コード/リンクだけを許可タグとして注入する（escape-first・javascript: 遮断）。 */
(function () {
  const { esc, fetchJson } = App;

  const TIER_META = {
    high: { label: "🔴 高", badge: "high", dot: "#d33" },
    mid: { label: "🟡 中", badge: "medium", dot: "#e0a400" },
    low: { label: "🟢 低", badge: "low", dot: "#3a3" },
    hold: { label: "🟣 判断待ち", badge: "hold", dot: "#7d3fb5" },
    none: { label: "無印", badge: "gray", dot: "#8a8a8a" },
  };
  const TIER_ORDER = ["high", "mid", "low", "hold", "none"];

  // gallery.js と同型のチップ + フィルタ（IIFE 内 private のため per-tab コピー）
  function chip(label, value, attr, count) {
    const n = count != null ? ` <span class="n">${count}</span>` : "";
    const dot = attr && attr.dot ? `<span class="dot" style="background:${esc(attr.dot)}"></span>` : "";
    return `<button class="chip" data-key="${esc(attr.key)}" data-val="${esc(value)}">${dot}${esc(label)}${n}</button>`;
  }

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
      sel[btn.dataset.key] = btn.dataset.val;
      filterbar.querySelectorAll(`.chip[data-key="${btn.dataset.key}"]`).forEach((b) =>
        b.classList.toggle("active", b === btn)
      );
      apply();
    });
    filterbar.addEventListener("change", (e) => {
      const s = e.target.closest("select[data-key]");
      if (!s) return;
      sel[s.dataset.key] = s.value;
      apply();
    });
    apply();
  }

  // ── markdown-lite（escape-first）───────────────────────────
  function mdInline(raw) {
    let t = esc(raw);
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    t = t.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) =>
      /^https?:\/\//.test(url)
        ? `<a href="${url}" target="_blank" rel="noopener">${txt}</a>`
        : `${txt} <span class="tpath">${url}</span>`
    );
    return t;
  }

  function mdBlock(body) {
    if (!body) return "";
    return body
      .split("\n")
      .filter((l) => l.trim() !== "" && l.trim() !== "---")
      .map((l) => {
        if (/^\s*(?:[-*]|\d+\.)\s/.test(l)) {
          const indent = /^\s{2,}/.test(l) ? " sub" : "";
          return `<div class="tli${indent}">・${mdInline(l.replace(/^\s*(?:[-*]|\d+\.)\s/, ""))}</div>`;
        }
        if (/^#{3,6}\s/.test(l)) return `<div class="th4">${mdInline(l.replace(/^#+\s/, ""))}</div>`;
        if (/^\s*\|/.test(l)) return `<div class="ttbl">${mdInline(l)}</div>`;
        if (/^>\s?/.test(l)) return `<div class="tquote">${mdInline(l.replace(/^>\s?/, ""))}</div>`;
        return `<div class="tp">${mdInline(l)}</div>`;
      })
      .join("");
  }

  // ── TODO タブ ─────────────────────────────────────────────
  App.register("todo", {
    async render(main, filterbar) {
      const data = await fetchJson("/api/todo");
      const { items, files, counts } = data;

      if (!items.length) {
        main.innerHTML = '<div class="loading">docs/todo にタスクがありません</div>';
        return;
      }

      // tier 順 → ファイル定義順で安定ソート（backlog が先頭）
      const fileOrder = {};
      files.forEach((f, idx) => (fileOrder[f.id] = idx));
      const sorted = [...items].sort(
        (a, b) =>
          TIER_ORDER.indexOf(a.tier || "none") - TIER_ORDER.indexOf(b.tier || "none") ||
          (fileOrder[a.file] ?? 99) - (fileOrder[b.file] ?? 99) ||
          a.line - b.line
      );

      const cats = [...new Set(items.map((i) => i.category))].sort((a, b) => a.localeCompare(b, "ja"));
      const codexCount = items.filter((i) => i.codex).length;

      filterbar.innerHTML =
        chip("全て", "", { key: "tier" }) +
        TIER_ORDER.filter((t) => counts[t] > 0).map((t) =>
          chip(TIER_META[t].label, t, { key: "tier", dot: TIER_META[t].dot }, counts[t])
        ).join("") +
        `<span class="sep"></span>` +
        chip("全ファイル", "", { key: "file" }) +
        files.filter((f) => f.count > 0).map((f) => chip(f.label, f.id, { key: "file" }, f.count)).join("") +
        `<select class="fsel" data-key="category"><option value="">カテゴリ: 全て</option>` +
        cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("") +
        `</select>` +
        (codexCount ? chip("Codex候補のみ", "yes", { key: "codex" }, codexCount) : "") +
        `<button class="chip" id="todo-refresh">再走査</button>` +
        `<span class="count"></span>`;

      main.innerHTML =
        `<div class="grid">` +
        sorted.map((it) => {
          const tm = TIER_META[it.tier || "none"];
          const vscode = `vscode://file${esc(it.abs)}:${it.line}`;
          return (
            `<div class="card tcard" data-tier="${esc(it.tier || "none")}" data-file="${esc(it.file)}"` +
            ` data-category="${esc(it.category)}" data-codex="${it.codex ? "yes" : ""}">` +
            `<div class="thead">` +
            `<span class="badge ${tm.badge}">${esc(tm.label)}</span>` +
            `<span class="badge pub">${esc(it.category)}</span>` +
            (it.codex ? `<span class="badge ref">Codex候補</span>` : "") +
            `<span class="tfile">${esc(it.fileLabel)}</span>` +
            `</div>` +
            `<div class="ttitle">${esc(it.title)}</div>` +
            `<div class="tbody">${mdBlock(it.body)}</div>` +
            `<div class="tfoot"><a href="${vscode}">${esc(it.path)}:${it.line}</a><span class="tmore">クリックで展開</span></div>` +
            `</div>`
          );
        }).join("") +
        `</div>`;

      // 長文カードの折畳トグル（リンククリックは素通し）
      main.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        const card = e.target.closest(".tcard");
        if (card) card.classList.toggle("open");
      });

      document.getElementById("todo-refresh").addEventListener("click", async () => {
        await fetchJson("/api/todo?refresh=1");
        App.setTab("todo");
      });

      wireFilters(filterbar, main, ["tier", "file", "category", "codex"]);
    },
  });
})();
