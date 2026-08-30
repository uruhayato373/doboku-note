#!/usr/bin/env node
/**
 * check-e2e-targets.mjs — E2E が「実在しない URL」を叩いて空振りしていないかを検査する。
 *
 * 2026-08-30 に発覚した事故の再発防止。URL を `/category/{slug}` `/docs/{slug}` から
 * `/exam/...` へ移行したあと、`e2e/fixtures.ts` などが旧 URL を指したまま残っていた。
 * 旧 URL は Cloudflare Pages の `public/_redirects`（1,202 行）でしか存在せず、
 * next.config に redirects() は無い。当時 E2E の webServer は `npm run dev` だったので
 * 旧 URL は必ず 404 を返し、smoke と navigation は**製品ではなくリダイレクト設定を
 * 試したつもりで、実際には何も検査できていない赤**を出し続けていた。CI の e2e.yml も
 * 同じ dev サーバーで走っていたため、誰も気づける状態になかった。
 *
 * ここで見るのは 1 点だけ:
 *   E2E が参照するサイト内 URL は、ビルド成果物（out/）に実体があるか、
 *   `_redirects` の転送**先**であること。転送**元**（＝旧 URL）を直接叩いていたら赤。
 *
 * リダイレクト自体を検査したい場合は、旧 URL を明示的に扱うテスト
 * （smoke.spec の「旧URL … が正規URLへ 301 で転送される」）で行う。そこは
 * REDIRECT_TEST_MARKER を含む行として除外する。
 *
 * 終了コード: 0=問題なし / 1=違反あり / 2=検査不成立（out/ が無い・URL を 1 件も抽出できない）
 *
 * Usage:
 *   node scripts/check-e2e-targets.mjs [--json]
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const E2E_DIR = path.join(ROOT, 'e2e');
const OUT = path.join(ROOT, 'out');
const REDIRECTS = path.join(ROOT, 'public', '_redirects');
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');
/** 本番 URL を行単位で持つ設定ファイル。ワークフローと同じ「転送元を測り続ける」事故が起きる。 */
const URL_LIST_FILES = [path.join(ROOT, '.claude', 'config', 'psi-urls.txt')];

/** 本番を指す絶対 URL のホスト。ここから後ろのパスを out/ と突合する。 */
const SITE_HOSTS = ['doboku-note.pages.dev', 'doboku-note.com'];

/**
 * この行内マーカーが付いた行の URL は「リダイレクトそのものを試すテスト」なので転送元でよい。
 * 日本語の語（テスト名など）に依存させない。マーカーを消せばこの検査が復活する。
 */
const REDIRECT_TEST_MARKER = 'check-e2e-targets:redirect-source';

/** 検査対象外の URL（実ページを持たない・テスト用の意図的な存在しない URL）。 */
const IGNORED = new Set(['/__e2e_not_found__']);

function fail(message, code = 2) {
  console.error(`[check-e2e-targets] ${message}`);
  process.exitCode = code;
}

/** `_redirects` の転送元と転送先を集める。ワイルドカード（`/docs/river/*`）も見る。 */
function loadRedirects() {
  const sources = new Set();
  const prefixes = [];
  const targets = new Set();
  if (!fs.existsSync(REDIRECTS)) return { sources, prefixes, targets };
  for (const raw of fs.readFileSync(REDIRECTS, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [from, to] = line.split(/\s+/);
    if (!from || !to) continue;
    if (from.endsWith('/*')) prefixes.push(from.slice(0, -1));
    else sources.add(from);
    targets.add(to.replace(/\/$/, '') || '/');
  }
  return { sources, prefixes, targets };
}

/** ビルド成果物にそのルートの HTML があるか。static export は `/a/b` を `a/b.html` に出す。 */
function existsInBuild(urlPath) {
  if (urlPath === '/') return fs.existsSync(path.join(OUT, 'index.html'));
  const clean = urlPath.replace(/^\//, '');
  return (
    fs.existsSync(path.join(OUT, `${clean}.html`)) ||
    fs.existsSync(path.join(OUT, clean, 'index.html'))
  );
}

/**
 * E2E ソースからサイト内 URL を抜く。
 * 文字列リテラルの中で `/` から始まり、拡張子を持たないものだけを見る（セレクタや
 * 正規表現の断片を拾わないよう、行単位でリダイレクト検査行を除外してから走査する）。
 */
function collectUrls() {
  const found = [];
  if (!fs.existsSync(E2E_DIR)) return found;
  for (const name of fs.readdirSync(E2E_DIR)) {
    if (!name.endsWith('.ts') && !name.endsWith('.mjs')) continue;
    const file = path.join(E2E_DIR, name);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (line.includes(REDIRECT_TEST_MARKER)) return;
      // コメント行は対象外。事故の説明文に旧 URL を書くのは正当で、テストが叩くわけではない
      // （この検査自身の由来を説明したコメントが最初の実行で誤検知した）。
      const head = line.trim();
      if (head.startsWith('//') || head.startsWith('*') || head.startsWith('/*')) return;
      for (const match of line.matchAll(/['"`](\/[A-Za-z0-9\-_/]*)['"`]/g)) {
        const url = match[1].replace(/\/$/, '') || '/';
        if (IGNORED.has(url)) continue;
        // 拡張子つき（アセット）や 1 文字のパスは対象外
        if (/\.[a-z0-9]+$/i.test(url)) continue;
        found.push({ file: name, line: index + 1, url });
      }
    });
  }
  return found;
}

/**
 * ワークフローが叩く本番 URL を集める。
 *
 * E2E だけを見ていては足りなかった。uptime-ping.yml は IA 移行後もずっと
 * 旧 /docs/ /category/ を叩いていて、`_redirects` が返す 301 を「200 でない＝SSR 壊れ」と
 * 判定し、**サイトが正常なまま毎回赤**を出し続けていた（2026-08-30 実測）。
 * 毎回オオカミ少年になる監視は本物の障害と見分けられない＝無いのと同じ。
 */
function collectWorkflowUrls() {
  const found = [];
  if (!fs.existsSync(WORKFLOWS)) return found;
  for (const name of fs.readdirSync(WORKFLOWS)) {
    if (!name.endsWith('.yml') && !name.endsWith('.yaml')) continue;
    const file = path.join(WORKFLOWS, name);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (line.includes(REDIRECT_TEST_MARKER)) return;
      const head = line.trim();
      if (head.startsWith('#')) return;
      for (const host of SITE_HOSTS) {
        const re = new RegExp(`https?://${host.replace(/\./g, '\\.')}(/[A-Za-z0-9\\-_/]*)`, 'g');
        for (const match of line.matchAll(re)) {
          const url = match[1].replace(/\/$/, '') || '/';
          if (IGNORED.has(url)) continue;
          if (/\.[a-z0-9]+$/i.test(url)) continue;
          found.push({ file: `.github/workflows/${name}`, line: index + 1, url });
        }
      }
    });
  }
  return found;
}

/**
 * 本番 URL を列挙する設定ファイル（psi-urls.txt 等）から URL を集める。
 *
 * PSI は 2026-08-30 の IA 移行後、22 URL 中 20 が `_redirects` の転送元になっていた。
 * Lighthouse は 301 を追うので lab 値は出るが、**CrUX(field) は要求した URL をキーに持つ**
 * ため転送元には存在せず、field 0 件で min_field_coverage ゲートが恒久的に赤になる。
 */
function collectUrlListFiles() {
  const found = [];
  for (const file of URL_LIST_FILES) {
    if (!fs.existsSync(file)) continue;
    const rel = path.relative(ROOT, file);
    fs.readFileSync(file, 'utf8').split('\n').forEach((raw, index) => {
      const line = raw.trim();
      if (!line || line.startsWith('#')) return;
      if (line.includes(REDIRECT_TEST_MARKER)) return;
      for (const host of SITE_HOSTS) {
        const re = new RegExp(`^https?://${host.replace(/\./g, '\\.')}(/[A-Za-z0-9\\-_/]*)$`);
        const m = line.match(re);
        if (!m) continue;
        const url = m[1].replace(/\/$/, '') || '/';
        if (IGNORED.has(url)) continue;
        found.push({ file: rel, line: index + 1, url });
      }
    });
  }
  return found;
}

function main() {
  const asJson = process.argv.includes('--json');

  if (!fs.existsSync(OUT)) {
    fail('out/ が無い。先に `npm run build` を実行する（ビルド成果物と突合する検査のため）。');
    return;
  }
  const e2eUrls = collectUrls();
  if (e2eUrls.length === 0) {
    fail('E2E から URL を 1 件も抽出できなかった。抽出ロジックが壊れている疑い（検査不成立）。');
    return;
  }
  const workflowUrls = collectWorkflowUrls();
  if (workflowUrls.length === 0) {
    fail('ワークフローから本番 URL を 1 件も抽出できなかった。抽出ロジックが壊れている疑い（検査不成立）。');
    return;
  }
  const urlListUrls = collectUrlListFiles();
  if (urlListUrls.length === 0) {
    fail('URL 一覧ファイルから本番 URL を 1 件も抽出できなかった。抽出ロジックが壊れている疑い（検査不成立）。');
    return;
  }
  const urls = [...e2eUrls, ...workflowUrls, ...urlListUrls];

  const { sources, prefixes, targets } = loadRedirects();
  const violations = [];
  const checked = new Set();

  for (const entry of urls) {
    checked.add(entry.url);
    if (existsInBuild(entry.url)) continue;
    const isRedirectSource =
      sources.has(entry.url) || prefixes.some((prefix) => entry.url.startsWith(prefix));
    if (isRedirectSource) {
      violations.push({
        ...entry,
        reason: 'redirect-source',
        detail: 'リダイレクトの転送元。dev サーバーでは 404 になり検査が成立しない（正規 URL を使う）',
      });
      continue;
    }
    if (targets.has(entry.url)) continue; // 転送先だがビルドに無い＝別の検査の領分
    violations.push({
      ...entry,
      reason: 'not-built',
      detail: 'ビルド成果物にも _redirects にも存在しない URL',
    });
  }

  const report = {
    ok: violations.length === 0,
    checkedUrls: checked.size,
    occurrences: urls.length,
    violations,
  };

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `[check-e2e-targets] サイト内 URL ${checked.size} 種（延べ ${urls.length} 箇所 = E2E ${e2eUrls.length} / ワークフロー ${workflowUrls.length} / URL 一覧 ${urlListUrls.length}）を out/ と _redirects に突合`,
    );
    for (const v of violations) {
      console.log(`  [${v.reason}] ${v.file}:${v.line} ${v.url} — ${v.detail}`);
    }
    console.log(
      violations.length === 0
        ? '[check-e2e-targets] ✓ E2E・ワークフロー・URL 一覧が叩く URL はすべて実在する'
        : `[check-e2e-targets] NG: ${violations.length} 件が実在しない URL を叩いている`,
    );
  }
  process.exitCode = violations.length === 0 ? 0 : 1;
}

main();
