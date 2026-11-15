import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 総監の 5 管理のページ（*-management-pillar）に出す「この管理の過去問」。
 *
 * 集計は .claude/scripts/build-pillar-exam-questions.mjs が refresh-indexes（npm run build に含む）で毎回作る
 * src/config/pillar-exam-questions.json（git 管理外の生成物）。2026-11-15 まで、作るだけでどのページにも出ていなかった（DN-1220）。
 * 生成前（dev の直後・テスト）はファイルが無いので null を返し、ページには何も出さない。
 */

interface PillarExamQuestion {
  readonly num: string;
  readonly heading: string;
  readonly anchor: string;
}

interface PillarExamYear {
  readonly year: string;
  readonly exam_slug: string;
  readonly questions: readonly PillarExamQuestion[];
}

export interface PillarExamQuestions {
  readonly label: string;
  readonly total: number;
  readonly by_year: readonly PillarExamYear[];
}

const DATA_PATH = join(process.cwd(), 'src', 'config', 'pillar-exam-questions.json');

/** 'economic-management-pillar' → 集計のキー 'economic' */
function pillarKeyOf(slug: string): string | null {
  const m = slug.replace(/^pe-comprehensive-management-/, '').match(/^(.+)-management-pillar$/);
  return m ? m[1]! : null;
}

export function getPillarExamQuestions(slug: string): PillarExamQuestions | null {
  const key = pillarKeyOf(slug);
  if (!key || !existsSync(DATA_PATH)) return null;
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf8')) as { pillars?: Record<string, PillarExamQuestions> };
  const pillar = data.pillars?.[key];
  return pillar && pillar.by_year.length > 0 ? pillar : null;
}

/** 'r08' → '令和8年度'、'h30' → '平成30年度' */
export function examYearLabel(year: string): string {
  const m = year.match(/^([rh])(\d{2})$/);
  if (!m) return year;
  return `${m[1] === 'r' ? '令和' : '平成'}${Number(m[2])}年度`;
}
