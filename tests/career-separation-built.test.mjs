// check-career-separation --built の走査先と「検査ゼロ」の扱いを固定する。
//
// なぜ: 公開 URL を /docs/* から /exam/ /practice/ /standards/ /topics/ へ分割した際、
// --built 経路が out/docs を見たまま取り残された。ディレクトリが無いので exit 1 で即死し、
// ビルド後の混入検査が 1 箇所も走らない状態が続いていた（2026-09-22 に発見）。
// 同じ取り残しが再発したときに、ここで落ちるようにする。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('scripts/check-career-separation.mjs', 'utf8');

test('--built の走査先は現行の 4 領域で、廃止した out/docs を見ていない', () => {
  for (const area of ['exam', 'practice', 'standards', 'topics']) {
    assert.ok(
      SRC.includes(`'${area}'`),
      `走査先に ${area} が含まれていない（URL 体系の変更に追随できていない）`,
    );
  }
  assert.ok(
    !SRC.includes("path.join(ROOT, 'out/docs')"),
    '廃止した out/docs を走査先にしている（2026-09 の URL 移行で存在しない）',
  );
});

test('ナビの href 照合が正規 URL 体系を受けている', () => {
  assert.ok(
    /href="\\\/\(\?:exam\|practice\|standards\|topics\)/.test(SRC),
    'href の正規表現が /docs/ 前提のままになっている',
  );
  assert.ok(
    SRC.includes("x[1].split('/').join('-')"),
    'パス階層をフラット slug へ繋ぎ直す処理が無い（台帳と突き合わせできない）',
  );
});

test('検査ゼロ（ナビ一覧 0 件）は PASS ではなく検査不成立', () => {
  const i = SRC.indexOf('listsFound === 0');
  assert.ok(i > 0, 'listsFound === 0 の分岐が無い');
  const block = SRC.slice(i, i + 600);
  assert.ok(
    block.includes('process.exit(1)'),
    '0 件のときに exit 1 していない（「混入なし」と「1 箇所も見ていない」が同じ緑になる）',
  );
});

// ---- career 記事に note 二次 CTA を出さない配線 ------------------------------
//
// なぜ: 「学習意図＝note／キャリア意図＝転職アフィリ」の分離は 2026-07-01 の方針だが、
// 実装は civil-construction-1/2 の slug 接頭辞でしか判定していなかった。2026-09-22 に
// rccm-guide-career-value を新設したところ、記事冒頭に rccm-marugoto-pack が出た。
// 判定を真実源（tags: career）へ寄せた回帰を固定する。

test('resolvePlacement は career 記事へ note CTA を返さない（入口 1 箇所で止める）', () => {
  const SRC_MP = readFileSync('src/lib/magazine-placement.ts', 'utf8');
  const sig = SRC_MP.indexOf('export function resolvePlacement');
  assert.ok(sig > 0, 'resolvePlacement が見つからない');
  const head = SRC_MP.slice(sig, sig + 1600);
  assert.ok(head.includes('isCareer'), 'resolvePlacement が isCareer を受けていない');
  assert.ok(
    /if \(isCareer\) return EMPTY;/.test(head),
    'career のとき EMPTY を返す早期 return が無い（カテゴリ既定の配線へ素通りする）',
  );
});

test('note CTA を描画する呼び出し側が career 判定を渡している', () => {
  const DOCPAGE = readFileSync('src/components/docs/DocPage.tsx', 'utf8');
  assert.ok(
    /resolvePlacement\(\s*slugStr,\s*docGroup,\s*isCareerDoc\(doc\.meta\)\s*\)/.test(DOCPAGE),
    'DocPage が isCareerDoc を渡していない（career 記事に note CTA が出る）',
  );
  const REACH = readFileSync('scripts/check-magazine-cta-reachability.ts', 'utf8');
  assert.ok(
    REACH.includes('d.isCareer'),
    '到達性チェッカーが career を考慮していない（出ない CTA を「導線あり」と数える）',
  );
});
