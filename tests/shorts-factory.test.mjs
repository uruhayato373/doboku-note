import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { buildAss, designDigest, designProblems, inspectShortImage, narrationProblems, verifyInCloud } from '../scripts/lib/shorts-factory.mjs';

const noisy = async (width, height, bottomFlat = false) => {
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const v = bottomFlat && y > height * 0.75 ? 20 : ((x >> 4) + (y >> 4)) % 2 ? 230 : 30;
    raw.fill(v, (y * width + x) * 3, (y * width + x) * 3 + 3);
  }
  return sharp(raw, { raw: { width, height, channels: 3 } }).png().toBuffer();
};

test('全面の縦画像は機械検査を通る', async () => {
  assert.deepEqual(await inspectShortImage(await noisy(1080, 1920)), []);
});

test('下端の無地帯は採用前に止める（旧 CTA の紺帯の再発防止）', async () => {
  const issues = await inspectShortImage(await noisy(1080, 1920, true));
  assert.match(issues.join(), /下端が無地の帯/);
});

test('9:16 以外と低解像度は止める', async () => {
  assert.match((await inspectShortImage(await noisy(1024, 1536))).join(), /9:16 ではない/);
  assert.match((await inspectShortImage(await noisy(720, 1280))).join(), /解像度が足りない/);
});

test('論点ごとの語りは台本の場面と一致しなければ止める', () => {
  const scene = { narration: '基準は1000リットル。小数へ直す。' };
  assert.deepEqual(narrationProblems({ hook: '導入', beats: [{ narration: '基準は1000リットル。' }, { narration: '小数へ直す。' }] }, scene), []);
  assert.match(narrationProblems({ hook: '導入', beats: [{ narration: '基準は2000リットル。' }] }, scene).join(), /一致しない/);
  assert.match(narrationProblems({ beats: [{ narration: '基準は1000リットル。小数へ直す。' }] }, scene).join(), /hook/);
});

test('字幕は大きな文字で、切り分けても音声の時間を超えない', () => {
  const ass = buildAss([{ text: '水セメント比W/Cとセメント水比C/Wを逆にしない。', start: 1, duration: 4 }]);
  assert.match(ass, /Noto Sans JP,80,/);
  const ends = [...ass.matchAll(/Dialogue: 0,[^,]+,0:00:(\d+\.\d+)/g)].map((m) => Number(m[1]));
  assert.ok(ends.length >= 2);
  assert.equal(ends.at(-1), 5);
});

test('台本の機械検査は画像の前に形を止める', () => {
  const scene = { narration: 'あ。い。' };
  const good = { hook: '導入', pose: '手を挙げる', beats: [{ narration: 'あ。', heading: '見出し', diagram: '図' }, { narration: 'い。', heading: '見出し', diagram: '図' }] };
  assert.deepEqual(designProblems(good, scene), []);
  assert.match(designProblems({ ...good, pose: '' }, scene).join(), /pose/);
  // 表紙の見出しと締めの語りは台本に持てる（通常動画と共有のファイルを書き換えない・DN-1001）
  assert.deepEqual(designProblems({ ...good, headline: ['答案の骨組み', '4つで固定'], cta: '詳しい解説は関連動画へ。' }, scene), []);
  assert.match(designProblems({ ...good, headline: [] }, scene).join(), /headline/);
  assert.match(designProblems({ ...good, cta: 'あ'.repeat(21) }, scene).join(), /cta/);
  assert.match(designProblems({ ...good, hook: 'あ'.repeat(41) }, scene).join(), /40 字/);
  assert.match(designProblems({ ...good, beats: [{ narration: 'あ。い。', heading: '見出し', diagram: '図' }] }, scene).join(), /2〜4/);
  assert.match(designProblems({ ...good, beats: [good.beats[0], { ...good.beats[1], diagram: '' }] }, scene).join(), /diagram/);
});

test('台本の版は監査の記録に左右されず、中身の変更で変わる', () => {
  const design = { hook: 'a', beats: [] };
  assert.equal(designDigest({ ...design, qa: { verdict: 'pass' } }), designDigest(design));
  assert.notEqual(designDigest({ ...design, hook: 'b' }), designDigest(design));
});

test('クラウドの同期を待って照合し直し、通らなければ止める', async () => {
  let calls = 0;
  await verifyInCloud('.', 'a/b', { wait: async () => {}, verify: () => { calls += 1; if (calls < 3) throw new Error('未同期'); } });
  assert.equal(calls, 3);
  await assert.rejects(verifyInCloud('.', 'a/b', { wait: async () => {}, verify: () => { throw new Error('未同期'); } }), /手元は消していない/);
});

test('型の台帳とコピーの技法で台本を止める（2026-11-11）', async () => {
  const { typeProblems, narrationProblems } = await import('../scripts/lib/shorts-factory.mjs');
  const formats = { rules: { hookMaxChars: 40 }, types: [{ id: 'before-after', label: 'ビフォーアフター', beats: { min: 2, max: 3 } }, { id: 'n-check', label: 'N 点チェック', beats: { min: 2, max: 4 } }], copy: [{ id: 'assertion' }, { id: 'odd-number' }, { id: 'barnum' }], gestures: [{ id: 'red-pen' }, { id: 'tilt-head' }] };
  const ctx = { formats, slotTypes: ['before-after'], sceneIds: new Set(['s1', 's2']) };
  const good = { type: 'before-after', gesture: 'red-pen', coverPaper: '暑い時期だった', copy: ['barnum'], hook: '工事概要と本文がずれていませんか。', beats: [{}, {}], cta: '残りの直し方は本編で。' };
  assert.match(typeProblems({ ...good, gesture: undefined }, ctx).join(), /gesture が無い/);
  assert.match(typeProblems({ ...good, coverPaper: undefined }, ctx).join(), /coverPaper が要る/);
  assert.match(typeProblems({ ...good, gesture: 'dance' }, ctx).join(), /gesture が台帳に無い/);
  assert.deepEqual(typeProblems(good, ctx), []);
  assert.match(typeProblems({ ...good, type: undefined }, ctx).join(), /type が無い/);
  assert.match(typeProblems({ ...good, type: 'n-check' }, ctx).join(), /この枠で使わない/);
  assert.match(typeProblems({ ...good, beats: [{}, {}, {}, {}] }, ctx).join(), /2〜3 個/);
  assert.match(typeProblems({ ...good, copy: ['assertion', 'odd-number', 'barnum'] }, ctx).join(), /2 つまで/);
  assert.match(typeProblems({ ...good, copy: ['fear'] }, ctx).join(), /台帳に無い/);
  assert.match(typeProblems({ ...good, cta: '詳しい解説は関連動画へ。' }, ctx).join(), /本編/);
  // 書き直した語りは台本の場面 id を出典に持つ
  const scene = { narration: '元の語り。' };
  assert.deepEqual(narrationProblems({ hook: '問い', sources: ['s1'], beats: [{ narration: '書き直した語り。' }] }, scene, ctx), []);
  assert.match(narrationProblems({ hook: '問い', sources: ['x9'], beats: [{ narration: '書き直した語り。' }] }, scene, ctx).join(), /台本に無い場面/);
});

test('同じ枠で冒頭の形とコピーの技法が半分を超えて同じなら止める（2026-11-11・10 本中 6 本が「〜ませんか」）', async () => {
  const { varietyProblems, hookForm } = await import('../scripts/lib/shorts-factory.mjs');
  const formats = { hookForms: [{ id: 'check', label: '確認の問い', pattern: 'ませんか[。？?]?$' }, { id: 'quiz', label: 'クイズ', pattern: 'でしょうか?[。？?]?$|[？?]$' }, { id: 'statement', label: '言い切り', pattern: '。$' }] };
  assert.equal(hookForm('並べていませんか。', formats.hookForms), 'check');
  assert.equal(hookForm('何が足りないでしょう。', formats.hookForms), 'quiz');
  assert.equal(hookForm('順序は権限で決めます。', formats.hookForms), 'statement');
  const siblings = [{ hook: 'Aしていませんか。', copy: ['barnum'] }, { hook: 'Bしていませんか。', copy: ['barnum'] }, { hook: '何が足りないでしょう。', copy: [] }];
  assert.match(varietyProblems({ hook: 'Cしていませんか。', copy: ['barnum'] }, { formats, siblings }).join(), /確認の問い.*4 本中 3 本/);
  assert.match(varietyProblems({ hook: '順序は権限で決めます。', copy: ['barnum'] }, { formats, siblings }).join(), /barnum/);
  assert.deepEqual(varietyProblems({ hook: '順序は権限で決めます。', copy: ['assertion'] }, { formats, siblings }), []);
  assert.deepEqual(varietyProblems({ hook: 'Cしていませんか。', copy: [] }, { formats, siblings: siblings.slice(0, 1) }), [], '2 本以下の枠は見ない');
});

test('締めの画面の文字を語りに合わせる', async () => {
  const { ctaLines } = await import('../scripts/lib/shorts-factory.mjs');
  assert.deepEqual(ctaLines('残りの直し方は本編で。'), ['残りの直し方は', '本編で']);
  assert.deepEqual(ctaLines('本編で。'), ['本編で']);
});

test('同じ枠で先生の仕草が半分を超えて同じなら止める（2026-11-11・全部の表紙が手のひらで止める仕草だった）', async () => {
  const { varietyProblems } = await import('../scripts/lib/shorts-factory.mjs');
  const formats = { hookForms: [] };
  const siblings = [{ hook: 'a', copy: [], gesture: 'stop-hand' }, { hook: 'b', copy: [], gesture: 'stop-hand' }, { hook: 'c', copy: [], gesture: 'red-pen' }];
  assert.match(varietyProblems({ hook: 'd', copy: [], gesture: 'stop-hand' }, { formats, siblings }).join(), /仕草 stop-hand/);
  assert.deepEqual(varietyProblems({ hook: 'd', copy: [], gesture: 'tilt-head' }, { formats, siblings }), []);
});

test('表紙の紙に書く悪い例を見出しの『』か冒頭の「」から取る（2026-11-11・紙に作り話の文字が入った）', async () => {
  const { paperText } = await import('../scripts/lib/shorts-factory.mjs');
  assert.equal(paperText({ headline: ['『暑い時期', 'だった』', '何が足りない？'] }), '暑い時期だった');
  assert.equal(paperText({ headline: ['令和3年', '6月〜12月'], hook: '「令和3年6月〜12月」、この工期で足りますか。' }), '令和3年6月〜12月');
  assert.equal(paperText({ headline: ['順序は', '権限で'], hook: '順序は権限で決めます。' }), null);
});
