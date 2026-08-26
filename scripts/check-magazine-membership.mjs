#!/usr/bin/env node
/**
 * check-magazine-membership.mjs — マガジン収録の三軸突合ゲート。
 *
 * 止めたい事故（2026-08-24 実発覚）:
 *   総監模範論文の R8 予想テーマを 4 → 6 に拡張したとき、ゼネコンと河川コンサルだけ
 *   **記事 2 本を repo に足したのにライブマガジンへ収録せず、note-magazines.ts の件数表記も 9 のまま**
 *   だった。¥2,480 の商品で、他ペルソナが 11 本受け取るところ 9 本しか届いていなかった。
 *   先行同型: essay-complete-pack が全 doc「6本」表記なのにライブは 53 記事（2026-06-10）。
 *
 * なぜ既存の verify-note-magazines で捕まらないか:
 *   あれは **SoT ↔ ライブ** の 2 者突合。SoT の件数表記も古びていればライブと一致して緑が出る。
 *   （そもそも parseSoT は description の件数を読んでいない。）
 *   **両方が同じ値で古びると、その 2 者を比べる検査は永久に緑**になる。第三軸が要る。
 *
 * 三軸:
 *   A: repo 実数  … 記事 frontmatter `noteMagazine` の集計（記事を足す＝宣言が増える）
 *   B: SoT 表記   … note-magazines.ts の「計N記事」「（N本セット」
 *   C: ライブ     … .claude/state/note/magazines-snapshot.json の magazines[].notes.length
 *
 *   期待収録数(id) = Σ A(その id に紐づくラベル) + extras[id].count
 *   収録リストを別に手書きしないのは、それ自体が第 4 のドリフト源になるため。
 *
 * ネットワークを叩かない: C は snapshot の**オフライン読取**のみ。
 *   ここをライブ取得にすると、プロキシで落ちるたび CI が赤くなり信号が死ぬ。
 *   snapshot の供給は .github/workflows/note-live-audit.yml（週次）が担当する。
 *   ただし **古い snapshot を緑と呼ばない**: fetchedAt が STALE_DAYS 超なら軸 C は検査不成立。
 *
 * Usage:
 *   node scripts/check-magazine-membership.mjs           全軸（snapshot が新しければ）
 *   node scripts/check-magazine-membership.mjs --ci      鮮度必須（腐っていれば exit 2）
 *   node scripts/check-magazine-membership.mjs --staged  関連 staged のときだけ・軸 A↔B のみ
 *   node scripts/check-magazine-membership.mjs --json
 *
 * exit: 0 合格 / 1 件数ズレ / 2 検査不成立（設定破損・対象ゼロ・--ci で snapshot 腐敗）
 * 緊急回避: SKIP_MAGAZINE_MEMBERSHIP=1
 *
 * 真実源: .claude/config/note-magazine-membership.json
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTE_DIR = join(ROOT, 'content/note');
const SOT_PATH = join(ROOT, 'src/lib/note-magazines.ts');
const CONFIG_PATH = join(ROOT, '.claude/config/note-magazine-membership.json');
const SNAPSHOT_PATH = join(ROOT, '.claude/state/note/magazines-snapshot.json');

/** 週次 note-live-audit + 2 日のバッファ。これを超えた snapshot は「真実」として使わない。 */
const STALE_DAYS = 9;

/** 型別 article-*.md を落とさない（CLAUDE.md §9）。 */
const ARTICLE_FILE = /^article(-[^.]+)?\.md$/;

/** content/note 配下の article ファイルを再帰収集する。 */
export function listNoteArticles(dir = NOTE_DIR) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (ARTICLE_FILE.test(name)) out.push(p);
    }
  };
  walk(dir);
  return out;
}

/**
 * frontmatter から noteMagazine ラベルと公開状態を取り出す（純関数・テストから使う）。
 *
 * `published` は「note 上に出ているか」。**draft は期待収録数に数えない** —— 未公開の記事は
 * マガジンに入りようがないので、数えるとライブ側が必ず不足して偽赤になる
 * （実例: 経験記述-週次お題ラボは repo 11 本のうち 6 本が membership のドリップ在庫で draft）。
 * 判定は 2 系統ある運用に合わせる: noteStatus 明示か、noteStatus 無しで noteUrl を持つか。
 */
export function readArticleMeta(source) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!m) return { label: null, published: false };
  const fm = m[1];
  const g = /^noteMagazine:\s*(.+)$/m.exec(fm);
  const label = g ? (g[1].trim().replace(/^["']|["']$/g, '').trim() || null) : null;
  const st = /^noteStatus:\s*(\S+)/m.exec(fm)?.[1].replace(/^["']|["']$/g, '') ?? null;
  const hasUrl = /^noteUrl:\s*\S/m.test(fm);
  return { label, published: st ? st === 'published' : hasUrl };
}

/**
 * note-magazines.ts をエントリ単位に切り出す（純関数・テストから使う）。
 *
 * TS を評価せずテキストで読む。この検査のためにビルド依存を増やさない。
 * **SoT には手を入れない**（id / published / noteUrl の行順契約は読むだけ）。
 */
export function parseSoT(source) {
  const out = {};
  for (const block of source.split(/\n\s{2}'/).slice(1)) {
    const id = /id: '([^']+)'/.exec(block)?.[1];
    if (!id) continue;
    const key = /note\.com\/dobokunote\/m\/(m[0-9a-f]+)/.exec(block)?.[1] ?? null;

    // 軸 B のゲートは price の「（N本セット」「（N記事セット」だけを見る。
    // ここは「この価格で何本受け取れるか」を表す単一目的の位置で、曖昧さが無い。
    // description の散文は**小計を含む**ため総数として読めない（実例: 道路の
    // 「…4テーマ＝計9記事）…（全24記事）」。前者は予想問題の内訳で総数ではない）。
    const price = /price: '([^']*)'/.exec(block)?.[1] ?? '';
    const pm = /（(\d+)(?:本|記事)セット/.exec(price);
    const declared = pm ? { kind: pm[0].includes('記事セット') ? 'N記事セット' : 'N本セット', n: Number(pm[1]) } : null;

    // description の件数は参考情報（非ゲート）。総数表現は「全N記事」「計 N 記事」の 2 系統。
    const desc = block.replace(/price: '[^']*'/, '');
    const mentions = [...desc.matchAll(/[全計]\s?(\d+)\s?記事/g)].map((m) => Number(m[1]));

    out[id] = { id, key, declared, mentions, price, title: /title: '([^']+)'/.exec(block)?.[1] ?? '' };
  }
  return out;
}

/** snapshot の鮮度を判定する（純関数・テストから使う）。 */
export function snapshotFreshness(fetchedAt, now, staleDays = STALE_DAYS) {
  if (!fetchedAt) return { ok: false, reason: 'fetchedAt が無い', ageDays: null };
  const t = Date.parse(fetchedAt);
  if (Number.isNaN(t)) return { ok: false, reason: `fetchedAt が壊れている: ${fetchedAt}`, ageDays: null };
  const ageDays = Math.floor((now - t) / 86400000);
  return ageDays > staleDays
    ? { ok: false, reason: `snapshot が ${ageDays} 日前（上限 ${staleDays} 日）`, ageDays }
    : { ok: true, reason: '', ageDays };
}

/**
 * 1 マガジンを判定する（純関数・テストから使う）。
 * @param liveCount ライブ収録数。軸 C を見ないときは null。
 */
export function auditMagazine({ id, labels, repoCount, extra, entry, liveCount }) {
  const expected = repoCount + (extra?.count ?? 0);
  const base = { id, labels, repoCount, extra: extra?.count ?? 0, expected, title: entry?.title ?? '' };
  if (!entry) return { ...base, ok: false, kind: 'no-sot', detail: 'note-magazines.ts に id が無い' };

  const declared = entry.declared?.n ?? null;
  const sotBad = declared != null && declared !== expected;
  const liveBad = liveCount != null && liveCount !== expected;

  // 軸 B も軸 C も無い＝このマガジンは何とも照合できていない。
  //
  // ただし **これを常に fail にはしない**。price の件数表記は「¥9,800（完全攻略パック）」
  // 「¥5,480（60工事フル）」のように件数を持たない書き方が正当に存在し、そういうマガジンは
  // 軸 C（ライブ）でしか照合できない。pre-commit（--staged）は軸 C を見ないので、
  // 常に fail にすると commit が構造的に通らなくなり、ゲートごと無視されるようになる。
  // 「照合できていない」ことは unverified として集計し、**軸 C が使える文脈でだけ**厳格に扱う。
  if (declared == null && liveCount == null) {
    return { ...base, declared, liveCount, ok: true, kind: 'unverified',
      detail: 'price に件数表記が無く、ライブ収録数も取れない（照合できる軸がゼロ）' };
  }

  // description の総数言及が期待値とズレている場合は警告（小計を含むため非ゲート）。
  const descWarn = entry.mentions?.length && !entry.mentions.includes(expected)
    ? `description の総数言及 ${entry.mentions.join('/')} に期待値 ${expected} が無い`
    : '';

  return {
    ...base, declared, liveCount, descWarn,
    ok: !sotBad && !liveBad,
    kind: sotBad && liveBad ? 'both-drift' : sotBad ? 'sot-drift' : liveBad ? 'live-drift' : 'ok',
    detail: [sotBad ? `SoT price=${declared}` : '', liveBad ? `ライブ ${liveCount}` : ''].filter(Boolean).join(' / '),
  };
}

function relevantStaged() {
  let changed = '';
  try {
    changed = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMRD'], {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
    });
  } catch { return true; } // git が読めないなら判断せず検査する
  return changed.split('\n').some((p) =>
    p.startsWith('content/note/')
    || p.includes('src/lib/note-magazines.ts')
    || p.includes('note-magazine-membership.json'));
}

function fail(msg) { console.error(`✗ 検査不成立: ${msg}`); process.exit(2); }

function main() {
  if (process.env.SKIP_MAGAZINE_MEMBERSHIP === '1') {
    console.log('[check-magazine-membership] SKIP_MAGAZINE_MEMBERSHIP=1 のためスキップ');
    process.exit(0);
  }
  const argv = process.argv.slice(2);
  const jsonOut = argv.includes('--json');
  const ci = argv.includes('--ci');
  const staged = argv.includes('--staged');
  const say = jsonOut ? console.error : console.log;
  if (staged && !relevantStaged()) process.exit(0);

  // --- config ---
  let config;
  try { config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')); } catch (e) { fail(`config を読めない: ${e.message}`); }
  const labelMap = config.labels ?? {};
  const extras = config.extras ?? {};
  // `_` 始まりのキーは説明用メモ（JSON にコメントが書けないため）。データとして扱わない。
  const dropDocKeys = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([k]) => !k.startsWith('_')));
  const packs = dropDocKeys(config.packs);
  const excluded = dropDocKeys(config.excluded);
  if (Object.keys(labelMap).length === 0) fail('config の labels が空');

  // --- 軸 A: repo 実数 ---
  const files = listNoteArticles();
  if (files.length === 0) fail('article ファイルが 1 件も取れない（走査の破損を疑う）');
  const byLabel = new Map();
  const draftByLabel = new Map();
  for (const f of files) {
    const { label, published } = readArticleMeta(readFileSync(f, 'utf8'));
    if (!label) continue;
    if (published) byLabel.set(label, (byLabel.get(label) ?? 0) + 1);
    else draftByLabel.set(label, (draftByLabel.get(label) ?? 0) + 1);
  }

  // --- 軸 B: SoT ---
  const sot = parseSoT(readFileSync(SOT_PATH, 'utf8'));
  for (const [label, id] of Object.entries(labelMap)) {
    if (!sot[id]) fail(`config の labels["${label}"] が指す id "${id}" が note-magazines.ts に無い`);
  }
  for (const [id, ex] of Object.entries(extras)) {
    if (!sot[id]) fail(`config の extras["${id}"] が note-magazines.ts に無い`);
    if (!ex.reason || ex.reason.length < 6) fail(`config の extras["${id}"] に理由が無い`);
    if (!Number.isInteger(ex.count)) fail(`config の extras["${id}"].count が整数でない`);
  }

  // --- 軸 C: ライブ snapshot（オフライン読取・鮮度で足切り） ---
  let live = null;
  let freshness = { ok: false, reason: 'snapshot が無い', ageDays: null };
  let fetchedAt = null;
  if (staged) {
    freshness = { ok: false, reason: '--staged では軸 C を見ない（CI 停止でローカル commit を塞がないため）', ageDays: null };
  } else if (existsSync(SNAPSHOT_PATH)) {
    try {
      const snap = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
      fetchedAt = snap.fetchedAt ?? null;
      freshness = snapshotFreshness(fetchedAt, Date.now());
      if (freshness.ok) {
        live = new Map();
        for (const m of snap.magazines ?? []) {
          if (m.key && Array.isArray(m.notes)) live.set(m.key, m.notes.length);
        }
        if (live.size === 0) freshness = { ok: false, reason: 'snapshot に notes[] が無い（--contents 無しで生成された）', ageDays: freshness.ageDays };
        if (!freshness.ok) live = null;
      }
    } catch (e) {
      freshness = { ok: false, reason: `snapshot が壊れている: ${e.message}`, ageDays: null };
    }
  }
  // CI では snapshot 供給の破綻そのものをアラームにする（古い緑を出さない）。
  if (ci && !freshness.ok) fail(`ライブ軸を検査できない — ${freshness.reason}。note-live-audit.yml の snapshot 供給を確認する`);

  // --- 判定 ---
  // labels（1 ラベル→1 マガジン）と packs（複数ラベルの合算＝パック商品）を同じ表に畳む。
  const idToLabels = new Map();
  const add = (id, label) => {
    if (!idToLabels.has(id)) idToLabels.set(id, []);
    idToLabels.get(id).push(label);
  };
  for (const [label, id] of Object.entries(labelMap)) add(id, label);
  for (const [id, pack] of Object.entries(packs)) for (const l of pack.labels ?? []) add(id, l);

  const gatedIds = [...new Set([...idToLabels.keys(), ...Object.keys(extras)])];
  if (gatedIds.length === 0) fail('ゲート対象のマガジンが 0 件');

  const rows = gatedIds.map((id) => {
    const labels = idToLabels.get(id) ?? [];
    let repoCount = labels.reduce((a, l) => a + (byLabel.get(l) ?? 0), 0);
    // パック商品は他マガジンから**一部だけ**同梱することがある（実測: 二次検定まるごとパックは
    // 完全攻略パック 151 本のうち 101 本＋テーマ別出る順 5 本）。「まるごと合算」にすると
    // 期待が過大になって構造的に赤いままになるので、同梱数は fromMagazines に実測値で書く。
    // 構成が変わればライブ側とズレて赤くなる＝それがこのゲートの役目。
    for (const [srcId, n] of Object.entries(packs[id]?.fromMagazines ?? {})) {
      if (!sot[srcId]) fail(`packs["${id}"].fromMagazines の "${srcId}" が note-magazines.ts に無い`);
      repoCount += n;
    }
    const entry = sot[id];
    const liveCount = live && entry?.key ? (live.get(entry.key) ?? null) : null;
    return auditMagazine({ id, labels, repoCount, extra: extras[id], entry, liveCount });
  }).sort((a, b) => a.id.localeCompare(b.id));
  const bad = rows.filter((r) => !r.ok);
  // 「照合できていない」を緑と混同しない（CLAUDE.md §9）。件数を必ず出し、
  // 軸 C が使える文脈（--ci = snapshot 鮮度が保証されている）では失格として扱う。
  const unverified = rows.filter((r) => r.kind === 'unverified');

  // 未分類 = labels にも packs にも excluded にも属さないラベル。
  // これを「未対応（非ゲート）」として黙って許すと、新しいラベルを作るたび射程が痩せていく。
  // ゴールは未分類 0（どこに属すかを必ず宣言させる）。
  const classified = new Set([
    ...Object.keys(labelMap),
    ...Object.values(packs).flatMap((p) => p.labels ?? []),
    ...Object.keys(excluded),
  ]);
  const allLabels = new Set([...byLabel.keys(), ...draftByLabel.keys()]);
  const unclassified = [...allLabels].filter((l) => !classified.has(l))
    .map((l) => [l, (byLabel.get(l) ?? 0) + (draftByLabel.get(l) ?? 0)])
    .sort((a, b) => b[1] - a[1]);
  const unreferenced = Object.keys(sot).filter((id) => !gatedIds.includes(id));

  // 検査ゼロを PASS と呼ばない（CLAUDE.md §9）: 実検査数を必ず出す
  const draftTotal = [...draftByLabel.values()].reduce((a, b) => a + b, 0);
  say(`[check-magazine-membership] ラベル ${classified.size} 種を分類済（labels ${Object.keys(labelMap).length} / packs ${Object.keys(packs).length} / excluded ${Object.keys(excluded).length}）`
    + ` / 記事 ${files.length} 本（公開 ${[...byLabel.values()].reduce((a, b) => a + b, 0)} 本・draft ${draftTotal} 本は期待値から除外）`
    + ` / マガジン ${rows.length} 件を実検査 / ズレ ${bad.length} 件 / 未分類 ${unclassified.length} 種`
    + (unverified.length ? ` / **未照合 ${unverified.length} 件**` : ''));
  say(`  軸C(ライブ): ${freshness.ok ? `snapshot ${freshness.ageDays} 日前（fetchedAt ${fetchedAt}）` : `**未検査** — ${freshness.reason}`}`);
  for (const r of rows) {
    say(`  ${r.ok ? '✓' : '✗'} ${r.id.padEnd(46)} 期待 ${String(r.expected).padStart(3)}`
      + `（repo ${r.repoCount}${r.extra ? ` +${r.extra}` : ''}）  SoT ${r.declared ?? '-'}  ライブ ${r.liveCount ?? '-'}`);
  }
  const descWarns = rows.filter((r) => r.descWarn);
  for (const r of descWarns) say(`  ! ${r.id}: ${r.descWarn}（非ゲート）`);
  if (unreferenced.length) say(`  — どの分類からも参照されないマガジン ${unreferenced.length} 件（単発記事系など）`);

  if (jsonOut) {
    process.stdout.write(`${JSON.stringify({
      articles: files.length, labels: Object.keys(labelMap).length, magazines: rows.length,
      freshness: { ...freshness, fetchedAt }, rows, violations: bad,
      unclassified: unclassified.map(([label, count]) => ({ label, count })), unreferenced,
    }, null, 2)}\n`);
  }

  if (unverified.length) {
    say(`  — 未照合 ${unverified.length} 件（price に件数表記が無く、軸Cも無い）: ${unverified.map((r) => r.id).join(', ')}`);
  }

  // --ci は軸 C が使えることを保証している（使えなければ上で exit 2 済み）。
  // その文脈で未照合が残るのは、snapshot にそのマガジンが無いということ＝見逃しになる。
  if (ci && unverified.length) {
    console.error(`\n[check-magazine-membership] ✗ 未照合 ${unverified.length} 件（--ci ではライブ軸で全件照合できるはず）`);
    for (const r of unverified) console.error(`  ${r.id}  ${r.detail}`);
    console.error('\n  snapshot にそのマガジンが無いか、noteUrl が SoT と食い違っている。');
    process.exit(1);
  }

  if (bad.length === 0) {
    say('[check-magazine-membership] ✓ 期待収録数と SoT 表記'
      + (freshness.ok ? '・ライブ収録数' : '') + 'は一致');
    process.exit(0);
  }

  console.error(`\n[check-magazine-membership] ✗ ${bad.length} 件でズレ`);
  for (const r of bad) console.error(`  ${r.id}  期待 ${r.expected}  ${r.detail}`);
  console.error(
    '\n記事を足したら 3 つを同じ commit で揃える:'
    + '\n  1. ライブへ収録   node scripts/note-magazine-add-articles.mjs --target <m…> --notes <n…> --commit'
    + '\n  2. SoT の件数表記 src/lib/note-magazines.ts の title / description / shortDescription / price'
    + '\n  3. snapshot 再生成 npm run verify-note-magazines -- --contents --json'
    + '\nペルソナ dir の外から収録している例外は .claude/config/note-magazine-membership.json の extras に理由付きで。',
  );
  process.exit(1);
}

if (process.argv[1] && basename(process.argv[1].split(sep).join('/')) === 'check-magazine-membership.mjs') main();
