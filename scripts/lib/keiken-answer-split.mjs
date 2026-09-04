import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative, sep } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';

export const SCAN_TARGETS = [
  { kind: 'dir', path: 'content/note/1級・2級土木', label: 'note（1級・2級土木）' },
  { kind: 'dir', path: 'content/site/civil-construction-1', label: 'site（1級）' },
  { kind: 'dir', path: 'content/site/civil-construction-2', label: 'site（2級）' },
  { kind: 'dir', path: 'content/coconala/blog', label: 'ココナラブログ' },
  { kind: 'dir', path: '.claude/config/coconala/assets/moshi-src', label: 'ココナラ模試ソース', optionalHydrated: true },
  { kind: 'dir', path: 'content/sns', label: 'SNS（X・video-packs・Instagram・YouTube）' },
  { kind: 'dir', path: 'content/kindle', label: 'Kindle' },
  { kind: 'dir', path: '.claude/agents', label: 'エージェント定義' },
  { kind: 'dir', path: 'docs', label: 'docs' },
  { kind: 'zip-glob', path: 'content/brain/dist', suffix: '.zip', label: 'Brain 配布 ZIP' },
  { kind: 'file', path: '.claude/config/coconala-listings.json', label: 'ココナラ出品 SSOT' },
  { kind: 'file', path: 'content/brain/listings.json', label: 'Brain 出品 SSOT' },
];

const TEXT_EXTENSIONS = new Set(['.md', '.mdx', '.json', '.txt', '.yaml', '.yml']);
const LEGACY = /legacy3|旧(?:3項目|形式)|令和\s*5年度以前|令和\s*[0-5]年度|R0?[0-5](?:\b|〜|まで)|〜\s*R0?5|以前の形式/iu;
const CURRENT = /current2|現行(?:2項目|2テーマ|形式)|令和\s*6年度以降|R0?[6-9](?:\b|〜|以降)|R06〜/iu;
const RELEVANT = /現場状況|技術的課題|留意した事項|検討|対応処置|対応した処置|処置|対策|措置|評価|結果|効果/;
const KENTO = /検討(?:した)?(?:内容|項目|事項|案|方法|結果)?/;
const RESPONSE = /対応(?:した)?(?:処置|措置|策|方法)|対応処置|講じた(?:処置|措置|対策)|処置|対策|措置/;
const EVALUATION = /評価|効果|結果(?:を|が|は|の確認|として)/;
const SITUATION = /現場状況|施工条件|周辺(?:の)?状況/;
const CHALLENGE = /技術的課題|留意した事項|課題/;
const MARKER = /(?:設問\s*[（(]\s*([１２12])\s*[)）]|[（(]\s*([１２12])\s*[)）]|([①②]))/gu;

const toPosix = (p) => p.split(sep).join('/');
const digit = (s) => ({ '１': 1, '２': 2, '1': 1, '2': 2, '①': 1, '②': 2 }[s]);

export function gradeFromPath(file) {
  const segs = file.split(/[\\/!]/);
  if (segs.some((s) => s === 'civil-construction-2' || s === '2級土木' || /^C9-2級/.test(s))) return 'civil-2';
  if (segs.some((s) => s === 'civil-construction-1' || s === '1級土木' || /^C8-1級/.test(s))) return 'civil-1';
  const base = basename(file);
  if (/(?:^|[^0-9])civil-2(?:\.|$|-)|2級/.test(base)) return 'civil-2';
  if (/(?:^|[^0-9])civil-1(?:\.|$|-)|1級/.test(base)) return 'civil-1';
  return null;
}

function oneGrade(text) {
  const g1 = /civil-1|1級|１級/.test(text);
  const g2 = /civil-2|2級|２級/.test(text);
  return g1 === g2 ? null : g1 ? 'civil-1' : 'civil-2';
}

function stripMarkup(line) {
  return line.replace(/\\r\\n|\\n/g, ' ').replace(/[*_`]/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function contextsOf(text, file) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const contexts = [];
  const heads = [];
  let lastFormat = null;
  const pathLegacy = /secondary-r0?[0-5](?:\b|\/)|(?:^|\/)R0?[0-5](?:\/|\b)/i.test(file);
  const frontmatterGrade = oneGrade((text.match(/^---\n([\s\S]*?)\n---/) || [])[1] || '');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const hm = raw.match(/^(#{1,6})\s+(.+)$/);
    if (hm) {
      const level = hm[1].length;
      heads.length = level - 1;
      heads[level - 1] = stripMarkup(hm[2]);
    }
    const heading = heads.filter(Boolean).join(' / ');
    const local = `${heading} ${stripMarkup(raw)}`;
    if (LEGACY.test(local) && !CURRENT.test(local)) lastFormat = 'legacy';
    if (CURRENT.test(local) && !LEGACY.test(local)) lastFormat = 'current';
    const legacy = LEGACY.test(heading) ? true
      : CURRENT.test(heading) ? false
        : lastFormat === 'legacy' ? true
          : lastFormat === 'current' ? false : pathLegacy;
    contexts.push({ raw, line: i + 1, heading, legacy, grade: oneGrade(heading) || frontmatterGrade || gradeFromPath(file) });
  }
  return contexts;
}

function gradeFragments(line, fallbackGrade) {
  const matches = [...line.matchAll(/civil-[12]|[１２12]級/g)];
  const grades = new Set(matches.map((m) => /(?:civil-1|[１1]級)/.test(m[0]) ? 'civil-1' : 'civil-2'));
  // 行頭側で級を明示している比較説明は、ファイル側の級より行内ラベルを優先する。
  // 一方「設問(2)は…、1級とは逆」のように欄説明の後へ出る級名は比較対象なので fallback を保つ。
  if (grades.size < 2) {
    const firstMarker = line.search(MARKER);
    const explicitGradeLeads = grades.size === 1 && (firstMarker < 0 || matches[0].index < firstMarker);
    return [{ text: line, grade: explicitGradeLeads ? [...grades][0] : fallbackGrade }];
  }
  const out = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : line.length;
    const fragment = line.slice(start, end);
    if (!RELEVANT.test(fragment) && !/[（(][１２12][)）]|[①②]|設問\s*[１２12]/.test(fragment)) continue;
    out.push({ text: fragment, grade: /(?:civil-1|[１1]級)/.test(matches[i][0]) ? 'civil-1' : 'civil-2' });
  }
  return out.length ? out : [{ text: line, grade: fallbackGrade }];
}

function markerClaims(line) {
  if (!RELEVANT.test(line)) return [];
  // JSON の summary items で使う ①→②→③… は手順番号であり、解答欄 (1)/(2) ではない。
  // 「設問」「解答欄」を明示する場合だけ、3 項目以上の列挙でも欄番号として検査する。
  if (/[①②]/.test(line) && /[③④⑤]/.test(line) && !/設問|解答欄/.test(line)) return [];
  if (/[①②]/.test(line) && !/設問|解答欄|現場状況|技術的課題|検討(?:した)?項目|対応処置/.test(line)) return [];
  let matches = [...line.matchAll(MARKER)].map((m) => ({
    index: m.index, end: m.index + m[0].length,
    slot: digit(m[1] || m[2] || m[3]), token: m[0],
  }));
  // 見出し・表で使われる「設問2：検討項目」の裸番号。括弧なしのテーマ番号と
  // 混同しないよう、コロンと解答要素の両方がある場合だけ内側の解答欄として扱う。
  if (!matches.length) {
    const m = line.match(/設問\s*([１２12])\s*[:：]\s*(?=[^\n]*(?:現場状況|技術的課題|検討|対応処置|評価))/);
    if (m) matches = [{ index: m.index, end: m.index + m[0].length, slot: digit(m[1]), token: m[0] }];
  }
  // 裸の「設問1/設問2」は通常はテーマ番号。書く欄を明示する散文だけを D 型として扱う。
  if (!matches.length && /設問\s*[１２12]\s*(?:では|には|に).{0,50}(?:書|記述|入れ|盛り込)/.test(line)) {
    const m = line.match(/設問\s*([１２12])/);
    matches = [{ index: m.index, end: m.index + m[0].length, slot: digit(m[1]), token: m[0] }];
  }
  if (!matches.length) return [];
  if (matches.length >= 3 && /3点|三点|理由|減点/.test(line)
      && !/解答欄|設問形式|current2|現行形式|記述しなさい/.test(line)) return [];
  // nested reference の「(2) (1)で記述した…」「(2) (1)の技術的課題…」にある
  // 後続 (1) は新しい解答欄ではない。一方、同じ行のチェックリスト
  // 「(1) に現場状況…、(2) に検討…」の (2) は独立した欄なので、単なる「に」は残す。
  const filtered = matches.filter((m, i) => i === 0
    || !/^(?:で|の|へ|に(?:記述|示|挙|述|書|記載))/.test(line.slice(m.end).trimStart()));
  return filtered.map((m, i) => ({
    slot: m.slot, token: m.token,
    text: stripMarkup(line.slice(m.index, i + 1 < filtered.length ? filtered[i + 1].index : line.length)).split('。')[0],
    paired: filtered.length > 1, source: stripMarkup(line),
  }));
}

function isKentoAssignment(text) {
  if (!KENTO.test(text)) return false;
  if (/検討(?:した)?(?:内容|項目|事項|案|方法|結果)?\s*(?:の|への|に対する|に対応する|ごとの|別の|を踏まえた|に基づく|に対して(?:講じた|実施した)?)\s*(?:対応)?(?:処置|措置|策|方法|対応)/.test(text)) return false;
  if (/[（(]\s*[１1]\s*[)）]\s*で.{0,30}検討.{0,20}(?:の|への|に対する)\s*(?:対応)?(?:処置|措置|策|方法|対応)/.test(text)) return false;
  return true;
}

function violationType(line, fallback = 'A') {
  if (/配点|採点|チェック|要素|内訳|評価表|ルーブリック/.test(line)) return 'C';
  if (/では|には|書(?:く|き|かせ)|記述|入れ(?:る|ます)|盛り込/.test(line)) return 'D';
  return fallback;
}

function pushViolation(out, { file, line, grade, slot = 0, quote, type, why }) {
  const key = `${file}:${line}:${grade}:${slot}:${type}:${quote}`;
  if (out.some((v) => v.key === key)) return;
  out.push({ key, file, line, grade, slot, quote, type, why });
}

function checkClaim(claim, context, file, grade, out) {
  const text = claim.text;
  const source = claim.source;
  const hasKento = KENTO.test(text);
  const hasResponse = RESPONSE.test(text);
  const hasEvaluation = EVALUATION.test(text);
  const hasSituation = SITUATION.test(text);
  const hasChallenge = CHALLENGE.test(text);
  const explicitInstruction = CURRENT.test(context.heading)
    || /current2|現行形式|解答欄|割り振|設問要求|問題文|テンプレ|それぞれ|書(?:く|き|かせ)|記述しなさい|入れ(?:る|ます)|盛り込/.test(source);
  const complete = explicitInstruction
    || (/^設問/.test(claim.token) && /記述|書|入れ|盛り込/.test(source))
    || (claim.paired && /解答欄|設問形式|current2|現行形式|それぞれ|記述/.test(source));
  const allocationLike = explicitInstruction || /^設問\s*[（(]/.test(claim.token)
    || (/配点|採点|チェック|要素|内訳|回答の目安|設問形式|問題1/.test(context.heading)
      && /^(?:[-|> ]*)?[（(①②]/.test(source));
  const type = violationType(`${context.heading} ${source}`);

  if (/流用すると|誤(?:り|：|:)|修正前|NG|間違|収まらない|事故|違反を検出|再発防止|減点される|3点で減点/.test(source)) return;

  if (allocationLike && grade === 'civil-1' && claim.slot === 2 && isKentoAssignment(text)) {
    pushViolation(out, { file, line: context.line, grade, slot: 2, quote: source, type,
      why: '1級の(2)に検討項目そのものを割り当てている。検討項目は(1)、(2)は「(1)で検討した項目の対応処置とその評価」' });
  }
  if (allocationLike && grade === 'civil-2' && claim.slot === 1 && isKentoAssignment(text)) {
    pushViolation(out, { file, line: context.line, grade, slot: 1, quote: source, type,
      why: '2級の(1)に検討項目を割り当てている。2級の検討項目は(2)側' });
  }
  if (!complete) return;
  if (grade === 'civil-1' && claim.slot === 1 && (hasSituation || hasChallenge) && !hasKento) {
    pushViolation(out, { file, line: context.line, grade, slot: 1, quote: source, type,
      why: '1級の現行(1)の完全な案内なのに「検討した項目」が欠けている' });
  }
  if (grade === 'civil-1' && claim.slot === 2 && hasResponse && !hasEvaluation) {
    pushViolation(out, { file, line: context.line, grade, slot: 2, quote: source, type,
      why: '1級の現行(2)の完全な案内なのに「その評価」が欠けている' });
  }
  const officialR06Alternative = /[（(]\s*[１1]\s*[)）]\s*で記述した留意事項に対して講じた対策とその理由/.test(source);
  if (grade === 'civil-2' && claim.slot === 2 && (hasKento || hasResponse) && (!hasKento || !hasResponse) && !officialR06Alternative) {
    pushViolation(out, { file, line: context.line, grade, slot: 2, quote: source, type,
      why: '2級の現行(2)は「検討した項目」と「その対応処置」の両方が必要' });
  }
  if (grade === 'civil-2' && claim.slot === 2 && hasEvaluation
      && /必須|書(?:く|き|かせ)|記述|含め|配点|採点|チェック/.test(text)
      && !/必須(?:要素)?にしない|必須ではない|不要/.test(text)) {
    pushViolation(out, { file, line: context.line, grade, slot: 2, quote: source, type: 'C',
      why: '2級の現行(2)で評価・結果を必須要素としている。設問要求は検討項目と対応処置まで' });
  }
}

function sheetLinesOf(text) {
  const ns = [...text.matchAll(/\[\[記入欄:\s*(\d+)/g)].map((m) => Number(m[1]));
  if (!ns.length) return null;
  const counts = new Map();
  for (const n of ns) counts.set(n, (counts.get(n) || 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0][0];
}

function checkMeasurements(fragment, context, file, grade, limits, sheetLinesHint, out) {
  const line = stripMarkup(fragment);
  if (/工事概要/.test(line)) return;
  if (!/(?:各区画|[1１]区画|(?:問題\s*1|施工経験|現行2|current2|設問\s*[（(][１２12][)）]).{0,80}\d+\s*(?:行|文字|字)|解答欄.{0,50}\d+\s*(?:行|文字|字)|\d+\s*行\s*[・×xX]\s*\d+\s*(?:文字|字))/.test(line)) return;
  const expected = limits?.grades?.[grade]?.limits?.current2_q1?.maxChars;
  if (!expected) return;
  const targetLanguage = /目標|95\s*%|余裕を残|答案本文/.test(line);
  for (const m of line.matchAll(/(\d{2,3})\s*(?:文字|字)(?:程度|前後|以内|目安|上限)?/g)) {
    const chars = Number(m[1]);
    const before = line.slice(Math.max(0, m.index - 8), m.index);
    const after = line.slice(m.index + m[0].length, m.index + m[0].length + 4);
    if (/合計(?:約)?\s*$/.test(before)) continue;
    if (/1行|１行/.test(before) || /^[／/]\s*行/.test(after)) continue;
    if (chars === expected) continue;
    if (chars < expected && line.includes(`${expected}字`) && (targetLanguage || /8割|８割|以内.{0,20}上限/.test(line))) continue;
    if (line.startsWith('|') && line.includes(`${expected}字`)) continue;
    pushViolation(out, { file, line: context.line, grade, quote: line, type: 'B', why: `現行解答欄の字数案内 ${chars}字 が SSOT ${expected}字 と一致しない` });
  }

  const lineNumbers = [...line.matchAll(/(\d{1,2})\s*行/g)]
    .filter((m) => !/^(?:あたり|当たり|につき)/.test(line.slice(m.index + m[0].length).trimStart()))
    .map((m) => Number(m[1]));
  if (!lineNumbers.length) return;
  const expectedLines = grade === 'civil-1' ? 8 : sheetLinesHint;
  if (expectedLines) {
    for (const n of lineNumbers) {
      if (n === expectedLines) continue;
      pushViolation(out, { file, line: context.line, grade, quote: line, type: 'B', why: `現行解答欄の行数案内 ${n}行 が${grade === 'civil-1' ? '1級の実寸8行' : `同一教材の記入欄${expectedLines}行`}と一致しない` });
    }
  } else if (grade === 'civil-2' && /各(?:区画|欄)\s*(?:=|は)|解答欄.{0,20}\d+\s*行|現行.{0,20}\d+\s*行/.test(line)) {
    pushViolation(out, { file, line: context.line, grade, quote: line, type: 'B', why: '2級に一律の固定行数を案内しているが、SSOT は250字のみ。行数は対象年度または同一教材の実物確認が必要' });
  }
}

function checkLegacyAsCurrent(fragment, context, file, grade, out) {
  const line = stripMarkup(fragment);
  const scoped = `${context.heading} ${line}`;
  const oldThreeForm = /3項目(?:形式|構成|の設問|に分か|で書)|3段(?:階)?構成|設問\s*[（(]?3/;
  const assertsCurrentThree = new RegExp(`(?:令和\\s*6年度以降|current2|現行形式).{0,100}(?:${oldThreeForm.source})`).test(scoped)
    || new RegExp(`(?:${oldThreeForm.source}).{0,100}(?:令和\\s*6年度以降|current2|現行形式)`).test(scoped)
    || (/令和\s*6年度以降.{0,140}(?:変わっていない|そのまま|同じ)/.test(scoped) && /課題.{0,30}検討.{0,30}(?:処置|対応)/.test(scoped));
  if (assertsCurrentThree && !/旧(?:3項目|形式)|令和\s*5年度以前|とは異な|区切りが違/.test(line)) {
    pushViolation(out, { file, line: context.line, grade, quote: line, type: 'E', why: '旧3項目形式を令和6年度以降の現行形式として提示している' });
  }
  if (!context.legacy && /設問\s*[（(]\s*[３3]\s*[)）]/.test(line) && CURRENT.test(`${context.heading} ${line}`)) {
    pushViolation(out, { file, line: context.line, grade, slot: 3, quote: line, type: 'E', why: '現行形式の節に設問(3)を置いている。設問(3)が正しいのは旧形式（〜R05）の節だけ' });
  }
}

export function analyzeText({ text, file = '<memory>', limits, sheetLinesHint = null }) {
  const out = [];
  if (!/施工経験記述|経験記述|current2|legacy3|現行形式/.test(text)
      && !/secondary-experience|civil-essay|moshi-src|C[89]-[１２12]級/.test(file)) {
    return { violations: [], claims: 0, measurements: 0, sheetLines: null };
  }
  const contexts = contextsOf(text, file);
  const centralFile = /secondary-experience|civil-essay|moshi-src|C[89]-[１２12]級|経験記述|keiken/.test(file);
  const ownSheetLines = sheetLinesOf(text);
  let claims = 0;
  let measurements = 0;
  for (const context of contexts) {
    if (context.legacy) continue;
    if (!centralFile && !/施工経験|経験記述|current2|legacy3|現行形式/.test(`${context.heading} ${context.raw}`)) continue;
    for (const fragment of gradeFragments(context.raw, context.grade)) {
      if (!fragment.grade) continue;
      if (!context.grade && !gradeFromPath(file)
          && !/施工経験|経験記述|current2|legacy3|解答欄|現行形式/.test(fragment.text)) continue;
      checkLegacyAsCurrent(fragment.text, context, file, fragment.grade, out);
      const before = out.length;
      checkMeasurements(fragment.text, context, file, fragment.grade, limits, ownSheetLines || sheetLinesHint, out);
      if (out.length > before || /\d+\s*(?:行|文字|字)/.test(fragment.text)) measurements++;
      for (const claim of markerClaims(fragment.text)) {
        claims++;
        checkClaim(claim, context, file, fragment.grade, out);
      }
    }
  }
  const violations = out.map((v) => ({
    file: v.file,
    line: v.line,
    grade: v.grade,
    slot: v.slot,
    quote: v.quote,
    type: v.type,
    why: v.why,
  }));
  return { violations, claims, measurements, sheetLines: ownSheetLines };
}

function walkTextFiles(abs, out = []) {
  if (!existsSync(abs)) return out;
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const p = join(abs, entry.name);
    if (entry.isDirectory()) walkTextFiles(p, out);
    else if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) out.push(p);
  }
  return out;
}

function zipDocuments(abs, rel) {
  const files = unzipSync(new Uint8Array(readFileSync(abs)));
  const out = [];
  for (const [entry, bytes] of Object.entries(files)) {
    if (!bytes.length || !TEXT_EXTENSIONS.has(extname(entry).toLowerCase())) continue;
    out.push({ file: `${rel}!${entry}`, text: strFromU8(bytes), group: `${rel}!${dirname(entry)}` });
  }
  return out;
}

export function collectDocuments(root, targets = SCAN_TARGETS) {
  const documents = [];
  const scopes = [];
  for (const target of targets) {
    const abs = join(root, target.path);
    let docs = [];
    let exists = existsSync(abs);
    if (target.kind === 'dir' && exists) {
      docs = walkTextFiles(abs).map((p) => ({ file: toPosix(relative(root, p)), text: readFileSync(p, 'utf8'), group: toPosix(dirname(relative(root, p))) }));
    } else if (target.kind === 'file' && exists && statSync(abs).isFile()) {
      docs = [{ file: target.path, text: readFileSync(abs, 'utf8'), group: toPosix(dirname(target.path)) }];
    } else if (target.kind === 'zip-glob' && exists) {
      const zips = readdirSync(abs).filter((name) => name.endsWith(target.suffix));
      exists = zips.length > 0;
      for (const name of zips) docs.push(...zipDocuments(join(abs, name), `${target.path}/${name}`));
    }
    documents.push(...docs.map((d) => ({ ...d, scope: target.label })));
    scopes.push({ ...target, exists, documents: docs.length });
  }
  return { documents, scopes };
}

export function analyzeDocuments(documents, limits) {
  const groupSheetLines = new Map();
  for (const doc of documents) {
    const n = sheetLinesOf(doc.text);
    if (n) groupSheetLines.set(`${doc.group}:${gradeFromPath(doc.file) || oneGrade(doc.text) || ''}`, n);
  }
  return documents.map((doc) => {
    const grade = gradeFromPath(doc.file) || oneGrade(doc.text) || '';
    return { ...doc, ...analyzeText({ text: doc.text, file: doc.file, limits, sheetLinesHint: groupSheetLines.get(`${doc.group}:${grade}`) || null }) };
  });
}

export function loadLimits(root) {
  return JSON.parse(readFileSync(join(root, '.claude/config/keiken-answer-sheet-limits.json'), 'utf8'));
}
