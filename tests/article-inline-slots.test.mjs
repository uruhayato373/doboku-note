import test from 'node:test';
import assert from 'node:assert/strict';
import { planInlineSlots } from '../src/lib/standards-inline-slots.mjs';
import { planArticleInlineSlots, remarkArticleBanners } from '../src/lib/article-inline-slots.mjs';
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

test('本文の AdSense は手動で置かない（自動広告のページ内広告に任せる・2026-11-23）。差し込むのは転職の枠だけ', () => {
  for (const [body, opts] of [
    [Array.from({ length: 30 }, () => text(500)).join('\n\n'), {}],
    [Array.from({ length: 30 }, (_, i) => `## 問題 No.${i + 1}\n\n${text(300)}\n\n<details>\n<summary>解答</summary>\n\n${text(600)}\n\n</details>`).join('\n\n'), { questionSeries: true }],
  ]) {
    const plan = planArticleInlineSlots(body, opts);
    assert.ok(!('adInsertAt' in plan), 'AdSense の計画を返さない');
    assert.ok(plan.insertAt.every(s => !s.slot.startsWith('adsense')));
    const tree = parser.parse(body);
    remarkArticleBanners({ insertAt: plan.insertAt })(tree);
    const names = tree.children.filter(n => n.type === 'mdxJsxFlowElement').map(n => n.name);
    assert.ok(!names.includes('ArticleInlineAd'));
    assert.equal(names.filter(n => n === 'ArticleInlineBanner').length, plan.insertAt.length);
  }
});
