import test from 'node:test';
import assert from 'node:assert/strict';
import { planInlineSlots, measureLines } from '../src/lib/standards-inline-slots.mjs';
import { planArticleInlineSlots, remarkArticleBanners, ADSENSE_INTERVAL_CHARS, ADSENSE_MAX_SLOTS, QUESTIONS_PER_AD } from '../src/lib/article-inline-slots.mjs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

const text = n => 'あ'.repeat(n);
const sections = n => Array.from({length:n}, (_,i)=>`## 節 ${i}\n\n${text(1000)}\n\n${text(1000)}`).join('\n\n');
const parser = unified().use(remarkParse).use(remarkMdx).use(remarkGfm).use(remarkMath);

test('共有規則の境界: 600字以下の先頭・残り600字未満・1,800字未満の間隔を避ける', () => {
  const source = `${text(600)}\n\n${text(1000)}`;
  assert.equal(planInlineSlots(source).insertAt.length, 0);
  assert.equal(planInlineSlots(source.replace(text(600), text(601)), { slotPrefix:'article-banner' }).insertAt[0].slot, 'article-banner');
  assert.equal(planInlineSlots(`${text(601)}\n\n${text(599)}`).insertAt.length, 0);
  assert.equal(planInlineSlots(`${text(601)}\n\n${text(600)}`).insertAt.length, 1);
  const body = Array.from({length:12},()=>text(900)).join('\n\n');
  const p = planInlineSlots(body, { slotPrefix:'article-banner' });
  assert.equal(p.insertAt.length, 3);
  assert.ok(p.insertAt.every((s,i)=>!i || (s.line-p.insertAt[i-1].line)/2*900 >= 1800));
});

test('JSX・details・式・code・表の中に置かず、安全な後続候補を補充する', () => {
  const source = `## 導入\n\n${text(800)}\n\n<Callout title={"a > b"}>\n\n${sections(3)}\n\n</Callout>\n\n<details>\n\n${sections(3)}\n\n</details>\n\n<Figure\n src="test.png"\n caption={"x > y"}\n/>\n\n<ExamPoint items={["a", "b"]} />\n\n\`\`\`md\n${sections(2)}\n\`\`\`\n\n$$\nx > y\n$$\n\n| a | b |\n|---|---|\n| a | b |\n\n<SourceRef id="source" />\n\n${sections(7)}`;
  const tree = parser.parse(source), plan = planArticleInlineSlots(source);
  const blocked = tree.children.filter(n=>['mdxJsxFlowElement','code','math','table'].includes(n.type));
  assert.equal(plan.insertAt.length, 3);
  for (const s of plan.insertAt) assert.ok(!blocked.some(n=>s.line >= n.position.start.line && s.line < n.position.end.line));
  const injected = structuredClone(tree);
  remarkArticleBanners({insertAt:plan.insertAt})(injected);
  assert.equal(injected.children.filter(n=>n.name==='ArticleInlineBanner').length, 3);
  assert.deepEqual(injected.children.filter(n=>n.type==='heading'), tree.children.filter(n=>n.type==='heading'));
});

test('既存 CTA の同一・隣接区切りと近傍600字を予約し、後ろの候補を使う', () => {
  const body = `${text(900)}\n\n<CareerAffiliate program="buildjob" />\n\n${text(900)}\n\n${sections(8)}`;
  const p = planArticleInlineSlots(body, {midPositions:[2]});
  const blocks = parser.parse(body).children;
  const headings = blocks.filter(n=>n.type==='heading');
  const reservedLine = headings[3].position.start.line-1;
  assert.equal(p.insertAt.length, 3);
  assert.ok(p.insertAt.every(s=>s.line>4 && s.line!==reservedLine));
  const a = planArticleInlineSlots(sections(8), {reservedStudySlot:true});
  const b = planArticleInlineSlots(sections(8), {midPositions:[4]});
  assert.deepEqual(a.insertAt,b.insertAt);
});

test('問題文と解答を分断せず、次の問の見出しだけで切る', () => {
 const body=Array.from({length:8},(_,i)=>`## 問題 No.${i+1}\n\n${text(1800)}\n\n<details>\n<summary>解答</summary>\n\n${text(800)}\n\n</details>`).join('\n\n');
 const p=planArticleInlineSlots(body,{questionSeries:true});
 assert.equal(p.insertAt.length,3);
 for(const s of p.insertAt) assert.match(body.split('\n')[s.line],/^## 問題/);
 assert.equal(planArticleInlineSlots(sections(8),{questionSeries:true}).insertAt.length,0);
});

test('条文とSourceRefを分けず、AST不成立を黙って通常選択に戻さない', () => {
 const body=`## 法令\n\n> ${text(1800)}\n\n<SourceRef id="law" />\n\n${sections(6)}`;
 const p=planArticleInlineSlots(body);
 assert.ok(p.insertAt.every(s=>body.split('\n')[s.line]!=='<SourceRef id="law" />'));
 assert.throws(()=>planArticleInlineSlots('<Callout>\n\n閉じない'));
});

test('AdSense の本文枠: 転職バナーの候補と 800 字以上離し、本文の終わりまで 2,000 字ごとに置き、ArticleInlineAd として差し込む', () => {
  const body = Array.from({ length: 30 }, () => text(500)).join('\n\n');
  const plan = planArticleInlineSlots(body);
  assert.ok(plan.adInsertAt.length >= 4 && plan.adInsertAt.length <= ADSENSE_MAX_SLOTS, `枠の数 ${plan.adInsertAt.length}`);
  assert.ok(plan.adInsertAt.every(s => s.slot.startsWith('adsense')));
  const charsAt = line => body.split('\n').slice(0, line).join('').length;
  for (const [i, ad] of plan.adInsertAt.entries()) {
    for (const banner of plan.insertAt) assert.ok(Math.abs(charsAt(ad.line) - charsAt(banner.line)) >= 800, `広告 ${ad.line} とバナー ${banner.line} が近い`);
    if (i) assert.ok(charsAt(ad.line) - charsAt(plan.adInsertAt[i - 1].line) >= ADSENSE_INTERVAL_CHARS, '前の広告から 2,000 字以上');
  }
  // 本文の下半分にも置く（以前は最大 2 枠で、上の方に固まって下半分が空いた）
  assert.ok(charsAt(plan.adInsertAt.at(-1).line) > 15000 * 0.75, '最後の広告が本文の終わりの 4 分の 1 にある');
  const tree = parser.parse(body);
  remarkArticleBanners({ insertAt: [...plan.adInsertAt, ...plan.insertAt] })(tree);
  const names = tree.children.filter(n => n.type === 'mdxJsxFlowElement').map(n => n.name);
  assert.equal(names.filter(n => n === 'ArticleInlineAd').length, plan.adInsertAt.length);
  assert.equal(names.filter(n => n === 'ArticleInlineBanner').length, plan.insertAt.length);
});

test('過去問の AdSense は設問の見出しの直前にだけ置き、転職・広告から 3 問以上か 1,500 字以上あけて最後まで続ける', () => {
  const body = Array.from({ length: 30 }, (_, i) => `## 問題 No.${i + 1}\n\n${text(300)}\n\n<details>\n<summary>解答</summary>\n\n${text(600)}\n\n</details>`).join('\n\n');
  const plan = planArticleInlineSlots(body, { questionSeries: true });
  const lines = body.split('\n');
  const questionLines = lines.flatMap((line, i) => /^## 問題/.test(line) ? [i] : []);
  const ads = plan.adInsertAt.map(s => questionLines.indexOf(s.line));
  const taken = [...plan.insertAt.map(s => questionLines.indexOf(s.line)), ...ads].sort((a, b) => a - b);
  assert.ok(ads.length >= 6, `枠の数 ${ads.length}`);
  assert.ok(ads.every(q => q > 0), '設問の見出しの直前だけ');
  const { cumulative } = measureLines(body, 40);
  for (const q of ads) {
    const before = taken.filter(t => t < q).at(-1);
    const far = before === undefined || q - before >= QUESTIONS_PER_AD || cumulative[questionLines[q]] - cumulative[questionLines[before]] >= ADSENSE_INTERVAL_CHARS;
    assert.ok(far, `問 ${before + 1} と問 ${q + 1} の枠が近い`);
  }
  assert.ok(ads.at(-1) >= 30 - QUESTIONS_PER_AD - 1, '最後の数問の手前まで続く');
});

test('AdSense の本文枠: 短い記事には置かない', () => {
  assert.equal(planArticleInlineSlots(`${text(700)}\n\n${text(700)}`).adInsertAt.length, 0);
});
