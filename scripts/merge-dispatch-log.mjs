#!/usr/bin/env node
/**
 * merge-dispatch-log.mjs — .claude/state/dispatch/dispatch-log.json 用の git merge driver（DN-0635）。
 *
 * なぜ: todo:complete はどのブランチでも entries の末尾に記録を足すので、並行 PR は必ず末尾で衝突する。
 * 毎回「develop の並び＋ブランチだけの記録を末尾」の同じ手作業で解消していた。それを機械にする。
 *
 * 使い方（git が呼ぶ）: node scripts/merge-dispatch-log.mjs %O %A %B
 *   %O=共通の祖先 %A=こちら側（結果の書き先） %B=取り込む側。
 * 規則: こちら側の並びを保ち、取り込む側だけにある記録（id・at・task が一致するものは同じ記録）を末尾に足す。
 * 合わせられないとき（JSON が壊れている・取り込む側が祖先の記録を消している・entries 以外の欄を両側が別々に変えた）は
 * 何も書かず exit 1 にして、通常の衝突として止める。黙って片方を捨てない。
 *
 * 登録は scripts/install-pre-commit.mjs（git config merge.dispatch-log.driver）、対象は .gitattributes。依存ゼロ。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { formatJson, parseJson } from './lib/json-io.mjs';

const keyOf = (e) => JSON.stringify([e?.id ?? null, e?.at ?? null, e?.task ?? null]);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** 3 者の dispatch-log（オブジェクト）を合わせる。合わせられなければ { conflict: 理由 } */
export function mergeDispatchLog(base, ours, theirs) {
  for (const [name, v] of [['base', base], ['ours', ours], ['theirs', theirs]]) {
    if (!v || typeof v !== 'object' || !Array.isArray(v.entries)) return { conflict: `${name}: entries 配列が無い` };
  }
  const oursKeys = new Set(ours.entries.map(keyOf));
  const baseKeys = new Set(base.entries.map(keyOf));
  const theirsKeys = new Set(theirs.entries.map(keyOf));
  for (const k of baseKeys) {
    if (oursKeys.has(k) && !theirsKeys.has(k)) return { conflict: '取り込む側が祖先の記録を消している' };
  }
  const merged = { ...ours };
  const fields = new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)]);
  for (const f of fields) {
    if (f === 'entries') continue;
    if (same(ours[f], theirs[f])) continue;
    if (same(ours[f], base[f])) {
      if (f in theirs) merged[f] = theirs[f];
      else delete merged[f];
    } else if (!same(theirs[f], base[f])) {
      return { conflict: `「${f}」を両側が別々に変えている` };
    }
  }
  const seen = new Set(oursKeys);
  const added = [];
  for (const e of theirs.entries) {
    const k = keyOf(e);
    if (seen.has(k) || baseKeys.has(k)) continue; // 同じ記録、またはこちらが消した祖先の記録は足さない
    seen.add(k);
    added.push(e);
  }
  merged.entries = [...ours.entries, ...added];
  return { merged };
}

function main() {
  const [basePath, oursPath, theirsPath] = process.argv.slice(2);
  if (!basePath || !oursPath || !theirsPath) {
    console.error('使い方: node scripts/merge-dispatch-log.mjs <base> <ours> <theirs>');
    return 1;
  }
  try {
    const r = mergeDispatchLog(
      parseJson(readFileSync(basePath, 'utf8'), 'base'),
      parseJson(readFileSync(oursPath, 'utf8'), 'ours'),
      parseJson(readFileSync(theirsPath, 'utf8'), 'theirs'),
    );
    if (r.conflict) {
      console.error(`merge-dispatch-log: 自動で合わせられない（${r.conflict}）。手で解消する`);
      return 1;
    }
    writeFileSync(oursPath, formatJson(r.merged));
    return 0;
  } catch (e) {
    console.error(`merge-dispatch-log: ${e.message}。手で解消する`);
    return 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main());
