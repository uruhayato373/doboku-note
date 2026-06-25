/**
 * 記事固有MDXコンポーネント定義
 * 特定の記事またはトピックでのみ使用されるコンポーネント
 */

// 現在は登録なし。テンプレ由来の不動産/NISA/時間管理エントリは 2026-06-25 に
// デッドコードとして削除。新規追加時はここに登録し src/features/ に実装する。
export const specificComponents = {} as const;

export type SpecificComponentName = keyof typeof specificComponents;
