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
 *   期待収録数(id) = Σ A(その id に紐づくラベル) + Σ fromMagazines + extras[id].count
 *   収録リストを別に手書きしないのは、それ自体が第 4 のドリフト源になるため。
 *
 * 束ね商品の包含（軸 D・2026-09-25 追加）:
 *   二次検定まるごとパック（¥11,800）は「完全攻略パックの全模範答案」を約束していたのに、
 *   完全攻略パックへ 8/20 に足した工事101〜150 などが入っていなかった（169 本中 101 本）。
 *   8/24 に fromMagazines へ実測の **本数 101** を書いたため、欠けたまま「期待どおり」になり
 *   購入者の指摘まで 1 か月緑だった。本数は「どの記事か」を見ないので、欠けを正解として凍結しうる。
 *   そこで fromMagazines の値を 2 種に分ける:
 *     "all"   … 構成元を丸ごと同梱。期待数は構成元の期待数を引き継ぎ、ライブで
 *                **構成元の全記事 key ⊆ パックの記事 key** を照合する（本数一致では済ませない）。
 *     整数 N  … 選抜同梱。pack.partialReason（なぜ一部なのか）が必須で、毎回「実包含 k/全 n」を表示する。
 *   labels が別マガジンに対応するパック（総監 完全パック等）も、その構成マガジンとの包含を照合する。
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
 * exit: 0 合格 / 1 件数ズレ・包含漏れ / 2 検査不成立（設定破損・対象ゼロ・--ci で snapshot 腐敗）
 * 緊急回避: SKIP_MAGAZINE_MEMBERSHIP=1
 *
 * 真実源: .claude/config/note-magazine-membership.json
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeSync } from 'node:fs';
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

/**
 * 各マガジンの期待収録数を解決する（純関数・テストから使う）。
 *
 * fromMagazines の "all" は構成元の期待数（ラベル＋同梱＋extras）をそのまま引き継ぐ。
 * 構成元もパックであり得る（診断士 まるごと ← 記述式完全パック）ので再帰で解き、循環は例外にする。
 * "all" の構成元がどの分類にも無い＝期待数 0 を黙って足すことになるので例外にする。
 *
 * @returns Map<id, { repoCount, extra }>  repoCount はラベル集計＋fromMagazines 分
 */
export function computeExpected({ ids, idToLabels, byLabel, packs, extras }) {
  const known = new Set(ids);
  const memo = new Map();
  const visiting = new Set();
  const resolve = (id) => {
    if (memo.has(id)) return memo.get(id);
    if (visiting.has(id)) throw new Error(`fromMagazines が循環している: ${[...visiting, id].join(' → ')}`);
    visiting.add(id);
    let repoCount = (idToLabels.get(id) ?? []).reduce((a, l) => a + (byLabel.get(l) ?? 0), 0);
    for (const [srcId, v] of Object.entries(packs[id]?.fromMagazines ?? {})) {
      if (v === 'all') {
        if (!known.has(srcId)) throw new Error(`packs["${id}"].fromMagazines["${srcId}"]="all" だが、構成元がどの分類にも無い（期待数を引き継げない）`);
        const src = resolve(srcId);
        repoCount += src.repoCount + src.extra;
      } else if (Number.isInteger(v) && v >= 0) {
        repoCount += v;
      } else {
        throw new Error(`packs["${id}"].fromMagazines["${srcId}"] は "all" か 0 以上の整数（実値: ${JSON.stringify(v)}）`);
      }
    }
    visiting.delete(id);
    const out = { repoCount, extra: extras[id]?.count ?? 0 };
    memo.set(id, out);
    return out;
  };
  return new Map(ids.map((id) => [id, resolve(id)]));
}

/**
 * 構成元の記事のうちパックに無いものを返す（純関数・テストから使う）。
 * 本数ではなく key の集合で比べる。本数一致は「別の記事が同数入っている」を見逃す。
 */
export function findMissing(srcNotes, packNotes) {
  const have = new Set(packNotes.map((n) => n.key));
  return srcNotes.filter((n) => !have.has(n.key));
}

/**
 * パックが丸ごと含むべき構成マガジン id の一覧（純関数・テストから使う）。
 * fromMagazines の "all" と、labels のうち別マガジンに対応するもの（labelMap 経由）。
 */
export function inclusionSources(id, pack, labelMap) {
  const fromAll = Object.entries(pack?.fromMagazines ?? {}).filter(([, v]) => v === 'all').map(([k]) => k);
  const viaLabels = (pack?.labels ?? []).map((l) => labelMap[l]).filter((x) => x && x !== id);
  return [...new Set([...fromAll, ...viaLabels])];
}

function relevantStaged() {
  let changed = '';
  try {
    changed = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACMRD'], {
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
  // 選抜同梱（整数）は「なぜ一部なのか」の宣言を必須にする。書けない＝本当は丸ごと同梱すべき商品。
  for (const [id, pack] of Object.entries(packs)) {
    const partial = Object.entries(pack.fromMagazines ?? {}).filter(([, v]) => v !== 'all');
    if (partial.length && !(typeof pack.partialReason === 'string' && pack.partialReason.length >= 10)) {
      fail(`packs["${id}"] は ${partial.map(([k]) => k).join(', ')} を本数指定（選抜同梱）しているのに partialReason が無い。丸ごと同梱なら "all" にする`);
    }
  }

  // --- 軸 C: ライブ snapshot（オフライン読取・鮮度で足切り） ---
  let live = null;
  let liveNotes = null; // key → notes[]（軸 D 用）
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
        liveNotes = new Map();
        for (const m of snap.magazines ?? []) {
          if (m.key && Array.isArray(m.notes)) {
            live.set(m.key, m.notes.length);
            liveNotes.set(m.key, m.notes);
          }
        }
        if (live.size === 0) freshness = { ok: false, reason: 'snapshot に notes[] が無い（--contents 無しで生成された）', ageDays: freshness.ageDays };
        if (!freshness.ok) { live = null; liveNotes = null; }
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

  // fromMagazines だけで構成する選抜パックも検査対象に含める。pack.labels が空でも、
  // 構成元の部分収録数とライブ件数を突合できる。
  const gatedIds = [...new Set([...idToLabels.keys(), ...Object.keys(packs), ...Object.keys(extras)])];
  if (gatedIds.length === 0) fail('ゲート対象のマガジンが 0 件');

  for (const [id, pack] of Object.entries(packs)) {
    for (const srcId of Object.keys(pack.fromMagazines ?? {})) {
      if (!sot[srcId]) fail(`packs["${id}"].fromMagazines の "${srcId}" が note-magazines.ts に無い`);
    }
  }
  // 丸ごと同梱（"all"）は構成元の期待数を引き継ぐ。選抜同梱（整数）は partialReason 付きの実数。
  let expectedById;
  try {
    expectedById = computeExpected({ ids: gatedIds, idToLabels, byLabel, packs, extras });
  } catch (e) { fail(e.message); }

  const rows = gatedIds.map((id) => {
    const entry = sot[id];
    const liveCount = live && entry?.key ? (live.get(entry.key) ?? null) : null;
    return auditMagazine({
      id, labels: idToLabels.get(id) ?? [], repoCount: expectedById.get(id).repoCount,
      extra: extras[id], entry, liveCount,
    });
  }).sort((a, b) => a.id.localeCompare(b.id));
  const bad = rows.filter((r) => !r.ok);

  // --- 軸 D: 束ね商品の包含（ライブの記事 key 集合で照合） ---
  const inclusion = [];   // { pack, src, srcCount, missing[] }
  const partials = [];    // 選抜同梱の実包含（非ゲート・表示用）
  const inclusionUnverified = [];
  const liveOf = (id) => (liveNotes && sot[id]?.key ? liveNotes.get(sot[id].key) ?? null : null);
  if (liveNotes) {
    for (const [id, pack] of Object.entries(packs)) {
      const packNotes = liveOf(id);
      for (const srcId of inclusionSources(id, pack, labelMap)) {
        const srcNotes = liveOf(srcId);
        if (!packNotes || !srcNotes) { inclusionUnverified.push(`${id} ⊇ ${srcId}`); continue; }
        inclusion.push({ pack: id, src: srcId, srcCount: srcNotes.length, missing: findMissing(srcNotes, packNotes) });
      }
      for (const [srcId, n] of Object.entries(pack.fromMagazines ?? {})) {
        if (n === 'all') continue;
        const srcNotes = liveOf(srcId);
        if (!packNotes || !srcNotes) continue;
        partials.push({ pack: id, src: srcId, config: n, included: srcNotes.length - findMissing(srcNotes, packNotes).length, total: srcNotes.length });
      }
    }
  }
  const leaks = inclusion.filter((r) => r.missing.length);
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

  // 軸 D の実検査数を必ず出す（ライブが無い文脈では「未検査」と明示する）
  say(`  軸D(包含): ${liveNotes
    ? `束ね ${inclusion.length} 組を記事 key で照合 / 漏れ ${leaks.length} 組${inclusionUnverified.length ? ` / **照合不能 ${inclusionUnverified.length} 組**` : ''}`
    : '**未検査** — ライブ snapshot を使えない文脈'}`);
  for (const r of inclusion) {
    say(`  ${r.missing.length ? '✗' : '✓'} ${r.pack} ⊇ ${r.src}  ${r.srcCount - r.missing.length}/${r.srcCount}`);
  }
  for (const p of partials) {
    say(`  ~ ${p.pack} ← ${p.src}  選抜同梱 ${p.included}/${p.total}（config ${p.config}・非ゲート）`);
  }

  if (jsonOut) {
    // 同期で書く: 直後の process.exit(1) でパイプへの非同期書き込みが途中で捨てられ、管理画面の JSON.parse が壊れていた（2026-09-26）
    writeSync(1, `${JSON.stringify({
      articles: files.length, labels: Object.keys(labelMap).length, magazines: rows.length,
      freshness: { ...freshness, fetchedAt }, rows, violations: bad,
      inclusion: { checked: inclusion.length, leaks, unverified: inclusionUnverified, partials },
      unclassified: unclassified.map(([label, count]) => ({ label, count })), unreferenced,
    }, null, 2)}\n`);
  }

  if (ci && inclusionUnverified.length) {
    console.error(`\n[check-magazine-membership] ✗ 包含を照合できない束ね ${inclusionUnverified.length} 組（snapshot にパックか構成元が無い）: ${inclusionUnverified.join(', ')}`);
    process.exit(1);
  }
  if (leaks.length) {
    console.error(`\n[check-magazine-membership] ✗ 束ね商品の包含漏れ ${leaks.length} 組（構成元にあってパックに無い記事）`);
    for (const r of leaks) {
      console.error(`  ${r.pack} ⊇ ${r.src}: 漏れ ${r.missing.length} 本`);
      for (const n of r.missing.slice(0, 10)) console.error(`    - ${n.key}  ${n.name ?? ''}`);
      if (r.missing.length > 10) console.error(`    … ほか ${r.missing.length - 10} 本`);
    }
    console.error(`\n  追加: node scripts/note-magazine-add-articles.mjs --target <パックの m…> --from <構成元の m…> --commit（差分だけ足す・冪等）`
      + '\n  そのあと npm run verify-note-magazines -- --contents --json で snapshot を再生成して commit する。'
      + '\n  意図して一部だけ同梱するなら、config の fromMagazines を本数にして partialReason を書く。');
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
    if (leaks.length) process.exit(1);
    say('[check-magazine-membership] ✓ 期待収録数と SoT 表記'
      + (freshness.ok ? '・ライブ収録数・束ね商品の包含' : '') + 'は一致');
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
