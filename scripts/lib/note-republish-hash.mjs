// note 再公開ドリフト検出の共有ロジック（副作用なし・CLI から分離）。
// check-note-republish.mjs（surfacer）と note-publish.mjs / note-update-body.mjs（公開時記録）が共用。
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';

export const STATE = '.claude/state/note-republish-hashes.json';

// 公開実体に対応する本文ハッシュ。frontmatter を除いた本文を正規化して sha256(先頭16桁)。
// CTA マーカーは含めたまま（本文/CTA いずれの変更も要再公開として捕捉する）。
export function bodyHash(raw) {
  let s = raw.replace(/^﻿/, '');
  s = s.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  s = s.replace(/\r\n/g, '\n');
  s = s.split('\n').map((l) => l.replace(/\s+$/, '')).join('\n');
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  return createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
}

export function loadState() {
  if (!existsSync(STATE)) return { version: 1, hashes: {} };
  try { return JSON.parse(readFileSync(STATE, 'utf8')); } catch { return { version: 1, hashes: {} }; }
}
export function saveState(st) {
  mkdirSync(dirname(STATE), { recursive: true });
  writeFileSync(STATE, JSON.stringify(st, null, 2) + '\n');
}

// 公開/フル本文更新スクリプトが「live へ反映成功した」直後に呼ぶ。当該記事の現本文ハッシュを記録し in-sync 化。
// filePath = docs/note/.../article.md（リポジトリ相対）。best-effort（失敗しても公開処理は妨げない）。
// 注意: CTA だけを追記する note-append-cta は本文全体を反映しないため呼ばない（フル反映のみ in-sync 化）。
export function recordPublishedHash(filePath) {
  try {
    const key = String(filePath).replaceAll('\\', '/'); // Windows の \ を state キー(/)に正規化（重複キー防止）
    const raw = readFileSync(key, 'utf8');
    const st = loadState();
    st.hashes[key] = bodyHash(raw);
    st.updatedAt = new Date().toISOString().slice(0, 10);
    saveState(st);
    return true;
  } catch { return false; }
}
