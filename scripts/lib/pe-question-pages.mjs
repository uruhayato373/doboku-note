// 技術士 建設部門の設問ページ（1 設問 1 ページ）の骨組みを、年度×科目のページから機械で作る部品（DN-1073）。
//
// 年度×科目のページ（content/site/pe-construction/r0N-<科目>/article.mdx）の設問の書き方は 2 通り:
//   - R07 の選択科目: `## II-1` の下に `**II-1-1** 本文` が並ぶ（III は `## III-1` の下に `III-1 本文`）
//   - R08 の選択科目と必須科目I: 設問ごとに `## II-1-1`（`## I-1`）の見出しがあり、その下が本文
// どちらも、選択の指示の文（`I 次の…` `II-1 次の…` `II-2 次の…` `III 次の…`）が本文の行として入っている。
// 設問ページの問題文の節は「## <設問番号> 問題文」＋出典の行＋指示の文＋設問の本文（先頭に設問番号）の形にそろえる。

const INSTRUCTION = /^(I|II-1|II-2|III) 次の/;
const QUESTION_ID = /^(I-[12]|II-1-[1-4]|II-2-[12]|III-[12])$/;

/** frontmatter と本文に分ける */
export function splitFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text.replace(/\r\n/g, '\n'));
  if (!m) return { fm: '', body: text };
  return { fm: m[1], body: text.slice(m[0].length) };
}

const fmValue = (fm, key) => {
  const m = new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(fm);
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
};

/** 年度のコード（r07）から 令和7年度・R7 を作る */
export function yearLabels(year) {
  const m = /^r0?(\d+)$/.exec(year);
  if (!m) throw new Error(`年度のコードは r07 の形: ${year}`);
  const n = Number(m[1]);
  return { long: `令和${n === 1 ? '元' : n}年度`, short: `R${n}` };
}

/** 年度ページの題名から科目の名前を取る（「選択科目（0907 道路）」→ 道路、「必須科目I」→ 必須科目I） */
export function subjectLabel(title) {
  const sel = /選択科目（\d+\s+(.+?)）/.exec(title);
  if (sel) return sel[1];
  if (/必須科目I/.test(title)) return '必須科目I';
  throw new Error(`題名から科目を読めない: ${title}`);
}

/** 設問番号の種類（答案用紙の枚数を決める） */
export function questionKind(id) {
  if (/^I-/.test(id)) return { kind: 'I', sheets: 3 };
  if (/^II-1-/.test(id)) return { kind: 'II-1', sheets: 1 };
  if (/^II-2-/.test(id)) return { kind: 'II-2', sheets: 2 };
  if (/^III-/.test(id)) return { kind: 'III', sheets: 3 };
  throw new Error(`設問番号を読めない: ${id}`);
}

const groupOf = (id) => (/^I-/.test(id) ? 'I' : /^III-/.test(id) ? 'III' : id.slice(0, 4));

/** 段落の並び（空行で区切る・行は原文のまま）を前後の空行を落として返す */
const trimBlank = (lines) => {
  let a = 0;
  let b = lines.length;
  while (a < b && !lines[a].trim()) a++;
  while (b > a && !lines[b - 1].trim()) b--;
  return lines.slice(a, b);
};

/**
 * 年度ページを読み、指示の文と設問の本文を返す。
 * @returns {{ title: string, sourcePdf: string|null, tags: string[], sources: string[], instructions: Record<string,string>, questions: Map<string,string[]> }}
 */
export function parseYearPage(text) {
  const { fm, body } = splitFrontmatter(text);
  const title = fmValue(fm, 'title') ?? '';
  const sourcePdf = fmValue(fm, 'source_pdf');
  const list = (key) => {
    const m = new RegExp(`^${key}:\\n((?:\\s+- .*\\n?)+)`, 'm').exec(fm + '\n');
    return m ? m[1].split('\n').map((l) => l.replace(/^\s+- /, '').trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : [];
  };
  const lines = body.split('\n');
  const instructions = {};
  for (const l of lines) {
    const m = INSTRUCTION.exec(l);
    if (m && !instructions[m[1]]) instructions[m[1]] = l;
  }
  const questions = new Map();
  let cur = null;
  const push = (id) => { cur = id; questions.set(id, []); };
  for (const l of lines) {
    const h2 = /^## (.+?)\s*$/.exec(l);
    if (h2) {
      // R08・必須: 設問ごとの見出し。R07: `## II-1` `## III-1` の節（III は見出しが設問番号）
      cur = null;
      if (QUESTION_ID.test(h2[1])) push(h2[1]);
      continue;
    }
    if (INSTRUCTION.test(l)) { cur = null; continue; }
    const bold = /^\*\*((?:II-[12]-\d))\*\*\s*(.*)$/.exec(l);
    if (bold) { push(bold[1]); questions.get(cur).push(`${bold[1]} ${bold[2]}`); continue; }
    if (cur) questions.get(cur).push(l);
  }
  for (const [id, ls] of questions) {
    const t = trimBlank(ls);
    if (t.length && !t[0].startsWith(`${id} `)) t[0] = `${id} ${t[0]}`;
    questions.set(id, t);
  }
  return { title, sourcePdf, tags: list('tags'), sources: list('sources'), instructions, questions };
}

/** 設問ページの問題文の節（## <設問番号> 問題文 から、次の ## の前まで） */
export function questionSection(parsed, id, year) {
  const q = parsed.questions.get(id);
  if (!q) throw new Error(`年度ページに設問 ${id} が無い`);
  const instr = parsed.instructions[groupOf(id)];
  if (!instr) throw new Error(`年度ページに ${groupOf(id)} の選択の指示の文が無い`);
  if (!parsed.sourcePdf) throw new Error('年度ページに source_pdf が無い');
  const { long } = yearLabels(year);
  return [
    `## ${id} 問題文`,
    '',
    `出典は日本技術士会が公表する[${long}の試験問題](${parsed.sourcePdf})です。`,
    '',
    instr,
    '',
    ...q,
  ].join('\n');
}

/** 設問ページの本文から問題文の節を取り出す（無ければ null） */
export function extractQuestionSection(text) {
  const { body } = splitFrontmatter(text);
  const lines = body.split('\n');
  const a = lines.findIndex((l) => /^## \S+ 問題文\s*$/.test(l));
  if (a === -1) return null;
  let b = lines.findIndex((l, i) => i > a && /^## /.test(l));
  if (b === -1) b = lines.length;
  return trimBlank(lines.slice(a, b)).join('\n');
}

/** 設問ページの slug（r07-road-ii-1-1・r07-required-i-1） */
export const questionSlug = (year, subject, id) => `${year}-${subject}-${id.toLowerCase()}`;

const FRAME = {
  'I': ['答案用紙3枚（600字×3）の使い方', ['1枚目：', '2枚目：', '3枚目：']],
  'II-1': ['答案用紙1枚（600字）の使い方', ['前半（約12行）：', '後半（約12行）：']],
  'II-2': ['答案用紙2枚（600字×2）の使い方', ['1枚目：', '2枚目：']],
  'III': ['答案用紙3枚（600字×3）の使い方', ['1枚目：', '2枚目：', '3枚目：']],
};

/**
 * 設問ページの骨組み（published: false）。論点の解説・問われていること・観点・失点は担当が書く。
 * @param {object} o
 * @param {(slug: string) => boolean} o.exists 記事の実在（リンク先の確かめ）
 * @param {string[]} o.yearCodes 同じ科目の年度ページの年度コード（r01〜r08 の実在するもの）
 */
export function scaffoldPage({ parsed, year, subject, id, exists, yearCodes = [] }) {
  const { long, short } = yearLabels(year);
  const label = subjectLabel(parsed.title);
  const { kind } = questionKind(id);
  const [frameTitle, frameItems] = FRAME[kind];
  const tags = parsed.tags.filter((t) => t !== 'past-questions');
  const sources = parsed.sources.filter((s) => s.startsWith('ipej-past-exams'));
  const others = yearCodes.filter((y) => y !== year).map((y) => `- [${yearLabels(y).long} ${label}](/exam/pe-construction/past-exams/${y}-${subject})`);
  const keywordLinks = [`${subject}-exam-themes`, `${subject}-ronbun-keyword`].filter(exists)
    .map((s) => `- [${s.endsWith('-exam-themes') ? `${label} 出題テーマ分析` : `${label} 論文のキーワード`}](/exam/pe-construction/keywords/${s})：`);
  const fm = [
    '---',
    `title: （論点）とは｜技術士 建設部門 ${long} ${label} ${id}`,
    `shortTitle: ${short} ${label} ${id}`,
    'subtitle: （論点）',
    'category: pe-construction',
    'group: past-exam',
    'officialQuestions: true',
    'tags:',
    ...tags.map((t) => `  - ${t}`),
    'description: >-',
    `  （論点の中身が分かる 50〜160 字）技術士第二次試験 建設部門 ${long} ${label} ${id}`,
    'published: false',
    `seoTitle: （論点）とは｜技術士 建設部門 ${short} ${label} ${id} の論点と答案の骨子`,
    'ogp:',
    `  title: ${label} ${id}`,
    `  subtitle: ${long} （論点）`,
    'sources:',
    ...sources.map((s) => `  - ${s}`),
    '---',
  ];
  const body = [
    '',
    `{/* TODO: 導入。技術士第二次試験 建設部門 ${long} **${label} ${id}** は… このページでは、答えるのに要る論点を先に解説し、そのうえで問われていること・答案の配分・観点・よくある失点をまとめます。 */}`,
    '',
    questionSection(parsed, id, year),
    '',
    '## 論点の解説：（論点）',
    '',
    '{/* TODO: 事実ファイルにある事実だけで 800〜1,400 字。### で 2〜3 節。出典のリンクを段落に付ける。 */}',
    '',
    '## 問われていること',
    '',
    '{/* TODO */}',
    '',
    '## 答案の骨子',
    '',
    '<SpecSheetList',
    `  title="${frameTitle}"`,
    '  items={[',
    ...frameItems.map((it) => `    "${it}TODO",`),
    '  ]}',
    '  ordered',
    '/>',
    '',
    '## 観点の立て方',
    '',
    '{/* TODO */}',
    '',
    '## よくある失点',
    '',
    '<SpecSheetList',
    '  title="この設問で点を落としやすい書き方"',
    '  items={[',
    '    "TODO",',
    '  ]}',
    '  ordered={false}',
    '/>',
    '',
    '## 使う語句と論点',
    '',
    ...(keywordLinks.length ? keywordLinks : ['{/* TODO */}']),
    '',
    '## 同じ論点の他の年度',
    '',
    `- [${long} ${label}の問題文](/exam/pe-construction/past-exams/${year}-${subject})`,
    '{/* TODO: 同じ論点が出た年度だけ残し、各行に「：〇〇を問われています」を足す。関係しない年度の行は消す */}',
    ...others,
    '',
  ];
  return [...fm, ...body].join('\n');
}

/** frontmatter の tags のうち重複しているもの（2026-11-10 に書く担当のスクリプトの再実行で同じタグが最大 6 回並んだ） */
export function duplicateTags(text) {
  const { fm } = splitFrontmatter(text);
  const m = /^tags:\n((?:\s+- .*\n?)+)/m.exec(fm + '\n');
  if (!m) return [];
  const tags = m[1].split('\n').map((l) => l.replace(/^\s+- /, '').trim()).filter(Boolean);
  return [...new Set(tags.filter((t, i) => tags.indexOf(t) !== i))];
}

/** 論点の解説から、照合が要る文（数字・年月・条番号・出典リンクを含む文）を抜き出す */
export function extractClaims(text) {
  const { body } = splitFrontmatter(text);
  const offset = text.replace(/\r\n/g, '\n').split('\n').length - body.split('\n').length; // frontmatter の行数（ファイルの行番号で返す）
  const lines = body.split('\n');
  const a = lines.findIndex((l) => /^## 論点の解説/.test(l));
  if (a === -1) return [];
  let b = lines.findIndex((l, i) => i > a && /^## /.test(l));
  if (b === -1) b = lines.length;
  const out = [];
  for (let i = a + 1; i < b; i++) {
    const l = lines[i];
    if (!l.trim() || /^#{3,}/.test(l)) continue;
    for (const s of l.split(/(?<=。)/)) {
      const urls = [...s.matchAll(/\]\((https?:[^)\s]+)\)/g)].map((m) => m[1]);
      if (/[0-9０-９]|令和|平成|昭和|第[0-9一二三四五六七八九十]+条/.test(s.replace(/\]\([^)]*\)/g, '')) || urls.length) {
        out.push({ line: offset + i + 1, text: s.trim(), urls });
      }
    }
  }
  return out;
}
