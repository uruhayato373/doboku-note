/**
 * 公開後に本文が実際に新しくなったかの判定（note-update-body [5g]・DN-0542）。
 * 2026-10-05、会員特典マガジン内の無料記事で「更新する」を押しても note 側で確定せず、公開は旧版のままなのに
 * [5e]（構造の崩れだけを見る検査）が OK を出し、再公開ハッシュも記録された。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { liveBodyText, visibleProbeLines, pickUpdateProbes, updateVerdict } from '../scripts/lib/note-live-check.mjs';

const OLD_HTML = '<p>このマガジンには、5つの系統について8つの立場ごとに書いた模範答案40本を収録しています。</p>'
  + '<p>自分の立場の答案を読めば、本番と同じ約1,000字の組み立てが分かります。自分の立場の5本だけをまとめたセットもあります。</p>';
const NEW_MD = [
  '# 出題傾向',
  '',
  'このマガジンには、5つの系統について8つの立場ごとに書いた模範答案40本を収録しています。',
  '',
  'https://note.com/dobokunote/m/m97a0049a10de',
  '',
  '自分の立場の5本だけを読みたい場合は、立場別の5テーマセットを選んでください。',
  '',
  '<!-- cta:coconala-custom -->',
  '自分で書いた小論文を見てほしいときは、ココナラで個別に添削しています（書き直し1回込み）。',
  '',
  '*本記事は受験対策を目的としています。出題テーマの一覧は二次情報に基づくものです。*',
].join('\n');

test('更新前に無かった文が更新後の公開本文に無ければ「更新されていない」', () => {
  const probes = pickUpdateProbes(visibleProbeLines(NEW_MD), liveBodyText(OLD_HTML));
  assert.ok(probes.length > 0, '新しい文から確認用の断片を選べていない');
  assert.equal(updateVerdict(probes, liveBodyText(OLD_HTML)), 'not-updated');
});

test('新しい文が公開本文に出ていれば「更新された」', () => {
  const probes = pickUpdateProbes(visibleProbeLines(NEW_MD), liveBodyText(OLD_HTML));
  const newHtml = '<p>自分の立場の5本だけを読みたい場合は、<b>立場別の5テーマセット</b>を選んでください。</p>';
  assert.equal(updateVerdict(probes, liveBodyText(newHtml)), 'updated');
});

test('見える本文が変わらない更新（新しい文が無い）は確かめようがないので判定しない', () => {
  const same = 'このマガジンには、5つの系統について8つの立場ごとに書いた模範答案40本を収録しています。';
  const probes = pickUpdateProbes(visibleProbeLines(same), liveBodyText(OLD_HTML));
  assert.deepEqual(probes, []);
  assert.equal(updateVerdict(probes, ''), 'no-visible-change');
});

test('有料記事は境界の H2 より後ろの文を確認に使わない（未購入者には見えない）', () => {
  const md = '## 無料の導入\n\nここは誰でも読める導入の段落で、十分な長さがあります。\n\n## 予想問題1\n\nここは有料部分の新しい文で、公開 API には出てこない内容です。';
  const lines = visibleProbeLines(md, { isPaid: true, boundary: '予想問題1' });
  assert.ok(lines.every((l) => !l.includes('有料部分')), '境界より後ろの文が混ざっている');
});

test('試し読みラインを末尾直前に置く記事は、会員限定になる最後の行を確認に使わない', () => {
  const lines = visibleProbeLines(NEW_MD, { trialTail: true });
  assert.ok(lines.every((l) => !l.includes('本記事は受験対策')), '会員限定の尻尾が混ざっている');
});

test('リンクカードの URL 行・コメント・画像は確認に使わない', () => {
  const lines = visibleProbeLines(NEW_MD);
  assert.ok(lines.every((l) => !/https?:|<!--|〔〔IMG/.test(l)));
});
