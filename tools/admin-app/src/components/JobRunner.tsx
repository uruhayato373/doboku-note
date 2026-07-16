'use client';

import { useRef, useState } from 'react';

/**
 * JobRunner — 投稿/予約アクションのクライアント実行 UI（publish.js 移植）。
 * 設計: UI は引数を組み立てて既存 CLI を叩くだけ。ガード（--commit ゲート・dobokunote
 * assert・x-schedule-guard BLOCK）は CLI 側。本番ボタンは dry-run/guard 成功まで disabled +
 * 対象名タイプ確認。ジョブは同時 1 本（サーバが強制）。POST /api/job/run の SSE を購読する。
 */

export interface IgPackOpt {
  value: string; // pack rel（instagram/ を除去）
  label: string;
}
export interface XDraftOpt {
  value: string;
  label: string;
}

type LogLine = { cls: string; text: string };

export default function JobRunner({ igPacks, xDrafts }: { igPacks: IgPackOpt[]; xDrafts: XDraftOpt[] }) {
  const [log, setLog] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // gating state
  const [xGuardOk, setXGuardOk] = useState(false);
  const [xDryOk, setXDryOk] = useState(false);
  const [igDryOk, setIgDryOk] = useState(false);
  const [noteDraftOk, setNoteDraftOk] = useState(false);

  // form fields
  const [xDraft, setXDraft] = useState(xDrafts[0]?.value ?? '');
  const [xTweet, setXTweet] = useState('');
  const [xDates, setXDates] = useState('');
  const [igPack, setIgPack] = useState(igPacks[0]?.value ?? '');
  const [igDate, setIgDate] = useState('');
  const [noteArticle, setNoteArticle] = useState('');
  const [noteDate, setNoteDate] = useState('');

  function append(line: LogLine) {
    setLog((prev) => [...prev, line]);
    queueMicrotask(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    });
  }
  const clearLog = () => setLog([]);

  // POST /api/job/run を叩き SSE を購読。code===0 を解決値に返す。
  async function run(action: string, mode: 'dry' | 'commit', params: Record<string, unknown>): Promise<boolean> {
    if (busy) throw new Error('実行中です');
    setBusy(true);
    let code: number | null = null;
    try {
      const res = await fetch('/api/job/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin': '1' },
        body: JSON.stringify({ action, mode, params }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        append({ cls: 'log-ng', text: `エラー: ${err.error ?? res.status}` });
        return false;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const chunks = buf.split('\n\n');
        buf = chunks.pop() ?? '';
        for (const c of chunks) {
          const m = c.match(/^data: (.*)$/s);
          if (!m) continue;
          let obj: { t: string; cmd?: string; line?: string; code?: number | null };
          try {
            obj = JSON.parse(m[1]!);
          } catch {
            continue;
          }
          if (obj.t === 'start') append({ cls: 'log-cmd', text: `$ ${obj.cmd}` });
          else if (obj.t === 'end') {
            code = obj.code ?? null;
            append({ cls: code === 0 ? 'log-ok' : 'log-ng', text: `— 終了コード ${code} —` });
          } else if (obj.t === 'err') append({ cls: 'log-ng', text: obj.line ?? '' });
          else append({ cls: 'log-out', text: obj.line ?? '' });
        }
      }
    } finally {
      setBusy(false);
    }
    return code === 0;
  }

  function confirmType(target: string): boolean {
    const typed = window.prompt(`本番実行します。確認のため対象名を入力してください:\n${target}`);
    return typed === target;
  }

  // ── X パラメータ ──
  const xParams = () => {
    const p: Record<string, unknown> = { draft: xDraft };
    if (xTweet.trim()) p.tweet = xTweet.trim();
    const dates = xDates.trim().split(/\s+/).filter(Boolean);
    if (dates.length) p.dates = dates;
    return p;
  };
  const xCommitReady = xGuardOk && xDryOk;

  return (
    <>
      <div className="card">
        <p className="small muted" style={{ margin: 0 }}>
          投稿系はローカルの Playwright ログインプロファイルを使います。
          <b>本番ボタンは dry-run / ガードが成功するまで押せません</b>。ジョブは同時 1 本（サーバが強制）。
          全リクエストに <code>X-Admin: 1</code> ヘッダを付与（CSRF ガード）。
        </p>
      </div>

      {/* X */}
      <div className="card">
        <h2>X（4ステップ固定パイプライン）</h2>
        <div className="job-row">
          <label>
            ドラフト{' '}
            <select value={xDraft} onChange={(e) => setXDraft(e.target.value)}>
              {xDrafts.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            tweet番号(任意){' '}
            <input type="number" min={1} max={50} value={xTweet} onChange={(e) => setXTweet(e.target.value)} style={{ width: 64 }} />
          </label>
        </div>
        <div className="job-row">
          <label>
            予約日時(任意・複数可 空白区切り){' '}
            <input
              value={xDates}
              onChange={(e) => setXDates(e.target.value)}
              placeholder="2026-07-10T08:00 2026-07-11T08:00"
              style={{ width: 320 }}
            />
          </label>
        </div>
        <div className="filterbar">
          <button
            className="job-btn"
            disabled={busy}
            onClick={async () => {
              clearLog();
              setXGuardOk(await run('x-guard', 'dry', {}));
            }}
          >
            ① ガード
          </button>
          <button
            className="job-btn"
            disabled={busy}
            onClick={async () => {
              clearLog();
              setXDryOk(await run('x-publish', 'dry', xParams()));
            }}
          >
            ② dry-run
          </button>
          <button
            className={'job-btn' + (xCommitReady ? ' armed' : '')}
            disabled={busy || !xCommitReady}
            onClick={async () => {
              if (!confirmType(xDraft)) return;
              await run('x-publish', 'commit', xParams());
            }}
          >
            ③ 本番投稿
          </button>
          <button className="job-btn" disabled={busy} onClick={() => run('x-sync', 'dry', {})}>
            ④ 昇格検証
          </button>
        </div>
        <p className="small muted">① ガード → ② dry-run の両方が成功すると ③ が解錠されます。</p>
      </div>

      {/* IG */}
      <div className="card">
        <h2>Instagram カルーセル（予約投稿）</h2>
        <div className="job-row">
          <label>
            パック{' '}
            <select value={igPack} onChange={(e) => setIgPack(e.target.value)} style={{ minWidth: 320 }}>
              {igPacks.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            予約日時{' '}
            <input value={igDate} onChange={(e) => setIgDate(e.target.value)} placeholder="2026-07-10T07:00" style={{ width: 180 }} />
          </label>
        </div>
        <div className="filterbar">
          <button
            className="job-btn"
            disabled={busy}
            onClick={async () => {
              clearLog();
              setIgDryOk(await run('ig-publish', 'dry', { pack: igPack, date: igDate.trim() }));
            }}
          >
            dry-run
          </button>
          <button
            className={'job-btn' + (igDryOk ? ' armed' : '')}
            disabled={busy || !igDryOk}
            onClick={async () => {
              if (!confirmType(igPack)) return;
              await run('ig-publish', 'commit', { pack: igPack, date: igDate.trim() });
            }}
          >
            本番予約
          </button>
          <button
            className="job-btn"
            disabled={busy}
            onClick={() => {
              clearLog();
              run('ig-mark', 'commit', { pack: igPack, format: 'carousel' });
            }}
          >
            投稿済みを記録(carousel)
          </button>
        </div>
        <p className="small muted">dry-run 成功で本番予約が解錠されます。</p>
      </div>

      {/* note */}
      <div className="card">
        <h2>note 記事（下書き→公開）</h2>
        <div className="job-row">
          <label>
            article.md パス{' '}
            <input
              value={noteArticle}
              onChange={(e) => setNoteArticle(e.target.value)}
              placeholder="docs/note/技術士総監/.../article.md"
              style={{ width: 420 }}
            />
          </label>
        </div>
        <div className="job-row">
          <label>
            予約日時(任意){' '}
            <input value={noteDate} onChange={(e) => setNoteDate(e.target.value)} placeholder="2026-07-10T07:00" style={{ width: 180 }} />
          </label>
        </div>
        <div className="filterbar">
          <button
            className="job-btn"
            disabled={busy}
            onClick={async () => {
              clearLog();
              const p: Record<string, unknown> = { article: noteArticle.trim() };
              if (noteDate.trim()) p.date = noteDate.trim();
              setNoteDraftOk(await run('note-publish', 'dry', p));
            }}
          >
            下書き作成(安全)
          </button>
          <button
            className={'job-btn' + (noteDraftOk ? ' armed' : '')}
            disabled={busy || !noteDraftOk}
            onClick={async () => {
              if (!confirmType(noteArticle.trim())) return;
              const p: Record<string, unknown> = { article: noteArticle.trim() };
              if (noteDate.trim()) p.date = noteDate.trim();
              await run('note-publish', 'commit', p);
            }}
          >
            公開/予約
          </button>
        </div>
        <p className="small muted">下書き作成が成功すると公開が解錠されます（note-publish の --commit ゲート）。</p>
      </div>

      {/* ログ */}
      <div className="card">
        <h2>実行ログ</h2>
        <div className="job-log" ref={logRef}>
          {log.length === 0 ? <div className="muted small">（未実行）</div> : null}
          {log.map((l, i) => (
            <div key={i} className={l.cls}>
              {l.text}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
