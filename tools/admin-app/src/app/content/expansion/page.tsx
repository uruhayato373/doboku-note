import { redirect } from 'next/navigation';

/** 旧「教材の確認待ち」。確認待ちは教材ページ（/materials・要確認のみ）へ統合した。 */
export default async function ContentExpansionPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const { source } = await searchParams;
  redirect(source ? `/materials?id=${encodeURIComponent(source)}&only=attention` : '/materials');
}
