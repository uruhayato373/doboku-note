import { redirect } from 'next/navigation';

/**
 * /project は 2026-08-18 の情報アーキテクチャ移行で /docs へ統合された。
 * 旧ブックマークを壊さないための互換リダイレクト（Phase 11 で存廃を判断する）。
 */
export default function ProjectRedirect() {
  redirect('/docs');
}
