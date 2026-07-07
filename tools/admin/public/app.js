/* app.js — タブ SPA シェル。各タブの render 関数は tabs/*.js が App.tabs に登録する。 */
window.App = (function () {
  const tabs = {}; // name → { render(main, filterbar) }
  let current = "ogp";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  async function fetchJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return r.json();
  }

  function setTab(name) {
    current = name;
    document.querySelectorAll(".tab").forEach((b) =>
      b.classList.toggle("active", b.dataset.tab === name)
    );
    const main = document.getElementById("main");
    const filterbar = document.getElementById("filterbar");
    main.innerHTML = '<div class="loading">読み込み中…</div>';
    filterbar.innerHTML = "";
    const t = tabs[name];
    if (!t) {
      main.innerHTML = '<div class="loading">未実装のタブです</div>';
      return;
    }
    Promise.resolve(t.render(main, filterbar)).catch((err) => {
      main.innerHTML = `<div class="loading">エラー: ${esc(err.message)}</div>`;
    });
  }

  function register(name, def) {
    tabs[name] = def;
  }

  function init() {
    document.getElementById("tabs").addEventListener("click", (e) => {
      const btn = e.target.closest(".tab");
      if (btn) setTab(btn.dataset.tab);
    });
    setTab(current);
  }

  return { init, register, setTab, esc, fetchJson };
})();
