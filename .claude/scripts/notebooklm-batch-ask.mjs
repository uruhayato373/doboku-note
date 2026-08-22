#!/usr/bin/env node
/**
 * notebooklm-batch-ask.mjs — NotebookLM 逐次バッチ質問ランナー
 *
 * 1 つの notebook に対し、複数の質問を「1 問ずつ・間隔を空けて・リトライ付き」で投げ、
 * 各回答テキストを個別ファイルに保存する。Workflow 内で並列エージェントが NotebookLM を
 * 高速連打すると認証失効・レート制限で大半失敗する（2026-05-29 実証）ため、
 * 抽出は必ずこの逐次ランナーで行うこと。
 *
 * 内部は `notebooklm-cross-query.mjs` を spawn して 1 問ずつ実行（cli-gotchas の proxy/encoding 対策を継承）。
 *
 * 使い方:
 *   # 質問 JSON を渡す（{ "P1": "質問文", "P2": "..." } 形式）
 *   node .claude/scripts/notebooklm-batch-ask.mjs \
 *     --notebook "国土交通白書" \
 *     --questions .tmp/mywork/questions.json \
 *     --outdir .tmp/mywork/answers
 *
 *   オプション:
 *     --interval 5000     問間インターバル ms（既定 5000）
 *     --retry 3           1 問あたりの最大試行（既定 3）
 *     --retry-wait 8000   リトライ待機 ms（既定 8000）
 *
 * 出力:
 *   <outdir>/<key>.txt       回答テキスト（answer のみ）
 *   <outdir>/<key>.raw.json  生の cross-query 出力（デバッグ用）
 *   <outdir>/index.json      { key: {ok, chars|error} } の集計
 *
 * 終了コード:
 *   0  全問成功
 *   1  引数エラー
 *   2  認証期限切れ（`notebooklm login` で再認証 → 再実行）
 *   6  1 問以上失敗（index.json を確認）
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const WRAPPER = join(ROOT, '.claude', 'scripts', 'notebooklm-cross-query.mjs');

const args = process.argv.slice(2);
const opt = (name, def = null) => {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
};

const NOTEBOOK = opt('--notebook');
const QFILE = opt('--questions');
const OUTDIR = opt('--outdir');
const INTERVAL = parseInt(opt('--interval', '5000'), 10);
const RETRY = parseInt(opt('--retry', '3'), 10);
const RETRY_WAIT = parseInt(opt('--retry-wait', '8000'), 10);

if (!NOTEBOOK || !QFILE || !OUTDIR) {
  console.error('usage: --notebook "<name>" --questions <q.json> --outdir <dir> [--interval ms] [--retry n] [--retry-wait ms]');
  process.exit(1);
}
if (!existsSync(QFILE)) {
  console.error(`questions file not found: ${QFILE}`);
  process.exit(1);
}
if (!existsSync(OUTDIR)) mkdirSync(OUTDIR, { recursive: true });

const questions = JSON.parse(readFileSync(QFILE, 'utf8'));
const keys = Object.keys(questions);
if (!keys.length) {
  console.error('no questions in file');
  process.exit(1);
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function ask(q) {
  // 注: ラッパーは --notebooks "<名前>"（--notebook-id は非対応）。全角括弧質問もそのまま渡せる。
  const r = spawnSync('node', [WRAPPER, '--notebooks', NOTEBOOK, '--json', q], {
    cwd: ROOT, encoding: 'utf8', shell: false, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  return { code: r.status, out: r.stdout || '', err: r.stderr || '' };
}

function extractAnswer(stdout) {
  try {
    const j = JSON.parse(stdout);
    const res = (j.results || [])[0];
    const ans = res && res.response && res.response.answer;
    if (ans && ans.length > 50) return ans;
  } catch {}
  return null;
}

const index = {};
for (const key of keys) {
  const q = questions[key];
  let answer = null, lastErr = '';
  for (let attempt = 1; attempt <= RETRY; attempt++) {
    const { code, out, err } = ask(q);
    if (out) writeFileSync(join(OUTDIR, `${key}.raw.json`), out, 'utf8');
    answer = extractAnswer(out);
    if (answer) break;
    lastErr = (err || out || '').slice(0, 300);
    console.error(`[${key}] attempt ${attempt}/${RETRY} failed (code=${code})`);
    if (/Authentication expired|Run 'notebooklm login'/i.test(out + err)) {
      console.error(`[${key}] AUTH EXPIRED — run 'notebooklm login' then re-run.`);
      writeFileSync(join(OUTDIR, '_AUTH_EXPIRED'), key, 'utf8');
      process.exit(2);
    }
    if (attempt < RETRY) sleep(RETRY_WAIT);
  }
  if (answer) {
    writeFileSync(join(OUTDIR, `${key}.txt`), answer, 'utf8');
    index[key] = { ok: true, chars: answer.length };
    console.log(`[${key}] OK (${answer.length} chars)`);
  } else {
    index[key] = { ok: false, error: lastErr };
    console.log(`[${key}] FAILED after ${RETRY} retries`);
  }
  sleep(INTERVAL);
}

writeFileSync(join(OUTDIR, 'index.json'), JSON.stringify(index, null, 2), 'utf8');
const ok = Object.values(index).filter((v) => v.ok).length;
console.log(`DONE: ${ok}/${keys.length} answered -> ${OUTDIR}`);
process.exit(ok === keys.length ? 0 : 6);
