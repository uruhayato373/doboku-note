import { redirect } from 'next/navigation';

/**
 * 旧 `/project/<パス>` の互換リダイレクト。
 *
 * 2026-08-18 の情報アーキテクチャ移行で `docs/project/{01_戦略,…}` は `docs/{strategy,…}` へ
 * フラット化した。先頭セグメントだけ写像すれば旧ブックマークがそのまま生きる
 * （写像に無い先頭セグメントは /docs 直下として送り、無ければ 404 になる）。
 * Phase 11 でリダイレクトごと畳むかを判断する。
 */
const AREA_MAP: Record<string, string> = {
  '01_戦略': 'strategy',
  '02_コンテンツ': 'editorial',
  '03_SNS': 'marketing',
  '04_運営': 'operations',
  '05_プロダクト': 'products',
};

export default async function ProjectDetailRedirect({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const decoded = path.map((s) => {
    try { return decodeURIComponent(s); } catch { return s; }
  });
  const [head, ...rest] = decoded;
  const mapped = head && AREA_MAP[head] ? [AREA_MAP[head], ...rest] : decoded;
  redirect(`/docs/${mapped.map(encodeURIComponent).join('/')}`);
}
