export const QUIZ_FUNNEL_EVENT_NAMES = [
  'quiz_start',
  'quiz_complete',
  'review_start',
  'premium_view',
  'premium_intent',
  'email_interest',
  'line_interest',
  'note_cta_click',
];

const usersFor = (rows, eventName) =>
  Number(rows.find((row) => row.eventName === eventName)?.totalUsers ?? 0);

const countFor = (rows, eventName) =>
  Number(rows.find((row) => row.eventName === eventName)?.eventCount ?? 0);

/** GA4 eventName別 totalUsers からPhase 0の成功条件を再現可能に判定する。 */
export function summarizeQuizPremiumFunnel(snapshot) {
  const measured = Boolean(snapshot?.meta && Array.isArray(snapshot?.rows));
  if (!measured) {
    return {
      measured: false,
      status: 'not_measured',
      source: null,
      metrics: null,
      gates: null,
    };
  }

  const rows = snapshot.rows;
  const quizUsers = usersFor(rows, 'quiz_start');
  const premiumViewUsers = usersFor(rows, 'premium_view');
  const premiumIntentUsers = usersFor(rows, 'premium_intent');
  const intentRate = premiumViewUsers > 0 ? premiumIntentUsers / premiumViewUsers : null;
  const gates = {
    quizUsers100: quizUsers >= 100,
    premiumIntentRate5Pct: intentRate !== null && intentRate >= 0.05,
    premiumIntentUsers10: premiumIntentUsers >= 10,
  };

  return {
    measured: true,
    status: Object.values(gates).every(Boolean) ? 'ready' : 'collecting',
    source: {
      startDate: snapshot.meta.startDate,
      endDate: snapshot.meta.endDate,
      pagePath: snapshot.meta.pagePath,
    },
    metrics: {
      quizUsers,
      quizCompletions: countFor(rows, 'quiz_complete'),
      reviewUsers: usersFor(rows, 'review_start'),
      premiumViewUsers,
      premiumIntentUsers,
      premiumIntentRate: intentRate,
      emailInterestUsers: usersFor(rows, 'email_interest'),
      lineInterestUsers: usersFor(rows, 'line_interest'),
      noteCtaUsers: usersFor(rows, 'note_cta_click'),
    },
    gates,
  };
}

export function renderQuizPremiumFunnelMarkdown(summary) {
  if (!summary.measured) {
    return '# PWA Premium Phase 0 判定\n\n計測スナップショットは未取得です。0件とは扱いません。\n';
  }
  const rate = summary.metrics.premiumIntentRate;
  const rateLabel = rate === null ? '未算出' : `${(rate * 100).toFixed(1)}%`;
  const mark = (ok) => (ok ? 'PASS' : 'WAIT');
  return `# PWA Premium Phase 0 判定

- 状態: **${summary.status}**
- 計測窓: ${summary.source.startDate}〜${summary.source.endDate}
- 対象: ${summary.source.pagePath}
- PWA利用者: ${summary.metrics.quizUsers}人（${mark(summary.gates.quizUsers100)} / 100人以上）
- Premium閲覧: ${summary.metrics.premiumViewUsers}人
- 購入意向: ${summary.metrics.premiumIntentUsers}人・閲覧比 ${rateLabel}（${mark(summary.gates.premiumIntentRate5Pct)} / 5%以上、${mark(summary.gates.premiumIntentUsers10)} / 10人以上）
- メール関心: ${summary.metrics.emailInterestUsers}人
- LINE関心: ${summary.metrics.lineInterestUsers}人
- note遷移: ${summary.metrics.noteCtaUsers}人

購入意向はGA4の \`totalUsers\` とブラウザ内の一度きり送信を使い、イベント数の重複を成功判定へ足しません。
`;
}
