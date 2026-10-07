/**
 * figure-source-wiring.mjs — 記事の図と、その原典（参考文献台帳 config/reference-sources.json）の結線。
 *
 * 2026-10-07（DN-0563・DN-0564）: 図を切り出し直すとき、記事の frontmatter `sources:` から原典の PDF・ページの向き・
 * 文字起こしを引けず、worker が vault の固定フォルダを pdftotext で探し、白書はネットから取得した。
 * ここでは次の 2 つを純関数で持つ（読み込みは呼び出し側）。
 *   1. 図の切り出し直しの原典候補（記事の sources → 参考文献 → vault の実パス）
 *   2. 図の出典（config/figure-sources.json の provenance）と記事の sources の突き合わせ（宣言もれ・流用不可の書籍からの切り出し）
 *
 * 試験ページ（公式の設問を含むページ）の図は試験の図であり、問題解説集のスキャンは媒体にすぎない。
 * そのため試験ページでは書籍の宣言を求めず、市販書籍（figureReuse: false）からの切り出しも許す。
 */

import { OFFICIAL_QUESTION_PAGE } from './official-question-text.mjs';

const VAULT_PREFIX = 'vault:';

/** 記事ディレクトリ（content/site 相対）が試験ページか。 */
export function isExamArticle(articleDir) {
  return OFFICIAL_QUESTION_PAGE.test(`content/site/${articleDir}/article.mdx`);
}

/** frontmatter の sources（"id#詳細" を含む）から id だけを取り出す。 */
export function sourceIdsOf(sources) {
  return (Array.isArray(sources) ? sources : []).filter((s) => typeof s === 'string').map((s) => s.split('#')[0].trim());
}

/** 図の出典パス（vault:原資料PDF/...）がどの参考文献の原本かを返す（最長一致・無ければ null）。 */
export function refForVaultPath(pdfPath, cfg) {
  if (typeof pdfPath !== 'string' || !pdfPath.startsWith(VAULT_PREFIX)) return null;
  const p = pdfPath.slice(VAULT_PREFIX.length).normalize('NFC');
  let best = null;
  let bestLen = -1;
  for (const s of cfg.sources || []) {
    const dir = s.origin?.kind === 'drive' ? s.origin.vaultDir.normalize('NFC').replace(/\/+$/, '') : null;
    if (dir && p.startsWith(dir + '/') && dir.length > bestLen) { best = s; bestLen = dir.length; }
    for (const c of s.vaultCopies || []) {
      const cp = c.path.normalize('NFC');
      if (p === cp && cp.length > bestLen) { best = s; bestLen = cp.length; }
    }
  }
  return best;
}

/**
 * 図の出典と記事の sources を突き合わせる。
 * @param {{ provenance: Record<string, { pdf: string }>, cfg: object, articleSources: Map<string, string[]|null> }} input
 *   provenance は config/figure-sources.json の図ごとの出典。articleSources は記事ディレクトリ → sources の id（記事が無ければ無い）
 * @returns {{ checked: number, findings: Array<{ kind: string, figKey: string, articleDir: string, refId: string, detail: string }> }}
 */
export function figureSourceFindings({ provenance, cfg, articleSources }) {
  const findings = [];
  let checked = 0;
  for (const [figKey, src] of Object.entries(provenance || {})) {
    const ref = refForVaultPath(src?.pdf, cfg);
    if (!ref) continue;
    const articleDir = figKey.split('/img/')[0];
    const declared = articleSources.get(articleDir);
    if (declared == null) continue; // 記事が無い（削除済み）図は対象外
    checked++;
    const rule = cfg.classes?.[ref.class];
    if (isExamArticle(articleDir)) {
      const examDeclared = declared.some((id) => cfg.sources.find((s) => s.id === id)?.class === 'exam-official');
      if (ref.class !== 'exam-official' && !examDeclared) {
        findings.push({ kind: 'figure-source-exam-undeclared', figKey, articleDir, refId: ref.id,
          detail: `試験の図を ${ref.id} のスキャンから切り出したが、記事の sources に試験の原典（exam-official）が無い` });
      }
      continue;
    }
    if (!declared.includes(ref.id)) {
      findings.push({ kind: 'figure-source-undeclared', figKey, articleDir, refId: ref.id,
        detail: `図を ${ref.id} から切り出したのに、記事の sources に ${ref.id} が無い` });
    }
    if (rule?.figureReuse === false) {
      findings.push({ kind: 'figure-reuse-forbidden', figKey, articleDir, refId: ref.id,
        detail: `${ref.id}（${ref.class}）は図の流用不可なのに、試験ページでない記事へ図を切り出した` });
    }
  }
  return { checked, findings };
}

const pad3 = (n) => String(n).padStart(3, '0');

/**
 * 図の切り出し直しの原典候補を、記事の sources（と試験ページなら資格のスキャン媒体・公式過去問のフォルダ）から作る。
 * 試験ページでない記事で、原本を持つのに figureReuse: false の原典（市販書籍）は候補に入れず forbidden に返す
 * （流用不可の図を作り直さない）。法令・規格（external-primary）は原本を持たない参照なので候補にも forbidden にも入れない。
 * @param {{ articleDir: string, sourceIds: string[], cfg: object, vaultRoot: string|null, scanRefIds?: string[], examDir?: string|null }} input
 *   examDir は公式過去問の原本のフォルダ（vault 相対・過去問の在庫 pastexams.inventory の dir から導く）
 */
export function sourceCandidatesFor({ articleDir, sourceIds, cfg, vaultRoot, scanRefIds = [], examDir = null }) {
  const exam = isExamArticle(articleDir);
  const ids = [...new Set([...sourceIds, ...(exam ? scanRefIds : [])])];
  const abs = (rel) => (vaultRoot ? `${vaultRoot}/${rel}` : `vault:${rel}`);
  const candidates = [];
  const forbidden = [];
  if (exam && examDir) {
    candidates.push({ id: 'past-exam-inventory', title: '公式過去問の原本', class: 'exam-official', files: [abs(examDir)],
      note: '年度ごとのファイルは過去問の在庫（データセット pastexams.inventory）の years[].files。公式 PDF に図が無い年度は下の問題解説集を使う' });
  }
  for (const id of ids) {
    const s = (cfg.sources || []).find((x) => x.id === id);
    if (!s || s.class === 'external-primary') continue;
    const hasOriginal = s.origin?.kind === 'drive' || (s.vaultCopies || []).length > 0;
    if (!exam && hasOriginal && cfg.classes?.[s.class]?.figureReuse === false) { forbidden.push(id); continue; }
    const c = { id: s.id, title: s.title, class: s.class, files: [] };
    if (s.bookBundle && s.origin?.kind === 'drive') {
      c.files = [...s.bookBundle.sourceFiles].sort((a, b) => a.order - b.order).map((f) => abs(`${s.origin.vaultDir}/source/${pad3(f.order)}.pdf`));
      if (s.bookBundle.renderProfile?.rotation != null) c.rotation = s.bookBundle.renderProfile.rotation;
      c.ocrDir = abs(`${s.origin.vaultDir}/ocr`);
      c.note = 'OCR の各ページ冒頭に <!-- pNNNN 印字:N --> がある。図番号（図2.41 等）で grep すると PDF のページ（pNNNN＝source の NNNN ページ）が分かる';
    } else if (s.origin?.kind === 'drive') {
      c.files = [abs(s.origin.vaultDir)];
    }
    for (const v of s.vaultCopies || []) c.files.push(abs(v.path));
    if (c.files.length === 0) {
      if (s.class === 'exam-official' && exam && examDir) continue; // 公式過去問は上のフォルダが候補
      if (s.origin?.url) c.url = s.origin.url;
      c.note = 'vault に写しが無い。ネットから取得しない（取得は運営者の了解が要る）。必要なら source-unavailable にして URL を reason に書く';
    }
    candidates.push(c);
  }
  return { exam, candidates, forbidden };
}
