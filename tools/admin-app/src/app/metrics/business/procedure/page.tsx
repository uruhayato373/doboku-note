import { redirect } from 'next/navigation';

/** 手順の点検は 週次・月次レビュー（/metrics/business/weekly・/monthly）の「手順チェックリスト」「実施履歴」に統合した。旧 URL は転送する。 */
export default async function ProcedurePage({ searchParams }: { searchParams: Promise<{ cadence?: string }> }) {
  const { cadence } = await searchParams;
  redirect(cadence === 'monthly' ? '/metrics/business/monthly' : '/metrics/business/weekly');
}
