import type { FullConfig } from '@playwright/test';

/**
 * 管理画面 e2e の globalSetup — 各ページを一度だけ順にフェッチし next dev の初回コンパイルを
 * 済ませてから並列テストを始める。
 *
 * 背景（2026-08-28）: `fullyParallel: true` + 既定 workers（多数）で、複数ワーカーが同時に
 * 未コンパイルのページへ初回アクセスすると next dev のオンデマンドコンパイルが直列化され
 * レスポンスが数十秒かかり、対象外の既存テスト（content-brain.spec.ts・docs-todo.spec.ts）
 * まで expect timeout(7.5s)/test timeout(30s) で落ちる（`--workers=1` では新規・既存とも
 * 全件緑になることを確認済み＝各テストのロジックではなくコンパイル待ちが原因）。
 *
 * ここで対象ルートを直列に一度ずつ叩いてコンパイル済みにしておけば、並列実行時の
 * レスポンスは通常の SSR 速度に収まる。ステータスは問わない（存在しないクエリの 404 等も
 * 許容）。失敗はテスト本体側で改めて検出されるため、ここでは握りつぶして次へ進む。
 */
const WARM_UP_PATHS = [
  '/',
  '/content',
  '/content/brain',
  '/content/kindle',
  '/content/content~kindle',
  '/docs',
  '/docs/strategy/13_土木公務員SEO戦略2026-08',
  '/plans',
  '/project',
  '/todo',
];

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL as string | undefined ?? 'http://127.0.0.1:3021';
  for (const path of WARM_UP_PATHS) {
    try {
      const res = await fetch(baseURL + path, { signal: AbortSignal.timeout(60_000) });
      await res.text();
    } catch {
      // 握りつぶす: ウォームアップの成否はここでは判定しない。
    }
  }
}
