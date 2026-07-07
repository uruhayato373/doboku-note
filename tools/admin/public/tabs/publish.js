/* publish.js — 投稿/予約アクション（P3）。
 * 設計: UI は引数を組み立てて既存 CLI を叩くだけ。ガード（--commit ゲート・dobokunote
 * assert・x-schedule-guard の BLOCK）は CLI 側にある。本番ボタンは dry-run/guard 成功まで
 * disabled + 対象名タイプ確認。ジョブは同時 1 本（サーバが強制）。 */
(function () {
  const { esc, fetchJson, runJob } = App;

  let logEl = null;
  let busy = false;

  function log(obj) {
    if (!logEl) return;
    let cls = "log-out", text = "";
    if (obj.t === "start") { cls = "log-cmd"; text = `$ ${obj.cmd}`; }
    else if (obj.t === "end") { cls = obj.code === 0 ? "log-ok" : "log-ng"; text = `— 終了コード ${obj.code} —`; }
    else if (obj.t === "err") { cls = "log-ng"; text = obj.line; }
    else { text = obj.line; }
    const div = document.createElement("div");
    div.className = cls;
    div.textContent = text;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function clearLog() { if (logEl) logEl.innerHTML = ""; }

  // ジョブ実行。code===0 を解決値に返す。busy 中は例外。
  async function run(action, mode, params) {
    if (busy) throw new Error("実行中です");
    busy = true;
    setBusy(true);
    let code = null;
    try {
      await runJob(action, mode, params, (obj) => {
        log(obj);
        if (obj.t === "end") code = obj.code;
      });
    } finally {
      busy = false;
      setBusy(false);
    }
    return code === 0;
  }

  function setBusy(on) {
    document.querySelectorAll(".pub-btn").forEach((b) => {
      if (b.dataset.keepEnabled === "1") return;
      b.disabled = on || b.dataset.gated === "1";
    });
  }

  // 本番ボタンの解錠: gated 解除 + タイプ確認
  function unlock(btn) { btn.dataset.gated = "0"; btn.disabled = false; btn.classList.add("armed"); }

  function confirmType(target) {
    const typed = prompt(`本番実行します。確認のため対象名を入力してください:\n${target}`);
    return typed === target;
  }

  App.register("publish", {
    async render(main, filterbar) {
      filterbar.innerHTML = "";
      const { igPacks, xDrafts } = await fetchJson("/api/gallery/sns");

      const xOptions = xDrafts.map((d) => `<option value="${esc(d.name)}">${esc(d.name)} (投稿${d.counts.posted}/予約${d.counts.scheduled}/下書${d.counts.draft})</option>`).join("");
      const igOptions = igPacks.map((p) => `<option value="${esc(p.rel.replace(/^instagram\//, ""))}">${esc(p.exam)} / ${esc(p.slug)}</option>`).join("");

      main.innerHTML = `
<div class="pub-wrap">
  <div class="pub-note">投稿系はローカルの Playwright ログインプロファイルを使います。<b>本番ボタンは dry-run / ガードが成功するまで押せません</b>。ジョブは同時 1 本。</div>

  <section class="pub-card">
    <h3>X（4ステップ固定パイプライン）</h3>
    <div class="pub-row">
      <label>ドラフト <select id="x-draft">${xOptions}</select></label>
      <label>tweet番号(任意) <input id="x-tweet" type="number" min="1" max="50" style="width:64px"></label>
    </div>
    <div class="pub-row">
      <label>予約日時(任意・複数可 空白区切り) <input id="x-dates" placeholder="2026-07-10T08:00 2026-07-11T08:00" style="width:320px"></label>
    </div>
    <div class="pub-steps">
      <button class="pub-btn" data-keep-enabled="1" id="x-guard">① ガード</button>
      <button class="pub-btn" data-keep-enabled="1" id="x-dry">② dry-run</button>
      <button class="pub-btn armed-off" data-gated="1" id="x-commit" disabled>③ 本番投稿</button>
      <button class="pub-btn" data-keep-enabled="1" id="x-sync">④ 昇格検証</button>
    </div>
    <div class="pub-hint" id="x-hint">① ガード → ② dry-run の両方が成功すると ③ が解錠されます。</div>
  </section>

  <section class="pub-card">
    <h3>Instagram カルーセル（予約投稿）</h3>
    <div class="pub-row">
      <label>パック <select id="ig-pack" style="min-width:320px">${igOptions}</select></label>
      <label>予約日時 <input id="ig-date" placeholder="2026-07-10T07:00" style="width:180px"></label>
    </div>
    <div class="pub-steps">
      <button class="pub-btn" data-keep-enabled="1" id="ig-dry">dry-run</button>
      <button class="pub-btn armed-off" data-gated="1" id="ig-commit" disabled>本番予約</button>
      <span class="pub-sep"></span>
      <button class="pub-btn" data-keep-enabled="1" id="ig-mark">投稿済みを記録(carousel)</button>
    </div>
    <div class="pub-hint" id="ig-hint">dry-run 成功で本番予約が解錠されます。</div>
  </section>

  <section class="pub-card">
    <h3>note 記事（下書き→公開）</h3>
    <div class="pub-row">
      <label>article.md パス <input id="note-article" placeholder="docs/note/技術士総監/.../article.md" style="width:420px"></label>
    </div>
    <div class="pub-row">
      <label>予約日時(任意) <input id="note-date" placeholder="2026-07-10T07:00" style="width:180px"></label>
    </div>
    <div class="pub-steps">
      <button class="pub-btn" data-keep-enabled="1" id="note-draft">下書き作成(安全)</button>
      <button class="pub-btn armed-off" data-gated="1" id="note-commit" disabled>公開/予約</button>
    </div>
    <div class="pub-hint" id="note-hint">下書き作成が成功すると公開が解錠されます（note-publish の --commit ゲート）。</div>
  </section>

  <section class="pub-card">
    <h3>実行ログ</h3>
    <div class="pub-log" id="pub-log"></div>
  </section>
</div>`;

      logEl = main.querySelector("#pub-log");
      const $ = (id) => main.querySelector(id);

      // ── X パイプライン ──
      let xGuardOk = false, xDryOk = false;
      const xParams = () => {
        const p = { draft: $("#x-draft").value };
        const tw = $("#x-tweet").value.trim();
        if (tw) p.tweet = tw;
        const dates = $("#x-dates").value.trim().split(/\s+/).filter(Boolean);
        if (dates.length) p.dates = dates;
        return p;
      };
      const xMaybeUnlock = () => {
        if (xGuardOk && xDryOk) { unlock($("#x-commit")); $("#x-hint").textContent = "③ 本番投稿が解錠されました。対象名の入力確認があります。"; }
      };
      $("#x-guard").onclick = async () => { clearLog(); xGuardOk = await run("x-guard", "dry", {}); xMaybeUnlock(); };
      $("#x-dry").onclick = async () => { clearLog(); xDryOk = await run("x-publish", "dry", xParams()); xMaybeUnlock(); };
      $("#x-commit").onclick = async () => {
        const draft = $("#x-draft").value;
        if (!confirmType(draft)) return;
        await run("x-publish", "commit", xParams());
      };
      $("#x-sync").onclick = async () => { await run("x-sync", "dry", {}); };

      // ── IG ──
      let igDryOk = false;
      const igParams = () => ({ pack: $("#ig-pack").value, date: $("#ig-date").value.trim() });
      $("#ig-dry").onclick = async () => { clearLog(); igDryOk = await run("ig-publish", "dry", igParams()); if (igDryOk) unlock($("#ig-commit")); };
      $("#ig-commit").onclick = async () => {
        if (!confirmType($("#ig-pack").value)) return;
        await run("ig-publish", "commit", igParams());
      };
      $("#ig-mark").onclick = async () => { clearLog(); await run("ig-mark", "commit", { pack: $("#ig-pack").value, format: "carousel" }); };

      // ── note ──
      let noteDraftOk = false;
      const noteParams = () => {
        const p = { article: $("#note-article").value.trim() };
        const d = $("#note-date").value.trim();
        if (d) p.date = d;
        return p;
      };
      $("#note-draft").onclick = async () => { clearLog(); noteDraftOk = await run("note-publish", "dry", noteParams()); if (noteDraftOk) unlock($("#note-commit")); };
      $("#note-commit").onclick = async () => {
        if (!confirmType($("#note-article").value.trim())) return;
        await run("note-publish", "commit", noteParams());
      };
    },
  });
})();
