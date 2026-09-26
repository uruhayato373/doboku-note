#!/usr/bin/env node
/**
 * roll-backlog-when.mjs — 終わらなかったカードを翌月へ回す（[時期:] の終わりを今月へ延ばす）
 * ---------------------------------------------------------------------------
 * 月間は [時期:] が今月を含むカードから導出する。月の枚数は絞らず、終わらなかったカードは翌月へ回す
 * （2026-09-26 のユーザー方針）。[時期:] の終わりの月が今月より前のカードを、開始はそのままに終わりを今月へ延ばす。
 *   [時期:2026-09]          → [時期:2026-09..2026-10]（今月が 2026-10 のとき）
 *   [時期:2026-08..2026-09] → [時期:2026-08..2026-10]
 * 開始を残すのは、いつから持ち越しているかをカード上で見えるようにするため。
 * 終わったカードは回さずに削除する（完了はセクションごと削除＝backlog.md 冒頭の規約）。
 *
 *   npm run roll-backlog-when              # 回す候補を表示するだけ（書かない）
 *   npm run roll-backlog-when -- --write   # backlog.md を書き換える
 *   npm run roll-backlog-when -- --month 2026-11   # 基準月を指定（既定は JST の今月）
 * 月初の月次レビュー（/monthly-review 手順 8）が回す。check-backlog-health の S15 が候補を知らせる。
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBacklog, parseWhen } from './lib/backlog-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKLOG = join(ROOT, '.claude/todo/backlog.md');

/**
 * backlog.md の本文で、[時期:] の終わりが thisMonth より前のカードの終わりを thisMonth へ延ばす。
 * @returns {{ text: string, rolled: Array<{ id: string|null, from: string, to: string, title: string }> }}
 */
export function rollPastWhen(text, thisMonth) {
  const lines = text.split('\n');
  const rolled = [];
  for (const c of parseBacklog(text)) {
    const w = c.when ? parseWhen(c.when) : null;
    if (!w || w.end >= thisMonth) continue;
    const to = `${w.start}..${thisMonth}`;
    for (let i = c.startLine ?? c.line - 1; i < (c.endLine ?? lines.length); i++) {
      if (!lines[i].startsWith('タグ:')) continue;
      const next = lines[i].replace(`[時期:${c.when}]`, `[時期:${to}]`);
      if (next !== lines[i]) {
        lines[i] = next;
        rolled.push({ id: c.id, from: c.when, to, title: c.title });
      }
      break;
    }
  }
  return { text: lines.join('\n'), rolled };
}

function main() {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--month') i++;
    else if (argv[i] !== '--write') {
      console.error(`ERROR: 未知の引数 ${argv[i]}（--write / --month YYYY-MM）`);
      process.exit(2);
    }
  }
  const mi = argv.indexOf('--month');
  const thisMonth = mi >= 0 ? argv[mi + 1] : new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(thisMonth ?? '')) {
    console.error('ERROR: --month は YYYY-MM');
    process.exit(2);
  }
  const src = readFileSync(BACKLOG, 'utf8');
  const cards = parseBacklog(src);
  if (cards.length === 0) {
    console.error('[roll-backlog-when] 検査不成立: カードを 1 件も読めなかった');
    process.exit(1);
  }
  const { text, rolled } = rollPastWhen(src, thisMonth);
  console.log(`[roll-backlog-when] 基準月 ${thisMonth} / カード ${cards.length} 件を検査 / 翌月へ回す ${rolled.length} 件`);
  for (const r of rolled) console.log(`  ${r.id ?? '(ID無し)'} [時期:${r.from}] → [時期:${r.to}] ${r.title.slice(0, 50)}`);
  if (argv.includes('--write') && rolled.length) {
    writeFileSync(BACKLOG, text);
    console.log('[roll-backlog-when] backlog.md を書き換えた。終わっているカードは回さずに削除すること');
  } else if (rolled.length) {
    console.log('  （書き込みは --write）');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
