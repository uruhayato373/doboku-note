import type { FullConfig } from '@playwright/test';
import { warmupPaths } from './fixtures';

/**
 * テスト前に、スイートが踏むページを 1 回ずつ取得してコンパイルを済ませる。
 *
 * このスイートの webServer は `npm run dev` なので、初めて踏むルートはリクエスト時に
 * その場でコンパイルされる。基準類の章記事を 344 本足した時点で、リンククリック直後の
 * 遷移が assertion のタイムアウトを超えて**偽の失敗**が出るようになった（同じ実行を
 * 繰り返すと落ちるテストが毎回入れ替わり、ルートが温まった 2 回目は全件通る）。
 *
 * タイムアウトを伸ばして誤魔化すと、本物の遅延まで見逃す。ここで待ちを assertion の
 * 外へ出し、テスト本体は「温まったサーバー」に対して素の速度で判定させる。
 *
 * **失敗しても止めない。** ウォームアップは前処理であって検査ではないので、ここで
 * 落として全件を赤にすると原因が見えなくなる。取得できなかった URL は一覧で出し、
 * 実際の合否はテスト本体に判定させる。
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://127.0.0.1:3020';
  const failed: string[] = [];
  const started = Date.now();

  // 直列に踏む。並列にすると dev サーバーが同時コンパイルで詰まり、温める目的に反する。
  for (const path of warmupPaths) {
    try {
      const response = await fetch(new URL(path, baseURL), { redirect: 'manual' });
      // 404 は `/__e2e_not_found__` のように意図的なものがあるので成否に含めない。
      if (response.status >= 500) failed.push(`${path} → ${response.status}`);
      await response.arrayBuffer();
    } catch (error) {
      failed.push(`${path} → ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`[e2e] ウォームアップ ${warmupPaths.length} URL / ${seconds}s / 取得できず ${failed.length} 件`);
  for (const entry of failed) console.log(`[e2e]   ${entry}`);
}
