import examCalendar from '../../.claude/config/exam-calendar.json';

// 資格ごとの「次の試験イベント」を .claude/config/exam-calendar.json（試験日の SSOT・
// check-exam-calendar が公式サイトと照合）から解決する。
// トップの資格カードは 2026-09 まで home-exam-cards.json の手打ち文字列（例: 「2026年7月 第1次」）を
// 出しており、試験が終わっても表示が変わらなかった。ここで算出した値を優先し、未来のイベントが
// 無い資格だけ手打ち文字列へフォールバックする。
// 判定は JST の暦日。ビルド時刻で固定されるため「残り日数」は ExamCountdown（client）が再計算する。

export type NextExamEvent = {
  /** イベント名（例: 第二次検定・筆記試験） */
  label: string;
  /** YYYY-MM-DD（JST） */
  date: string;
  /** 表示用（例: 2026年10月4日） */
  dateLabel: string;
  /** 申込締切など試験本体でないイベントか */
  isDeadline: boolean;
};

type CalendarEvent = { label: string; date: string };
type CalendarExam = { label: string; year: number; events: Record<string, CalendarEvent> };

const exams = (examCalendar as { exams: Record<string, CalendarExam> }).exams;

function jstToday(): string {
  // ビルド時刻を JST の暦日へ。UTC 深夜のビルドで前日扱いにならないよう +9h してから切り出す。
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export function formatJaDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

/**
 * 今日（JST）以降で最も近いイベントを返す。同日に複数ある場合（2級の後期一次と二次）は
 * 試験本体（申込系でない）を優先する。未来のイベントが無ければ null。
 */
export function getNextExamEvent(categorySlug: string, today: string = jstToday()): NextExamEvent | null {
  const exam = exams[categorySlug];
  if (!exam) return null;
  const upcoming = Object.entries(exam.events)
    .map(([id, ev]) => ({ id, ...ev, isDeadline: /application|deadline|open/i.test(id) || /申込/.test(ev.label) }))
    .filter((ev) => ev.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || Number(a.isDeadline) - Number(b.isDeadline));
  const next = upcoming[0];
  if (!next) return null;
  return { label: next.label, date: next.date, dateLabel: formatJaDate(next.date), isDeadline: next.isDeadline };
}

/** 資格カードの 1 行表示（例: 「次回 2026年10月4日 第二次検定」）。 */
export function formatNextExamLine(ev: NextExamEvent): string {
  return `${ev.isDeadline ? '締切' : '次回'} ${ev.dateLabel} ${ev.label}`;
}
