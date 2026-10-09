/**
 * image-origin.mjs — 記事のラスター画像（写真・切り出し図）の出所を決める共通部品（DN-0574・2026-10-07）。
 *
 * 出所の正本は config/figure-sources.json の provenance（kind を省いた記録は PDF から切り出した図）。
 * 試験ページ（公式の設問を載せるページ）の設問の図は、記事の sources: が公式問題（exam-official）なら書かなくてよい。
 * 写真は AI で生成した画像だけを使い、比率を config/image-limits.json の aiPhoto に揃える（運営者決定・2026-10-07）。
 *
 * なぜ要るか: 2026-10-07 に公開記事のラスター画像 497 枚を数えると、台帳（provenance）に出所の無いものが 56 枚あり（MDX の出典コメントしか無いものを含む）、そのうち 23 枚は
 * Wikimedia Commons の実写を AI で描き直した画像だった（元の出典コメントと caption は消えていた）。AI が描き直した
 * セオドライトは実在しない形になっていたが、誰も実物と照らしていなかった。そこで AI 画像は、実物どおりかを目で
 * 判定した記録（画像のハッシュつき）が無ければ公開記事に置けないようにする。
 */
import { createHash } from 'node:crypto';
import { isExamArticle } from './figure-source-wiring.mjs';

export const AI_KINDS = new Set(['ai-generated']);
export const AI_LEDGER_FILE = '.claude/state/quality/ai-image-review-ledger.json';
export const AI_VERDICTS = ['ok', 'fail'];

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 図の出所。{ kind, from: 'provenance' | 'exam-page', entry } か、決められなければ null。
 * articleSources: 記事ディレクトリ（資格/記事）→ sources: の id 配列。cfg: 参考文献の台帳（sources・classes）。
 * inExplanation: 画像が解答・解説（<details>）の中にある。
 */
export function originOf({ figKey, provenance, articleSources, cfg, inExplanation = false }) {
  const entry = provenance?.[figKey];
  if (entry) return { kind: entry.kind ?? 'pdf-crop', from: 'provenance', entry };
  const articleDir = figKey.split('/img/')[0];
  if (!isExamArticle(articleDir) || inExplanation) return null; // 解答・解説の図は試験の図でない（figuresInExplanation）
  const declared = articleSources.get(articleDir) ?? [];
  const exam = declared.some((id) => cfg.sources.find((s) => s.id === id)?.class === 'exam-official');
  return exam ? { kind: 'exam-official', from: 'exam-page', entry: null } : null;
}

/** 本文で name の画像を参照しているタグ（<img> / <ArticleImage>）。開始位置と全文。無ければ null */
export function imageTagFor(content, name) {
  const re = new RegExp(`<(?:img|ArticleImage)\\b[^>]*?/${escRe(name)}\\.(?:webp|png|jpg|jpeg)\\b[^>]*>`);
  const m = re.exec(content);
  return m ? { index: m.index, tag: m[0] } : null;
}

/** 画像タグの直前（空行を挟んでよい）にある {/* source: … *\/} の本文。無ければ null */
export function sourceCommentFor(content, name) {
  const t = imageTagFor(content, name);
  if (!t) return null;
  const before = content.slice(0, t.index).trimEnd();
  const m = /\{\/\*\s*source:\s*((?:(?!\*\/)[\s\S])*?)\s*\*\/\}$/.exec(before); // 本文に */ を含めない（前の画像のコメントから読み始めない）
  return m ? m[1].trim() : null;
}

/** 画像タグの caption 属性（無ければ null） */
export function captionFor(content, name) {
  const t = imageTagFor(content, name);
  if (!t) return null;
  const m = /\bcaption=(?:"([^"]*)"|\{["'`]([^"'`]*)["'`]\})/.exec(t.tag);
  return m ? (m[1] ?? m[2]) : null;
}

/** 出典コメントの書き方から読める種別（台帳との食い違いを見るためだけに使う）。読めなければ null */
export function commentKind(text) {
  if (!text) return null;
  if (/AI\s*(?:生成|変換)/.test(text)) return 'ai';
  if (/Wikimedia|CC[ -]?BY|CC0|Public Domain/i.test(text)) return 'cc-photo';
  return null;
}

/** 比率が aspect（[幅, 高さ]）から tolerance（割合）以内か */
export function aspectOk(w, h, { aspect, tolerance }) {
  const want = aspect[0] / aspect[1];
  return Math.abs(w / h - want) / want <= tolerance;
}

/** 生成の指示のハッシュ（先頭 16 桁）。指示を書き換えると実績の記録が効かなくなり「未生成」へ戻る */
export function promptSha(prompt) {
  return createHash('sha256').update(String(prompt).trim()).digest('hex').slice(0, 16);
}

/**
 * AI 画像の状態（仕様＝provenance と実績＝AI 画像の台帳から導く。手で「済」と書く欄は持たない）。
 *   not-generated … 仕様に指示があるのに、今の画像がその指示から作られた記録が無い（指示を変えた・手で差し替えた）
 *   unreviewed    … 指示から作って配置したが、実物どおりかの判定が無い
 *   failed        … 実物と違うと判定された（指示を直して作り直す）
 *   ok            … 生成・配置・判定が今の画像でそろっている
 * 指示の無い古い AI 画像（2026-10-07 より前）は、今の画像の判定だけを見る。
 */
export function aiPhotoStatus({ entry, rec, sha }) {
  const current = rec && rec.sha === sha ? rec : null;
  if (entry?.prompt && (!current || current.promptSha !== promptSha(entry.prompt))) return 'not-generated';
  if (!current || !current.verdict) return 'unreviewed';
  return current.verdict === 'ok' ? 'ok' : 'failed';
}

const AI_STATUS_FINDING = {
  'not-generated': ['ai-not-generated', '仕様の指示から作った記録が今の画像に無い（npm run gen-article-photo -- --fig <figKey> で生成して配置する）'],
  unreviewed: ['ai-unreviewed', 'AI 画像が実物どおりかの判定が今の画像に無い（ai-image-fidelity-auditor で判定して record-ai で記録する）'],
};

/**
 * 1 枚の画像の違反（日本語の説明つき）。公開記事が参照しているラスター画像だけを渡す。
 * size: 画像の [幅, 高さ]。aiPhoto: config/image-limits.json の aiPhoto（写真の比率）。
 */
export function originFindings({ figKey, origin, comment, caption, sha, ledger, size = null, aiPhoto = null }) {
  const out = [];
  if (!origin) {
    out.push({ kind: 'missing-origin', detail: '出所の記録が無い（図の出典の台帳 figure-sources の provenance に kind を書く）' });
    return out;
  }
  if (commentKind(comment) === 'ai' && !AI_KINDS.has(origin.kind)) out.push({ kind: 'comment-mismatch', detail: `出典コメントは AI 画像と書くのに、台帳の種別は ${origin.kind}` });
  if (commentKind(comment) === 'cc-photo') out.push({ kind: 'photo-not-ai', detail: '実写（CC 等）を使っている。写真は AI で生成した画像に置き換える（npm run gen-article-photo）' });
  if (origin.kind === 'public-data') {
    // 公共データ利用規約・政府標準利用規約は出典（提供者）の表示を求める
    if (!caption || !caption.includes(origin.entry.credit)) out.push({ kind: 'attribution-missing', detail: `公的資料の caption に提供者「${origin.entry.credit}」が無い（利用条件が出典の表示を求める）` });
  }
  if (AI_KINDS.has(origin.kind)) {
    if (size && aiPhoto && !aspectOk(size[0], size[1], aiPhoto)) out.push({ kind: 'ai-aspect', detail: `写真の比率が ${aiPhoto.aspect.join(':')} でない（${size[0]}×${size[1]}）` });
    const rec = ledger?.figures?.[figKey];
    const status = aiPhotoStatus({ entry: origin.entry, rec, sha });
    if (AI_STATUS_FINDING[status]) out.push({ kind: AI_STATUS_FINDING[status][0], detail: AI_STATUS_FINDING[status][1] });
    if (status === 'failed') out.push({ kind: 'ai-failed', detail: `AI 画像が実物と違うと判定された: ${rec.reason}（指示を直して作り直す）` });
  }
  return out;
}

export function emptyAiLedger() {
  return {
    schemaVersion: 1,
    note: 'AI 画像の実績（どの指示から作って配置したか＝promptSha・実物どおりかの判定＝verdict）。sha が今の画像と一致する記録だけが効く。手で編集しない（生成と配置は npm run gen-article-photo、判定は node scripts/check-image-origin.mjs record-ai）',
    figures: {},
  };
}

/** 素材（コンテンツ台帳の media）の判定の鍵。'media:<素材 ID>' */
export const MEDIA_KEY_RE = /^media:([a-z0-9][a-z0-9/._-]*)$/;
export function mediaIdOfKey(figKey) {
  return typeof figKey === 'string' ? (MEDIA_KEY_RE.exec(figKey)?.[1] ?? null) : null;
}

/**
 * 判定 1 件の検査。誤りの説明の配列（空なら正しい）。
 * 鍵は記事の画像（…/img/…）か素材（media:<素材 ID>）。素材は mediaById（素材 ID → 台帳の行）に実在し、
 * 判定に sha を添えるなら素材の sha256 の先頭 16 桁と一致すること。
 */
export function validateAiVerdict(v, mediaById = new Map()) {
  const errs = [];
  if (!v || typeof v !== 'object') return ['判定がオブジェクトでない'];
  const mid = mediaIdOfKey(v.figKey);
  if (mid) {
    const m = mediaById.get(mid);
    if (!m) errs.push(`${v.figKey}: 台帳に無い素材 ID`);
    else {
      if (m.provenance?.kind !== 'ai-generated') errs.push(`${v.figKey}: 素材の来歴が AI 生成でない（${m.provenance?.kind ?? '記録なし'}）`);
      if (v.sha != null && v.sha !== String(m.sha256).slice(0, 16)) errs.push(`${v.figKey}: sha が素材の sha256 の先頭 16 桁と違う（${v.sha}）`);
    }
  } else if (typeof v.figKey !== 'string' || !v.figKey.includes('/img/')) errs.push(`figKey が不正: ${v.figKey}`);
  if (!AI_VERDICTS.includes(v.verdict)) errs.push(`${v.figKey}: verdict は ${AI_VERDICTS.join(' / ')} のいずれか（${v.verdict}）`);
  if (typeof v.reason !== 'string' || v.reason.trim().length < 8) errs.push(`${v.figKey}: reason（判定の根拠）が無い`);
  return errs;
}
