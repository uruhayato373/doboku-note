/** Verification follows the card's scheduled start; future work is reported separately. */
import { parseWhen } from './backlog-lib.mjs';

export function selectBacklogVerification(cards, day) {
  const month = day.slice(0, 7);
  const candidates = cards.filter((card) => card.verify);
  const targets = [], notDue = [];
  for (const card of candidates) {
    const period = parseWhen(card.when);
    // An overdue deadline remains visible even if a contradictory later month was entered.
    const deadlineReached = card.due && card.due <= day;
    const futurePeriod = period && period.start > month;
    if (!deadlineReached && futurePeriod) {
      notDue.push({ id: card.id, title: card.title, command: card.verify, when: card.when, due: card.due, reason: `開始予定 ${period.start}（検証日 ${day}）` });
    } else targets.push(card);
  }
  return { candidates, targets, notDue };
}
