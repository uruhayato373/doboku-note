/**
 * note カバーの参照契約（DN-0111 Phase 2 / 4-B）。
 *
 * 守りたい事故:
 *   generate-note-covers は同じ描画結果を SVG と PNG の両方へ書いていた。V4 の SVG は背景写真を
 *   data:image base64 で丸ごと内包するため 1 枚 1.5〜2.6 MiB あり、827 件 1,288.6 MiB（HEAD の 31%）を
 *   追跡していた。読むコードは 1 行も無く（note-publish / note-update-cover / note-cover-gallery /
 *   note-lint / check-note-cover-fit / check-note-3set は全て cover*.png のみ）、R2 にも無い。
 *   2026-08-21 に生成停止＋追跡解除した。
 *
 * ここで固定するのは 2 点:
 *   1. cover*.svg が二度と追跡に戻らないこと（生成器の revert・手置き・別スクリプトの追加、どれでも落ちる）
 *   2. note-publish が解決するカバー PNG が全記事で解決でき 1280×670 であること
 *
 * Phase 4-B で cover PNG は R2 へ退避して追跡から外した。以後 CI のツリーには実体が無い。
 * そこで解決先を「ローカル実体 **または** manifest エントリ」に広げる。ただし
 * **寸法検査を「ローカルに在る分だけ」にはしない** —— 全件退避した瞬間に 0 件検査の緑になるからだ
 * （CLAUDE.md §9）。退避時に実バイトのヘッダから測った width/height が manifest に載っているので、
 * 実体が無い分はその記録を検査する。sha256 が同じである限り記録は実体の性質を指し続ける。
 *
 * 判定の実装は scripts/check-note-cover-coverage.mjs（CLI。note-cover-supply.yml が --json で
 * 欠落 dir を拾って CI で供給する）にあり、ここはその結果を unit-tests の形で固定する。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  auditNoteCovers,
  resolveCover,
  trackedNoteFiles,
  MIN_ARTICLES,
  MIN_RESOLVED,
} from '../scripts/check-note-cover-coverage.mjs';

test('cover*.svg は 1 件も追跡されていない（生成停止の回帰ゲート）', () => {
  const files = trackedNoteFiles();
  assert.ok(files.length > 100, '追跡 note ファイルが取れていない＝検査不成立（' + files.length + ' 件）');
  const svgs = files.filter((p) => /\/img\/cover[A-Za-z0-9_-]*\.svg$/.test(p));
  assert.deepEqual(
    svgs.slice(0, 5), [],
    'cover*.svg が追跡に戻っている（' + svgs.length + ' 件）。generate-note-covers は PNG のみを出力し、'
    + '中間 SVG は --emit-svg で .tmp/note-covers/ へ出す。.gitignore の content/note/**/img/cover*.svg も確認すること。',
  );
});

test('図版 SVG（figure-*）は巻き込まれず追跡されたままである', () => {
  // .gitignore のパターンが広すぎて figure-*.svg まで外していないかを見る。
  // note の図版は本文が参照する原本で、消えると記事が壊れる。
  const figures = trackedNoteFiles().filter((p) => /\/img\/figure-[^/]*\.svg$/.test(p));
  assert.ok(figures.length > 0, 'note の figure-*.svg が 1 件も追跡されていない＝ignore が広すぎる疑い');
});

test('全 note 記事でカバー PNG が解決でき、1280×670 である', () => {
  const r = auditNoteCovers();
  assert.ok(r.checked > MIN_ARTICLES, '記事が取れていない＝検査不成立（' + r.checked + ' 件）');

  // 検査ゼロを PASS と呼ばない（CLAUDE.md §9）。
  // ローカル実体が 0 件でも manifest 経由で全件検査していれば成立する。両方 0 なら不成立。
  const resolved = r.localCount + r.manifestCount;
  assert.ok(
    resolved > MIN_RESOLVED,
    '解決できたカバーが ' + resolved + ' 件しかない＝検査不成立'
    + '（ローカル ' + r.localCount + ' / manifest ' + r.manifestCount + '）',
  );
  assert.deepEqual(
    r.missing.slice(0, 5).map((m) => m.article), [],
    'カバーがローカルにも manifest にも無い記事がある（' + r.missing.length + ' 件）。'
    + 'develop へ push されれば note-cover-supply.yml が生成→R2→manifest まで供給する。'
    + 'ローカルで先に通すなら generate-note-covers → asset-offload --group note-cover-png --include-untracked --commit',
  );
  assert.deepEqual(r.notPng.slice(0, 5), [], '拡張子が .png なのに PNG ではないカバーがある（' + r.notPng.length + ' 件）');
  assert.deepEqual(r.noProof.slice(0, 5), [], '退避済みだが sha256/bytes/寸法の記録が欠けたカバーがある（' + r.noProof.length + ' 件）');
  assert.deepEqual(r.wrongSize.slice(0, 5), [], 'note 推奨の 1280×670 でないカバーがある（' + r.wrongSize.length + ' 件）');
});

test('型別カバー（article-XXX.md → cover-XXX.png）の解決が働いている', () => {
  // 選択科目型（article-II1.md 等）は 195 件ある。フォールバックだけで通ってしまうと
  // 「全部 cover.png に落ちている」状態を緑と誤認するので、型別が実際に解決していることを見る。
  const articles = trackedNoteFiles().filter((p) => /\/article-[A-Za-z0-9][A-Za-z0-9-]*\.md$/.test(p));
  assert.ok(articles.length > 0, '型別 article が 1 件も無い＝検査不成立');
  const typed = articles.filter((a) => {
    const c = resolveCover(a);
    return c && /\/cover-[A-Za-z0-9-]+\.png$/.test(c.path);
  });
  assert.ok(
    typed.length > articles.length * 0.8,
    '型別 article ' + articles.length + ' 件のうち型別カバーへ解決したのは ' + typed.length + ' 件だけ',
  );
});

test('missing[].dir は generate-note-covers の dir 名（content/note 相対 posix）と一致する形で返る', () => {
  // note-cover-supply.yml は missing[].dir をそのまま generate-note-covers.mjs に渡す。
  // 部分一致で別 dir まで生成しないよう、完全一致する relDir 形式であることを固定する。
  // 実在しない dir を使う（実在 dir だとローカルに生成済みカバーが残っていると resolve できてしまう）。
  const manifest = { entries: {} };
  const files = [
    'content/note/技術士総監/__fixture-記事__/article.md',
    'content/note/技術士建設部門/magazines/__fixture-R99__/article-II1.md',
  ];
  const r = auditNoteCovers({ manifest, files });
  assert.equal(r.checked, 2);
  assert.deepEqual(r.missing, [
    {
      article: files[0],
      dir: '技術士総監/__fixture-記事__',
      cover: 'content/note/技術士総監/__fixture-記事__/img/cover.png',
    },
    {
      article: files[1],
      dir: '技術士建設部門/magazines/__fixture-R99__',
      cover: 'content/note/技術士建設部門/magazines/__fixture-R99__/img/cover-II1.png',
    },
  ]);
});
