import assert from 'node:assert/strict';
import { test } from 'node:test';
import { audioProblems, readingRiskTokens, sceneSimilarity, speechSimilarity, tokenMisreads } from '../scripts/lib/video-publish-gate.mjs';

// 合成した読みの代わりの文字列（VOICEVOX を使わない）。12 場面のうち 1 場面だけが短い想定で、場面ごとの内容は互いに違う
const SCENES = [
  'ほんじつはどぼくのしけんでよくでるきそのもんだいをかくにんします',
  'のりめんのあんていはせんだんりょくとせんだんきょうどのひでひょうかされます',
  'ちかすいいがたかいばあいはげんすいのせっけいをさいしょにけんとうします',
  'こうじのひんしつかんりではひんしつきじゅんとしけんけっかをきろくしてほかんします',
  'あんぜんかんりではこうしゅさぎょうのくいきをさくでしきりかんしいんをおきます',
  'こうていかんりのバーチャートはさぎょうのじゅんじょとにっすうをよこじくにしめします',
  'かんきょうたいさくではほこりやしんどうそうおんをげんじょうにあわせておさえます',
  'さいごにここまでのないようをふりかえりしけんでつかえるかたちにまとめておきます',
];
const heardOf = (scenes) => scenes.join('。');
const POLICY = { audio: { minSimilarity: 0.85, minSceneSimilarity: 0.6, maxTokenMisreads: 0, minMaxVolumeDb: -12, maxMaxVolumeDb: -0.1, maxDurationGapSec: 2 } };
const rowOf = (scenes, heard, extra = {}) => {
  const sim = sceneSimilarity(scenes, heard);
  return { videoSha256: 's', similarity: Number(speechSimilarity(scenes.join('。'), heard).toFixed(3)), sceneSimilarityMin: sim.min, sceneSimilarityMinScene: sim.minScene, tokenMisreads: [], maxVolumeDb: -5, durationGapSec: 0, ...extra };
};

test('場面ごとの一致度: 全場面が聞こえていれば最小値も高い', () => {
  const sim = sceneSimilarity(SCENES, heardOf(SCENES));
  assert.equal(sim.counted, SCENES.length);
  assert.ok(sim.min >= 0.95, `min ${sim.min}`);
  assert.deepEqual(audioProblems(rowOf(SCENES, heardOf(SCENES)), 's', POLICY), []);
});

test('1 場面を欠いた音声は、全体の一致度が 0.85 を超えても場面の最小値で落ちる（DN-1071）', () => {
  const heard = heardOf(SCENES.filter((_, i) => i !== 3));
  const row = rowOf(SCENES, heard);
  assert.ok(row.similarity >= 0.85, `全体の一致度は従来の基準を超える: ${row.similarity}`);
  assert.equal(row.sceneSimilarityMinScene, 3);
  assert.ok(row.sceneSimilarityMin < 0.6, `欠けた場面の一致 ${row.sceneSimilarityMin}`);
  const problems = audioProblems(row, 's', POLICY);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /場面の欠落の疑い（場面 3/);
});

test('短い場面は偶然の一致に左右されるので数えない。数える場面が無ければ min は null で落ちる', () => {
  const sim = sceneSimilarity(['ひょうし', ...SCENES], heardOf(SCENES));
  assert.equal(sim.scenes[0].similarity, null);
  assert.equal(sim.counted, SCENES.length);
  const none = sceneSimilarity(['ひょうし'], 'ひょうし');
  assert.equal(none.min, null);
  assert.equal(audioProblems({ ...rowOf(SCENES, heardOf(SCENES)), sceneSimilarityMin: null }, 's', POLICY).length, 1);
});

test('readingRiskTokens: 数字・英字・ローマ数字と直後の単位を拾う', () => {
  assert.deepEqual(readingRiskTokens('盛土は3.5メートル以上で、II-1の問題はPCです。'), ['3.5メートル', 'II', '1', 'PC']);
  assert.deepEqual(readingRiskTokens('第Ⅲ章の1級'), ['III章', '1級']);
  assert.deepEqual(readingRiskTokens('数字を含まない文です。'), []);
});

test('数字を誤読した音声は、全体・場面の一致度が高くても完全一致の比較で落ちる（DN-1071）', () => {
  const sentence = 'のりめんのこうばいはさんてんごめーとるいじょうひつようです';
  const scenes = [...SCENES.slice(0, 7), sentence];
  const items = [{ scene: 7, token: '3.5メートル', sentenceReading: sentence, tokenReading: 'さんてんごめーとる' }];
  assert.deepEqual(tokenMisreads(items, heardOf(scenes)), []);
  const misheard = heardOf([...SCENES.slice(0, 7), 'のりめんのこうばいはよんてんごめーとるいじょうひつようです']);
  const misreads = tokenMisreads(items, misheard);
  assert.deepEqual(misreads, [{ scene: 7, token: '3.5メートル', expected: 'さんてんごめーとる' }]);
  const row = rowOf(scenes, misheard, { tokenMisreads: misreads });
  assert.ok(row.similarity >= 0.85 && row.sceneSimilarityMin >= 0.6, `従来の 2 つの基準は通る: ${row.similarity} / ${row.sceneSimilarityMin}`);
  const problems = audioProblems(row, 's', POLICY);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /誤読の疑い（場面 7 の 3\.5メートル）/);
});

test('欄が無い従来の記録（在庫の既存分）は新しい 2 項目を判定しない。tokenMisreads が空でも欄があれば判定対象', () => {
  const old = { videoSha256: 's', similarity: 0.9, maxVolumeDb: -5, durationGapSec: 0 };
  assert.deepEqual(audioProblems(old, 's', POLICY), []);
  assert.deepEqual(audioProblems(old, 's', { audio: { ...POLICY.audio, minSceneSimilarity: undefined } }), []);
  assert.equal(audioProblems({ ...old, sceneSimilarityMin: 0.2, sceneSimilarityMinScene: 1 }, 's', POLICY).length, 1);
  assert.equal(audioProblems({ ...old, tokenMisreads: [{ scene: 0, token: '1', expected: 'いち' }] }, 's', POLICY).length, 1);
});
