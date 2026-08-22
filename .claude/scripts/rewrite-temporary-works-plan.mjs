// rewrite-temporary-works-plan.mjs
// 仮設計画キーワードページの参考資料をWebリソースに置換し、frontmatterを更新する

import { readMdxFile, writeMdxFile } from './lib/mdx-io.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../');
const filePath = path.join(repoRoot, 'content/site/pe-comprehensive-management/temporary-works-plan/article.mdx');

const { raw, eol } = readMdxFile(filePath);

// transform 内では LF に正規化して作業し、最後に writeMdxFile で eol を戻す
let updated = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

// 1. frontmatter 更新: publishedAt 行の後に3行追加
updated = updated.replace(
  /^(publishedAt: '2026-04-08')$/m,
  "publishedAt: '2026-04-08'\nreviewStatus: needs-review\nlastRewrittenAt: '2026-04-17'\nrevisionCycle: 1"
);

// 2. 参考資料セクションを置換（書籍→Webリソース）
const oldRef = `## 参考資料

- 国土交通省『土木工事仮設計画ガイドライン』
- 仮設工業会『仮設構造物の計画と管理』`;

const newRef = `## 参考資料

- [土木工事安全施工技術指針（国土交通省）](https://www.mlit.go.jp/tec/sekisan/sekou.html) — 仮設構造物を含む土木工事全般の安全施工技術指針。指定仮設・任意仮設の安全基準を確認できる
- [足場等の安全に関するガイドライン（厚生労働省）](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000186444.html) — 足場の組立・解体・変更時の安全基準および墜落防止措置の指針
- [仮設工業会（一般社団法人）](https://www.kasetsu.or.jp/) — 仮設機材の認定・技術基準・施工管理に関する民間団体。仮設構造物の実務情報を提供`;

if (!updated.includes(oldRef)) {
  console.log('ERROR: 参考資料パターンが見つかりません');
  process.exit(1);
}

updated = updated.replace(oldRef, newRef);

writeMdxFile(filePath, updated, eol);
console.log('OK: ファイルを更新しました');
