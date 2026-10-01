import { redirect } from 'next/navigation';

/**
 * 旧 URL。週次と月次は別ページに分けた（/metrics/business/weekly・/metrics/business/monthly）。
 * 既存のリンク（?cadence=monthly を含む）を壊さないよう転送する。
 */
export default async function ReviewIndex({ searchParams }: { searchParams: Promise<{ cadence?: string }> }) {
  const { cadence } = await searchParams;
  redirect(cadence === 'monthly' ? '/metrics/business/monthly' : '/metrics/business/weekly');
}
