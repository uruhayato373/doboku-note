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

test('段落の途中だけを差し替えた更新でも、変わった部分から断片を選んで確かめる（DN-0896）', () => {
  // 2026-10-27、行の先頭 20 字が更新前と同じだったため断片が 0 件になり、[5g] が確認を飛ばした
  const pre = '<p>筆者は元・地方自治体の土木職（発注者）で、1級土木施工管理技士を保有しています。令和8年度の第二次検定は10月25日です。残り日数に合わせて、骨子づくりと文章化を前半に置きます。</p>';
  const md = '筆者は元・地方自治体の土木職（発注者）で、1級土木施工管理技士を保有しています。令和8年度の第二次検定（10月25日）は終わりました。受検した方の自己採点の目安は、[R8第二次検定を終えたら](https://note.com/dobokunote/n/n6b1410beec5c)にまとめています。残り日数に合わせて、骨子づくりと文章化を前半に置きます。';
  const probes = pickUpdateProbes(visibleProbeLines(md), liveBodyText(pre));
  assert.ok(probes.length > 0, '段落の途中の差し替えから断片を選べていない');
  assert.equal(updateVerdict(probes, liveBodyText(pre)), 'not-updated');
  const post = `<p>${md.replace(/\[([^\]]+)\]\([^)]+\)/, '<a href="https://note.com/dobokunote/n/n6b1410beec5c">$1</a>')}</p>`;
  assert.equal(updateVerdict(probes, liveBodyText(post)), 'updated');
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

// 2026-11-27 DN-1309: リンクに utm_term だけを足した更新で、[5g] が「新しい文が無い」として確認を省略し [OK] を出したが、
// 公開本文のリンクは旧いままだった。見える文が変わらない更新は、変わったリンク先（href）が公開本文に出たかで確かめる。
// 公開 API の更新日時はリンクだけの変更では動かないので使わない。
import { visibleHrefs, liveHrefs, pickUpdateHrefs } from '../scripts/lib/note-live-check.mjs';

const LINK_OLD = 'https://doboku-note.com/exam/cce/?utm_source=note&utm_medium=article';
const LINK_NEW = `${LINK_OLD}&utm_term=essay-trend`;
const amp = (u) => u.replace(/&/g, '&amp;');
const PRE_HTML = `<p>過去問は<a href="${amp(LINK_OLD)}">サイトの過去問ページ</a>で確かめられます。十分な長さの段落です。</p>`;
const LINK_MD = `過去問は[サイトの過去問ページ](${LINK_NEW})で確かめられます。十分な長さの段落です。`;

test('リンクの URL だけを変えた更新は、文の断片が無くてもリンク先で確かめる（省略しない）', () => {
  const probes = pickUpdateProbes(visibleProbeLines(LINK_MD), liveBodyText(PRE_HTML));
  assert.deepEqual(probes, [], '見える文は変わらない');
  const hrefProbes = pickUpdateHrefs(visibleHrefs(LINK_MD), PRE_HTML);
  assert.deepEqual(hrefProbes, [LINK_NEW]);
  assert.equal(updateVerdict(probes, liveBodyText(PRE_HTML), { hrefProbes, postHtml: PRE_HTML }), 'not-updated', '旧いリンクのままなら FAIL');
  const postHtml = PRE_HTML.replace(amp(LINK_OLD), amp(LINK_NEW));
  assert.equal(updateVerdict(probes, liveBodyText(postHtml), { hrefProbes, postHtml }), 'updated');
});

test('公開本文のリンク先は href とリンクカードの data-src から読み、&amp; を戻す', () => {
  const html = '<a href="https://a.example/x?p=1&amp;q=2">a</a><figure embedded-service="external-article" data-src="https://doboku-note.com/exam/"></figure>';
  assert.deepEqual(liveHrefs(html), ['https://a.example/x?p=1&q=2', 'https://doboku-note.com/exam/']);
});

test('リンク先も境界より後ろ・試し読みの尻尾のものは確認に使わない', () => {
  const md = '## 導入\n\n[無料の案内](https://a.example/free)を読んでください。\n\n## 予想問題1\n\n[有料の案内](https://a.example/paid)';
  assert.deepEqual(visibleHrefs(md, { isPaid: true, boundary: '予想問題1' }), ['https://a.example/free']);
  const tail = '本文の段落です。\n\n[入口](https://a.example/head)\n\n[尻尾1](https://a.example/tail1)\n\n[尻尾2](https://a.example/tail2)';
  assert.deepEqual(visibleHrefs(tail, { trialTail: true }), ['https://a.example/head']);
});

test('文もリンク先も変わらない更新は no-visible-change のまま', () => {
  const md = `過去問は[サイトの過去問ページ](${LINK_OLD})で確かめられます。十分な長さの段落です。`;
  const hrefProbes = pickUpdateHrefs(visibleHrefs(md), PRE_HTML);
  assert.deepEqual(hrefProbes, []);
  assert.equal(updateVerdict([], '', { hrefProbes }), 'no-visible-change');
});
