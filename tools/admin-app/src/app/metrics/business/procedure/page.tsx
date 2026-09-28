import { redirect } from 'next/navigation';

/** 手順の点検は レビュー（/metrics/business）の「手順チェックリスト」「実施履歴」に統合した（DN-0432 期の再設計）。旧 URL は転送する。 */
export default async function ProcedurePage({ searchParams }: { searchParams: Promise<{ cadence?: string }> }) {
  const { cadence } = await searchParams;
  redirect(cadence === 'monthly' ? '/metrics/business?cadence=monthly' : '/metrics/business');
}
