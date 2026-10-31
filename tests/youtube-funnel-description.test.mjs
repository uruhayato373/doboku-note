import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildYoutubeFunnelDescription, reviseYoutubeFunnelDescription } from '../scripts/lib/youtube-funnel-description.mjs';

test('予約済み概要欄の制作開示を保ち、noteを主CTA、無料サイト記事を補助CTAにする', () => {
  const old = [
    '受験者向けの解説です。', '',
    'この動画で分かること：強度の判定', '',
    '【この動画の制作について】', '監修者の説明。AIの利用範囲も示す。', '',
    '▼ 教材・完成答案で深掘りする', 'https://note.com/example?utm_campaign=pack', '',
    '※制度・日程は変更される場合があります。受検年度の公式情報も確認してください。', '音声：VOICEVOX:青山龍星', '', '#試験対策',
  ].join('\n');
  const primary = { label: '予想50問＋施工14問を見る（note有料教材）', url: 'https://note.com/example?utm_campaign=pack' };
  const site = 'https://doboku-note.com/exam/example/primary/properties?utm_campaign=pack';
  const updated = reviseYoutubeFunnelDescription(old, { primary, site });
  assert.ok(updated.indexOf(primary.url) < updated.indexOf('この動画で分かること'));
  assert.ok(updated.indexOf(site) > updated.indexOf('この動画で分かること'));
  assert.match(updated, /【この動画の制作について】\n監修者の説明。AIの利用範囲も示す。/);
  assert.equal(reviseYoutubeFunnelDescription(updated, { primary, site }), updated);
});

test('概要欄生成は主CTAを一つにし、追加リンクが無い動画も扱う', () => {
  const text = buildYoutubeFunnelDescription({ intro: '説明', promise: '学べる', primary: { label: '商品を見る', url: 'https://note.com/example' }, disclosure: '開示', credit: '音声：VOICEVOX:青山龍星', hashtags: '#試験対策' });
  assert.equal((text.match(/https?:\/\//g) ?? []).length, 1);
  assert.ok(text.indexOf('商品を見る') < text.indexOf('学べる'));
});
