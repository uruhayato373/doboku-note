// check-local-data.mjs — 手元にしか無い正本をなくす（正本: obsidian memos/ローカルデータ方針SSOT.md）。
// obsidian から sync.mjs と一緒に stats47 / doboku-note へ配布する。消費側で手編集しない。
//
// git の外にあるファイル（git ls-files --others --ignored）を、そのリポが
// .claude/shared-policy/local-data.json に申告した5区分と突き合わせる。
//   申告に無いパス            → 失敗（置き場が決まっていない手元データ）
//   staging の上限日数超え     → 警告
//   offloaded                → 台帳の検査コマンドを表示するだけ（照合は各リポの検査）
//
// 使い方: node .claude/shared-policy/check-local-data.mjs [--root <repo>] [--quiet]
// exit 0 = 全部申告済み / exit 1 = 申告外あり・設定の誤り
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CLASSES = ['regenerable', 'offloaded', 'device', 'secret', 'staging'];
const CONFIG = '.claude/shared-policy/local-data.json';
const DAY = 86400000;
const Y2000 = Date.UTC(2000, 0, 1);

/** glob → 正規表現。`**\/` は0階層以上、`**` は何でも、`*` は1階層内。末尾 `/` はそのディレクトリ以下すべて */
export function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') { out += '(?:.*/)?'; i += 2; } else { out += '.*'; i += 1; }
    } else if (c === '*') out += '[^/]*';
    else if (c === '?') out += '[^/]';
    else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${out}${glob.endsWith('/') ? '.*' : '(?:/.*)?'}$`);
}

/** 申告を { cls, path, maxAgeDays, ledger, re } の配列に正規化する。形の誤りは例外 */
export function loadRules(config) {
  const rules = [];
  for (const key of Object.keys(config)) {
    if (key.startsWith('$')) continue; // $comment など
    if (!CLASSES.includes(key)) throw new Error(`${CONFIG}: 未知の区分 "${key}"（${CLASSES.join(' / ')}）`);
    for (const entry of config[key]) {
      const rule = typeof entry === 'string' ? { path: entry } : { ...entry };
      if (!rule.path) throw new Error(`${CONFIG}: ${key} に path の無い項目`);
      if (key === 'staging' && !(rule.maxAgeDays > 0)) throw new Error(`${CONFIG}: staging "${rule.path}" に maxAgeDays が無い`);
      rules.push({ cls: key, ...rule, re: globToRegExp(rule.path) });
    }
  }
  return rules;
}

/** 当たる申告のうち一番細かい（パスの長い）もの。書き順に左右されない */
const matchRule = (rules, path) => rules.filter((r) => r.re.test(path)).sort((a, b) => b.path.length - a.path.length)[0];
/** ディレクトリ D の中を指す申告があるか（D 自体は申告に無いが、中身を個別に申告している） */
const hasRulesInside = (rules, dir) => rules.some((r) => r.path.startsWith(dir) && r.path !== dir);

function walkFiles(abs, rel, out, limit = 200000) {
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    if (out.length >= limit) return out;
    const childRel = `${rel}${e.name}${e.isDirectory() ? '/' : ''}`;
    if (e.isDirectory()) walkFiles(join(abs, e.name), childRel, out, limit);
    else out.push(childRel);
  }
  return out;
}

/** git の外のパス（ディレクトリはまとめて1行）を申告と突き合わせる */
export function classify(root, rules, ignored, now = Date.now()) {
  const result = { counts: Object.fromEntries(CLASSES.map((c) => [c, 0])), unmatched: [], stale: [], ledgers: new Set() };
  const take = (path) => {
    // ディレクトリごと無視されていても、中に個別の申告があれば中を1段ずつ見る（例: .local/ は staging、
    // その中の .local/playwright-*/ は device）。ディレクトリ自体の申告は、個別に当たらない残りに効く
    if (path.endsWith('/') && hasRulesInside(rules, path)) {
      for (const e of readdirSync(join(root, path), { withFileTypes: true })) take(`${path}${e.name}${e.isDirectory() ? '/' : ''}`);
      return;
    }
    const rule = matchRule(rules, path);
    if (!rule) { result.unmatched.push(path); return; }
    result.counts[rule.cls]++;
    if (rule.cls === 'offloaded' && rule.ledger) result.ledgers.add(rule.ledger);
    if (rule.cls === 'staging') {
      const abs = join(root, path);
      const files = path.endsWith('/') ? walkFiles(abs, path, [], 5000) : [path];
      for (const f of files) {
        try {
          const { mtimeMs } = statSync(join(root, f));
          // zip 展開などで時刻が 1970 年のままのファイルは「日付不明」。古さの順に混ぜない
          if (mtimeMs < Y2000) { result.stale.push({ path: f, days: null, limit: rule.maxAgeDays }); continue; }
          const age = (now - mtimeMs) / DAY;
          if (age > rule.maxAgeDays) result.stale.push({ path: f, days: Math.floor(age), limit: rule.maxAgeDays });
        } catch { /* 走査中に消えた */ }
      }
    }
  };
  for (const path of ignored) take(path);
  return result;
}

export function listIgnored(root) {
  return execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '--others', '--ignored', '--exclude-standard', '--directory'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\n').map((s) => s.trim()).filter(Boolean);
}

function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--root');
  const root = i >= 0 ? resolve(args[i + 1]) : resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const configPath = join(root, CONFIG);
  if (!existsSync(configPath)) throw new Error(`${configPath} が無い。git の外に置くパスを区分ごとに申告する（正本: ローカルデータ方針SSOT §3）`);
  const rules = loadRules(JSON.parse(readFileSync(configPath, 'utf8')));
  const r = classify(root, rules, listIgnored(root));
  const name = root.split(/[\\/]/).pop();
  const summary = CLASSES.map((c) => `${c} ${r.counts[c]}`).join('・');
  if (r.stale.length) {
    r.stale.sort((a, b) => (b.days ?? -1) - (a.days ?? -1));
    console.log(`注意 ${name}: staging の上限日数を過ぎたファイルが ${r.stale.length} 件（置き場へ移すか消す）`);
    for (const s of r.stale.slice(0, 5)) console.log(`  ${s.path}（${s.days === null ? '日付不明' : s.days + '日'}・上限${s.limit}日）`);
  }
  for (const l of r.ledgers) if (!args.includes('--quiet')) console.log(`  offloaded の照合は ${l}`);
  if (r.unmatched.length) {
    console.error(`✗ ${name}: 申告に無い手元データが ${r.unmatched.length} 件（${CONFIG} に区分を書くか、置き場へ移す）`);
    for (const u of r.unmatched.slice(0, 30)) console.error(`  ${u}`);
    if (r.unmatched.length > 30) console.error(`  …ほか ${r.unmatched.length - 30} 件`);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ ${name}: 手元データは全部申告済み（${summary}）`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
