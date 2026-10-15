#!/usr/bin/env node
/**
 * check-agent-config.mjs — .claude/config/ の JSON をすべて型で検査し、型の無い JSON を止める（DN-0524・案B）。
 *
 * なぜ要るか: config/・data/ は台帳（datasets.mjs）と型で守られているが、.claude/config/ は台帳の外で型が無かった。
 * ここには認証の許可リスト（playwright-auth-profiles.json・管理画面 /ops/auth が読む）や CI の書き込み許可
 * （ci-write-operations.json）があり、壊れるとログインや書き戻しが黙って止まる。
 * 型は scripts/lib/dataset-schemas-agent-config.mjs の AGENT_CONFIG_SCHEMAS（ファイル名 → 型）。
 *
 * 使い方: npm run check-agent-config
 * 終了コード: 0 = 違反なし / 1 = 型の違反・型の無い JSON・読めない JSON がある / 2 = 検査対象が 0 件（検査不成立）
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isCliEntry } from './lib/cli-run.mjs';
import { parseJson } from './lib/json-io.mjs';
import { AGENT_CONFIG_ROOT } from './lib/repository-paths.mjs';
import { AGENT_CONFIG_SCHEMAS } from './lib/dataset-schemas-agent-config.mjs';

const TAG = '[check-agent-config]';

/** 1 ファイルを検査して違反の文言を返す（純関数に近い形でテストが使う） */
export function checkAgentConfigFile(name, raw) {
  const schema = AGENT_CONFIG_SCHEMAS[name];
  if (!schema) return [`${name}: 型が無い（scripts/lib/dataset-schemas-agent-config.mjs の AGENT_CONFIG_SCHEMAS に足す）`];
  let value;
  try {
    value = parseJson(raw, name);
  } catch (e) {
    return [`${name}: JSON として読めない（${e.message}）`];
  }
  const r = schema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => `${name}: ${i.path.join('.') || '(全体)'}: ${i.message}`);
}

function main() {
  const files = readdirSync(AGENT_CONFIG_ROOT).filter((f) => f.endsWith('.json')).sort();
  if (files.length === 0) {
    console.error(`${TAG} .claude/config/ に JSON が 1 件も無い（検査不成立）`);
    return 2;
  }
  const errors = files.flatMap((f) => checkAgentConfigFile(f, readFileSync(join(AGENT_CONFIG_ROOT, f), 'utf8')));
  const stale = Object.keys(AGENT_CONFIG_SCHEMAS).filter((name) => !files.includes(name));
  console.log(`${TAG} .claude/config/ の JSON ${files.length} 件を実検査 / 型 ${Object.keys(AGENT_CONFIG_SCHEMAS).length} 件 / 違反 ${errors.length} 件`);
  for (const name of stale) console.log(`  ! ${name}: 型はあるがファイルが無い（消したなら型も消す）`);
  if (errors.length) {
    for (const e of errors) console.error(`  ✗ ${e}`);
    return 1;
  }
  console.log(`${TAG} ✓ すべて型に合う`);
  return 0;
}

if (isCliEntry(import.meta.url)) process.exitCode = main();
