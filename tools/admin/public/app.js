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

  // POST /api/job/run を叩き、SSE 行を onLine(obj) でストリーム。完了時に resolve。
  // EventSource は POST 不可なので fetch + ReadableStream で SSE を手動パースする。
  async function runJob(action, mode, params, onLine) {
    const r = await fetch("/api/job/run", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin": "1" },
      body: JSON.stringify({ action, mode, params }),
    });
    if (!r.ok) {
      let msg = `${r.status}`;
      try { msg = (await r.json()).error || msg; } catch { /* noop */ }
      throw new Error(msg);
    }
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const line = chunk.replace(/^data: /, "");
        if (line) { try { onLine(JSON.parse(line)); } catch { /* skip */ } }
      }
    }
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

  return { init, register, setTab, esc, fetchJson, runJob };
})();
