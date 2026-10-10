/**
 * past-exam-ledger.mjs — 過去問の問題台帳（data/pastexams/questions/{資格}.json・台帳 id pastexams.question-ledger）の共通部品（DN-0647）。
 *
 * 問題台帳は「1 問ごとに、どの原典 PDF の何ページから取り、公式正答は何で、転記を原典と照合したか」の正本。
 * キーは演習データ（Web の過去問演習・iOS アプリ）の問題 ID そのもの（アプリの学習履歴が「試験 + 問題 ID」に紐づくので変えない）。
 *   演習データの問題 ─(id)→ 台帳の行 ─(article)→ content/site の記事
 *                                     ─(source.question / source.answer)→ 在庫台帳 data/pastexams/inventory.json のファイル（Drive vault の原本）
 * 判定（evaluateLedger）は純関数で、検査（check-past-exam-ledger）・iOS の書き出し（build-ios-quiz-bundle）・管理画面が同じものを使う。
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './repository-paths.mjs';
import { readDataset, readDatasetIf } from './dataset-io.mjs';

export const LEDGER_ID = 'pastexams.question-ledger';
export const TRANSCRIPTION_STATUSES = ['unverified', 'verified', 'fixed', 'no-source'];
export const ANSWER_STATUSES = ['unchecked', 'official', 'no-official'];
/** 転記を原典で確かめたとみなす状態（iOS の書き出しはこれ以外を止める） */
export const TRANSCRIPTION_DONE = new Set(['verified', 'fixed']);

/** 和暦の年度コード（h26・r01・r01-retry）→ 西暦の年度 */
export function yearOfCode(code) {
  const m = /^([hr])0*(\d+)/.exec(String(code).toLowerCase());
  if (!m) throw new Error(`年度コードを読めない: ${code}`);
  return Number(m[2]) + (m[1] === 'h' ? 1988 : 2018);
}

/**
 * 資格ごとの配線。quizExam は build-quiz-data.mjs の SOURCES の exam（civil-2 は演習データの JSON を直接読む）。
 * locate(id, q) は { year, article, no, question: RegExp, answer: RegExp } を返す。question・answer は在庫台帳のファイルの section に当てる。
 */
export const LEDGER_EXAMS = {
  'civil-construction-1': {
    quizExam: 'civil-1',
    source: { kind: 'json', path: 'src/config/civil-1-exam-questions.json' },
    locate(id) {
      const m = /^([hr]\d{2})-([ab])-(\d{2})$/.exec(id);
      if (!m) return null;
      const part = m[2].toUpperCase();
      return {
        year: yearOfCode(m[1]),
        article: `civil-construction-1/primary-${m[1]}-${m[2]}`,
        no: `${part}-${Number(m[3])}`,
        question: new RegExp(`問題${part}`),
        answer: /./,
      };
    },
  },
  'civil-construction-2': {
    quizExam: 'civil-2',
    source: { kind: 'json', path: 'src/config/civil-2-exam-questions.json' },
    locate(id) {
      const m = /^(r\d{2})([kz])-(\d{2})$/.exec(id);
      if (!m) return null;
      const term = m[2] === 'k' ? '後期' : '前期';
      return {
        year: yearOfCode(m[1]),
        article: `civil-construction-2/primary-${m[1]}-${m[2] === 'k' ? 'kouki' : 'zenki'}`,
        no: `${term}-${Number(m[3])}`,
        question: new RegExp(term),
        answer: new RegExp(term),
      };
    },
  },
  'pe-first-stage': {
    quizExam: 'pe-first-stage',
    source: { kind: 'quiz' },
    locate(id, q) {
      const m = /^([hr]\d{2})(-retry)?-(basic|aptitude|construction|water-supply)-(.+)$/.exec(id);
      if (!m) return null;
      const section = { basic: '基礎科目', aptitude: '適性科目', construction: '09 建設部門', 'water-supply': '10 上下水道部門' }[m[3]];
      const retry = Boolean(m[2]);
      const slug = String(q?.articlePath || '').split('/').pop() || `${m[1]}${m[2] || ''}-${m[3]}`;
      return {
        year: yearOfCode(m[1]),
        article: `pe-first-stage/${slug}`,
        no: m[4].toUpperCase(),
        question: retry ? new RegExp(`${section}.*再試験`) : new RegExp(`^(?!.*再試験).*${section}`),
        answer: retry ? /再試験/ : /^(?!.*再試験)/,
      };
    },
  },
  'pe-comprehensive-management': {
    quizExam: 'cem',
    source: { kind: 'quiz' },
    locate(id) {
      const m = /^([hr]\d{2})-(\d{2})$/.exec(id);
      if (!m) return null;
      return {
        year: yearOfCode(m[1]),
        article: `pe-comprehensive-management/${m[1]}-primary`,
        no: String(Number(m[2])),
        question: /択一/,
        answer: /択一|正答/,
      };
    },
  },
};

/**
 * 演習データから台帳の対象（問題 ID・演習データの正答）を並べる。演習データが落とす問題（選択肢なし等）も数えるため、
 * JSON の資格は元の JSON を直接読む。
 * @returns {{ id: string, correct: number|null, articlePath?: string }[]}
 */
export async function enumerateQuestions(qualification, root = REPO_ROOT) {
  const cfg = LEDGER_EXAMS[qualification];
  if (!cfg) throw new Error(`問題台帳の対象でない資格: ${qualification}`);
  if (cfg.source.kind === 'json') {
    const { readJson } = await import('./json-io.mjs');
    const src = readJson(root, cfg.source.path);
    return (src.years || []).flatMap((y) => (y.questions || []).map((q) => ({ id: q.id, correct: q.correct ?? q.correctNum ?? null })));
  }
  const { SOURCES, buildDataset } = await import('../build-quiz-data.mjs');
  const source = SOURCES.find((s) => s.exam === cfg.quizExam);
  return buildDataset(source).questions.map((q) => ({ id: q.id, correct: q.correct ?? null, articlePath: q.articlePath }));
}

/** 在庫台帳の 1 年度のファイルから、正規表現に当たる問題・正答のファイルを選ぶ（1 つに決まらなければ null） */
function pickFile(files, kind, re) {
  const hits = files.filter((f) => f.kind === kind && f.acquiredAt && re.test(f.section));
  return hits.length === 1 ? hits[0].file : null;
}

/**
 * 1 問の原典（在庫台帳のファイルキー）を引く。正答はその年度に無ければ、複数年度をまとめた正答（section に「一括」）を探す。
 * 返す値は資格のディレクトリからの相対パス（在庫台帳の files[].file と同じ）。
 */
export function locateSources(inventoryExam, loc) {
  const years = inventoryExam?.years || [];
  const y = years.find((row) => row.year === loc.year);
  const files = y?.files || [];
  const question = pickFile(files, 'question', loc.question);
  let answer = pickFile(files, 'answer', loc.answer);
  if (!answer) {
    for (const row of years) {
      const bulk = (row.files || []).find((f) => f.kind === 'answer' && f.acquiredAt && /一括/.test(f.section) && coversYear(f.section, loc.year));
      if (bulk) { answer = bulk.file; break; }
    }
  }
  return { question, answer };
}

/** 「正答（H23〜H30 一括）」の範囲に年度が入るか */
function coversYear(section, year) {
  const m = /([HR])(\d+)\s*[〜~-]\s*([HR])(\d+)/.exec(section);
  if (!m) return false;
  const from = Number(m[2]) + (m[1] === 'H' ? 1988 : 2018);
  const to = Number(m[4]) + (m[3] === 'H' ? 1988 : 2018);
  return year >= from && year <= to;
}

/** 台帳の空の行（照合は未了・公式正答は未確認） */
export function emptyRow(id, loc, sources) {
  return {
    id,
    article: loc.article,
    no: loc.no,
    source: { question: sources.question, page: null, answer: sources.answer },
    answer: { status: 'unchecked', official: null },
    transcription: { status: 'unverified' },
  };
}

/**
 * 演習データに合わせて台帳の行を作り直す。照合・正答の記録は残し、配線（記事・原典）だけを今の値に揃える。
 * 原典のページは人・エージェントが書いた値を残す（原典ファイルが変わったときだけ消す）。
 * @returns {{ rows: object[], added: string[], orphans: string[], rewired: string[] }}
 */
export function syncRows({ qualification, questions, inventoryExam, existing = [] }) {
  const cfg = LEDGER_EXAMS[qualification];
  const byId = new Map(existing.map((r) => [r.id, r]));
  const rows = [];
  const added = [];
  const rewired = [];
  const seen = new Set();
  for (const q of questions) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    const loc = cfg.locate(q.id, q);
    if (!loc) throw new Error(`${qualification}: 問題 ID の形を読めない（${q.id}）`);
    const sources = locateSources(inventoryExam, loc);
    const prev = byId.get(q.id);
    if (!prev) {
      rows.push(emptyRow(q.id, loc, sources));
      added.push(q.id);
      continue;
    }
    const sameSource = prev.source?.question === sources.question;
    const row = {
      ...prev,
      article: loc.article,
      no: loc.no,
      source: { question: sources.question, page: sameSource ? prev.source?.page ?? null : null, answer: sources.answer },
    };
    if (JSON.stringify(row) !== JSON.stringify(prev)) rewired.push(q.id);
    rows.push(row);
  }
  const orphans = existing.filter((r) => !seen.has(r.id)).map((r) => r.id);
  return { rows, added, orphans, rewired };
}

/** 台帳を読む（無ければ null） */
export function readLedger(qualification, root = REPO_ROOT) {
  return readDatasetIf(root, LEDGER_ID, { values: { name: qualification } });
}

export function readInventory(root = REPO_ROOT) {
  return readDataset(root, 'pastexams.inventory');
}

/**
 * 判定（純関数）。fails は配線か正答の誤り（CI で止める）、stats は件数（検査した数と照合の進み具合）。
 * @param {{ qualification: string, ledger: object|null, questions: {id:string, correct:number|null}[], inventoryExam: object, articleExists?: (slug:string)=>boolean }} p
 */
export function evaluateLedger({ qualification, ledger, questions, inventoryExam, articleExists = defaultArticleExists }) {
  const fails = [];
  const stats = {
    questions: questions.length, rows: 0, checked: 0,
    answerOfficial: 0, answerNoOfficial: 0, answerUnchecked: 0, answerMismatch: 0,
    transcriptionDone: 0, transcriptionUnverified: 0, transcriptionNoSource: 0,
    sourceQuestionMissing: 0, sourceAnswerMissing: 0,
  };
  if (!ledger) {
    fails.push(`${qualification}: 問題台帳が無い（npm run sync-past-exam-ledger -- --write）`);
    return { fails, stats, mismatches: [] };
  }
  const rows = ledger.questions || [];
  stats.rows = rows.length;
  const known = new Set((inventoryExam?.years || []).flatMap((y) => (y.files || []).map((f) => f.file)));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const dataById = new Map(questions.map((q) => [q.id, q]));
  const mismatches = [];
  for (const q of questions) {
    if (!byId.has(q.id)) fails.push(`${q.id}: 演習データにあるのに問題台帳に無い（sync-past-exam-ledger で足す）`);
  }
  for (const r of rows) {
    if (!dataById.has(r.id)) fails.push(`${r.id}: 問題台帳にあるのに演習データに無い（ID が消えた。sync-past-exam-ledger --prune で消すか ID を戻す）`);
  }
  const articleSeen = new Map();
  for (const r of rows) {
    stats.checked++;
    if (!articleSeen.has(r.article)) articleSeen.set(r.article, articleExists(r.article));
    if (!articleSeen.get(r.article)) fails.push(`${r.id}: 記事 ${r.article} が無い`);
    for (const key of ['question', 'answer']) {
      const file = r.source?.[key];
      if (file == null) {
        if (key === 'question') stats.sourceQuestionMissing++;
        else stats.sourceAnswerMissing++;
      } else if (!known.has(file)) fails.push(`${r.id}: 原典 ${file} が在庫台帳に無い`);
    }
    const a = r.answer || {};
    if (a.status === 'official') {
      stats.answerOfficial++;
      const q = dataById.get(r.id);
      if (q && q.correct != null && !(a.official || []).includes(q.correct)) {
        stats.answerMismatch++;
        mismatches.push({ id: r.id, article: r.article, data: q.correct, official: a.official });
        fails.push(`${r.id}: 演習データの正答 ${q.correct} が公式正答 ${(a.official || []).join('・')} と違う（${r.article}）`);
      }
    } else if (a.status === 'no-official') stats.answerNoOfficial++;
    else stats.answerUnchecked++;
    const t = r.transcription || {};
    if (TRANSCRIPTION_DONE.has(t.status)) {
      stats.transcriptionDone++;
      if (!r.source?.question) fails.push(`${r.id}: 原典が無いのに転記を「${t.status}」と記録している`);
    } else if (t.status === 'no-source') stats.transcriptionNoSource++;
    else stats.transcriptionUnverified++;
  }
  return { fails, stats, mismatches };
}

function defaultArticleExists(slug) {
  const base = join(REPO_ROOT, 'content/site', slug);
  return existsSync(join(base, 'article.mdx')) || existsSync(`${base}.mdx`);
}

/** iOS の書き出し用: 試験（quizExam）の問題のうち、転記の照合が済んでいないものと正答が公式と食い違うものを返す */
export function unreadyForApp(ledger, questions) {
  const byId = new Map((ledger?.questions || []).map((r) => [r.id, r]));
  const unverified = [];
  const mismatch = [];
  for (const q of questions) {
    const r = byId.get(q.id);
    if (!r || !TRANSCRIPTION_DONE.has(r.transcription?.status)) unverified.push(q.id);
    if (r?.answer?.status === 'official' && q.correct != null && !(r.answer.official || []).includes(q.correct)) mismatch.push(q.id);
  }
  return { unverified, mismatch };
}

/** quizExam（civil-1・cem など）→ 問題台帳の資格 id */
export function qualificationOfQuizExam(quizExam) {
  return Object.keys(LEDGER_EXAMS).find((k) => LEDGER_EXAMS[k].quizExam === quizExam) || null;
}

/**
 * 台帳だけから数える要約（管理画面用。演習データを読まないので正答の不一致は数えない＝check-past-exam-ledger が見る）。
 * @returns {{ total, transcription: Record<string, number>, answer: Record<string, number>, sourceMissing: { question, answer }, articles: { article, total, done, noSource, answerOfficial, pagesKnown }[] }}
 */
export function summarizeLedger(ledger) {
  const rows = ledger?.questions || [];
  const transcription = Object.fromEntries(TRANSCRIPTION_STATUSES.map((s) => [s, 0]));
  const answer = Object.fromEntries(ANSWER_STATUSES.map((s) => [s, 0]));
  const sourceMissing = { question: 0, answer: 0 };
  const byArticle = new Map();
  for (const r of rows) {
    transcription[r.transcription?.status] = (transcription[r.transcription?.status] || 0) + 1;
    answer[r.answer?.status] = (answer[r.answer?.status] || 0) + 1;
    if (!r.source?.question) sourceMissing.question++;
    if (!r.source?.answer) sourceMissing.answer++;
    const a = byArticle.get(r.article) || { article: r.article, total: 0, done: 0, noSource: 0, answerOfficial: 0, pagesKnown: 0 };
    a.total++;
    if (TRANSCRIPTION_DONE.has(r.transcription?.status)) a.done++;
    if (r.transcription?.status === 'no-source' || !r.source?.question) a.noSource++;
    if (r.answer?.status === 'official') a.answerOfficial++;
    if (r.source?.page != null) a.pagesKnown++;
    byArticle.set(r.article, a);
  }
  return { total: rows.length, transcription, answer, sourceMissing, articles: [...byArticle.values()] };
}
