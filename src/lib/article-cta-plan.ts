import type { DocMeta } from './docs';
import { classifyDoc, isCareerDoc } from './doc-classifier';
import { extractHeadings } from './toc';
import { extractReferencesSection } from './extract-references';
import { resolvePlacement, resolveArticleMidNoteSlot, resolveEndNoteSlot, renderedNoteCards, reservesPrimaryStudySlot } from './magazine-placement';
import { resolvePlacements } from './affiliate-placement';
import { rankRelated } from './related-score';
import { isCivilConstructionCategory } from './qualification-names';
import { planArticleInlineSlots } from './article-inline-slots.mjs';
import { slotCreatives } from './affiliate-slot-creatives';

const MID_MIN_H2 = 3;
function stripLeadingH1(content: string): string {
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length && lines[i]!.trim() === '') i++;
  if (i < lines.length && /^#\s+/.test(lines[i]!)) {
    const rest = lines.slice(i + 1);
    while (rest.length > 0 && rest[0]!.trim() === '') rest.shift();
    return [...lines.slice(0, i), ...rest].join('\n');
  }
  return content;
}

/** 既存 note / 関連記事の容量と順序、および新画像の安全な区切り。サイトと管理画面が共用する。 */
export function planArticleCtas(doc: { meta: DocMeta; content: string }, relatedArticles: DocMeta[], now = Date.now()) {
  const { meta } = doc;
  const category = meta.category, slugStr = meta.slug, docGroup = classifyDoc(meta);
  const { strippedContent, references } = extractReferencesSection(doc.content);
  const body = stripLeadingH1(strippedContent);
  const headings = extractHeadings(strippedContent, meta.toc_min_heading_level ?? 2, meta.toc_max_heading_level ?? 3);
  const isQuestionSeries = docGroup === 'pastExam' || docGroup === 'primary' || (docGroup === 'secondary' && /-secondary-(r|h)\d+(?:-|$)/i.test(slugStr));
  const magazinePlacement = resolvePlacement(slugStr, docGroup, isCareerDoc(meta), renderedNoteCards(doc.content));
  const careerPlacements = resolvePlacements({ pageKind: 'doc', category: category ?? null, isCareerDoc: isCareerDoc(meta) }, now);
  // 記事内（本文中間）CTA。**記事長に応じて 1〜3 枠**を h2 境界に挿入する（2026-07-28 に
  // 1 枠固定から拡張）。1 枠だと長文記事で note と転職カードが枠を奪い合い、どちらかが
  // 出せなかった。枠が複数あれば長文は両方載る（短い記事は従来どおり優先順で 1 つ）。
  // MDX ソースは書き換えず rehypeMidCta が <midslot data-mid-index> を挿し、
  // components の midslot が index で中身を引く。
  const midH2Count = headings.filter((h) => h.level === 2).length;
  const midBodyLen = stripLeadingH1(strippedContent).length;
  // 1級・2級土木の二次（secondary）ページも本文中間 CTA の対象に含める（二次の商品を
  // 二次高 intent 面へ出すため）。全資格の secondary を一律対象にはしない（土木のみ）。
  const isCivilSecondary =
    isCivilConstructionCategory(category) &&
    docGroup === 'secondary';
  const midEligibleGroup =
    docGroup === 'guide' || docGroup === 'pillar' || docGroup === 'textbook' || isCivilSecondary;
  const midEnabled = midEligibleGroup && midH2Count >= 5 && midBodyLen >= 8000;

  // 転職ネイティブカード（本文中間）。出すカテゴリと案件は article-mid のルール。
  // 既に本文へ手書き inline <CareerAffiliate> がある記事は二重表示になるため除外する。
  const hasInlineCareerCard = /\bCareerAffiliate\b/.test(strippedContent);
  const inlineCareerAd = hasInlineCareerCard ? (careerPlacements['article-inline'] ?? null) : null;
  const reservedStudySlot = docGroup === 'primary' && reservesPrimaryStudySlot(
    resolvePlacement(slugStr, docGroup, isCareerDoc(doc.meta)), strippedContent,
  );
  const careerMidCard =
    !reservedStudySlot && !hasInlineCareerCard && midH2Count >= MID_MIN_H2 && midBodyLen >= 2500
      ? (careerPlacements['article-mid']?.card(slugStr) ?? null)
      : null;

  // 枠数: 記事が長いほど増やす（h2 3 本ごと / 4,000 字ごとの少ない方・上限 3）。
  // 下限ゲート（h2>=MID_MIN_H2 かつ >=2,500 字）を満たさない記事は 0 枠＝「出さない」。
  const midSlotCapacity =
    midH2Count >= MID_MIN_H2 && midBodyLen >= 2500
      ? Math.max(1, Math.min(3, Math.floor(midH2Count / 3), Math.floor(midBodyLen / 4000)))
      : 0;

  // 中身を優先順に用意する（各種別 1 記事 1 回まで＝同じ広告を 2 度出さない）。
  const midRenderers: Array<'note' | 'related' | 'career'> = [];
  let relatedTop: DocMeta | undefined;
  // 1) note 中間 CTA（最優先）。冒頭・本文直後・手書きと異なる商品を選ぶ。
  const midSlot = resolveArticleMidNoteSlot(magazinePlacement, docGroup, strippedContent, isCivilSecondary);
  if (midSlot) {
    midRenderers.push('note');
  }
  const endNoteSlot = resolveEndNoteSlot(magazinePlacement, strippedContent);
  // 2) 関連記事。長文記事では収益 CTA に枠を使い切らず、サイト内回遊を最低 1 枠確保する。
  if (midEnabled) {
    relatedTop = rankRelated(doc.meta, relatedArticles, 1)[0];
    if (relatedTop) midRenderers.push('related');
  }
  // 3) 転職ネイティブカード（1 記事 1 枚まで＝広告密度を抑える）
  let careerMidIndex = -1;
  if (careerMidCard) {
    careerMidIndex = midRenderers.length;
    midRenderers.push('career');
  }

  // 転職カードが容量からあふれる記事（note・関連記事が先に枠を使う）は、見出しの境界に空きがあれば転職カードの枠を 1 つ足す（上限 3）。
  // 2026-10-21 に記事末を閉じてから（DN-0779）、長文でもあふれた記事は転職広告が 0 になっていた（本番 34 本・2026-10-24 実測）。
  // 位置は 1〜h2-2 の境界なので、枠の数がそれを超えると同じ境界に重なる。h2=3（境界 1 つ）の記事は足さない。
  const careerMidFits = careerMidIndex >= 0 && careerMidIndex < midSlotCapacity;
  const careerMidExtra =
    careerMidIndex >= midSlotCapacity && midSlotCapacity < 3 && midH2Count - 2 > midSlotCapacity;
  // 実際に使う枠＝用意できた中身と容量の小さい方（あふれた転職カードを足すときは末尾に置く）。
  const midSlots = careerMidExtra
    ? [...midRenderers.slice(0, midSlotCapacity), midRenderers[careerMidIndex]!]
    : midRenderers.slice(0, midSlotCapacity);
  
  // 位置: h2 境界に均等配分。先頭セクション直後（0）と最終 h2（まとめ）直前は避ける。
  const midPositions = midSlots.map((_, i) =>
    Math.min(
      Math.max(1, Math.round(((i + 1) * midH2Count) / (midSlots.length + 1))),
      midH2Count - 2,
    ),
  );
  const effectiveMidPositions = midSlots.length > 0 ? midPositions : [];

  const candidates = planArticleInlineSlots(body, { midPositions: effectiveMidPositions, reservedStudySlot, questionSeries: isQuestionSeries });
  // 手書き preset 専用カードは article-inline の実験面ではない。存在しない面からピクセルを出さない。
  const renderedCareerSlots = [
    ...(inlineCareerAd && candidates.hasRuledCareerCard ? ['article-inline'] : []),
    ...((careerMidFits || careerMidExtra) && candidates.renderedMidIndexes.includes(midSlots.indexOf('career')) ? ['article-mid'] : []),
    ...(careerPlacements['article-end'] ? ['article-end'] : []),
  ];
  const inline = candidates.insertAt.filter(s => {
    const p = careerPlacements[s.slot];
    if (!p) return false;
    const c = slotCreatives(p.program, s.slot);
    return Boolean(c.pc || c.mobile);
  });
  return { body, strippedContent, references, headings, isQuestionSeries, magazinePlacement, careerPlacements,
    inlineCareerAd, careerMidCard, midSlot, endNoteSlot, relatedTop, midKinds: midSlots, effectiveMidPositions,
    renderedCareerSlots, reservedStudySlot, inline, adInline: candidates.adInsertAt, candidates, docGroup,
    inlineReason: inline.length ? null : candidates.insertAt.length ? '適合する画像素材・配置ルールなし' : '既存 CTA と設問を避けた安全な区切りなし',
  };
}
