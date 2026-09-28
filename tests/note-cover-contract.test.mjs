/**
 * note カバーの参照契約（DN-0111 Phase 2）。
 *
 * 守りたい事故:
 *   generate-note-covers は同じ描画結果を SVG と PNG の両方へ書いていた。V4 の SVG は背景写真を
 *   data:image base64 で丸ごと内包するため 1 枚 1.5〜2.6 MiB あり、827 件 1,288.6 MiB（HEAD の 31%）を
 *   追跡していた。読むコードは 1 行も無く、R2 にも無い。2026-08-21 に生成停止＋追跡解除した。
 *
 * ここで固定するのは、cover*.svg が二度と追跡に戻らないこと（生成器の revert・手置き・別スクリプトの追加、
 * どれでも落ちる）と、その ignore が図版 SVG を巻き込んでいないこと。
 *
 * カバー PNG が note に最新デザインで登録されているかは、手元の実体ではなく note の公開 API と台帳で見る
 * （scripts/check-note-sync.mjs・週次 CI。登録は Mac の週次 note-sync-routine）。
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

// core.quotepath=false は必須。content/note は大半が日本語ディレクトリで、既定の 8 進エスケープでは照合できない。
const trackedNoteFiles = () => execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', 'content/note'], { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 })
  .split('\n').filter(Boolean);

test('cover*.svg は 1 件も追跡されていない（生成停止の回帰ゲート）', () => {
  const files = trackedNoteFiles();
  assert.ok(files.length > 100, '追跡 note ファイルが取れていない＝検査不成立（' + files.length + ' 件）');
  const svgs = files.filter((p) => /\/img\/cover[A-Za-z0-9_-]*\.svg$/.test(p));
  assert.deepEqual(
    svgs.slice(0, 5), [],
    'cover*.svg が追跡に戻っている（' + svgs.length + ' 件）。generate-note-covers は PNG のみを出力する。'
    + '.gitignore の content/note/**/img/cover*.svg も確認すること。',
  );
});

test('図版 SVG（figure-*）は巻き込まれず追跡されたままである', () => {
  // .gitignore のパターンが広すぎて figure-*.svg まで外していないかを見る。
  // note の図版は本文が参照する原本で、消えると記事が壊れる。
  const figures = trackedNoteFiles().filter((p) => /\/img\/figure-[^/]*\.svg$/.test(p));
  assert.ok(figures.length > 0, 'note の figure-*.svg が 1 件も追跡されていない＝ignore が広すぎる疑い');
});
