import { redirect } from 'next/navigation';

/** 旧「分析概観」。KPI をトップへ移したので、既存リンクのためにトップへ転送する。 */
export default function MetricsRedirect() {
  redirect('/');
}
