/**
 * check-note-live-headings の検査対象選定を固定する。
 *
 * 背景（2026-09-18）: 予約投稿（noteStatus: reserved）は note-publish --schedule の書き戻しで
 * noteUrl / noteId を持つが go-live 前で、公開 API は本文を返さない。従来の公開判定
 * 「noteUrl 非空 OR noteStatus に publish」は reserved も対象にしてしまい、W8〜W11 の 4 本が
 * 「画像欠落 live=0/sot=1」の偽赤になって note-live-audit.yml が 2 週連続で落ちた。
 *
 * 守ること: reserved は対象外（件数を明示して沈黙させない）・published と noteUrl 持ちは対象。
 * 実装は走査ループ内の正規表現なので、ソースの契約として固定する（live 取得を伴うため実走はしない）。
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'scripts/check-note-live-headings.mjs'), 'utf8');

test('reserved（予約中）を live 検査の対象から外し、件数を出力している', () => {
  assert.match(SRC, /noteStatus:\\s\*reserved\\b\/m\.test\(fm\)\)\s*\{\s*reserved\+\+;\s*continue;/, 'reserved を skip する分岐が無い');
  assert.match(SRC, /予約中 \$\{reserved\} 件/, '予約中の件数を出力していない（無言の skip は §9 違反）');
});

test('公開判定は従来どおり「noteUrl 非空 OR noteStatus に publish」を保つ', () => {
  // 2026-07-31 の回帰（noteStatus 行を持たない公開済み 351 本を無言でスキップ）を再発させない。
  assert.match(SRC, /\^noteUrl:\\s\*\\S\/m\.test\(fm\)\s*&&\s*!\/noteStatus:\.\*publish\/\.test\(fm\)\)\s*continue/);
});

test('reserved の skip は公開判定の後・noteId 抽出の前にある（順序の契約）', () => {
  const publishGate = SRC.indexOf("!/noteStatus:.*publish/.test(fm)) continue;");
  const reservedSkip = SRC.indexOf('reserved++; continue;');
  const noteIdMatch = SRC.indexOf('fm.match(/noteId:');
  assert.ok(publishGate > 0 && reservedSkip > publishGate && noteIdMatch > reservedSkip, '公開判定 → reserved skip → noteId 抽出 の順になっていない');
});
