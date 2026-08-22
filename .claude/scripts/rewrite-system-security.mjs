// rewrite-system-security.mjs
import { transformMdxFile } from './lib/mdx-io.mjs';

const filePath = 'C:/Users/m004195/doboku-note/content/site/pe-comprehensive-management/system-security/article.mdx';

transformMdxFile(filePath, (raw) => {
  let content = raw;

  // --- frontmatter 更新 ---
  if (!content.includes('reviewStatus:')) {
    content = content.replace(
      /^published: true$/m,
      "published: true\nreviewStatus: needs-review\nlastRewrittenAt: '2026-04-17'\nrevisionCycle: 1"
    );
  }

  // --- G パターン: CIA 4列表 → 箇条書き変換 ---
  const ciaTablePattern = /\| 要素 \| 英語名 \| 定義 \| RASISとの対応 \|\n\|---\|---\|---\|---\|\n\| \*\*機密性\*\* \| Confidentiality \| 許可された者のみがデータにアクセスできる \| 安全性（Security） \|\n\| \*\*完全性\*\* \| Integrity \| データが正確で改ざんされていない \| 保全性（Integrity） \|\n\| \*\*可用性\*\* \| Availability \| 必要なときにシステムを利用できる \| 可用性（Availability） \|/;

  const ciaList = `各要素の定義とRASISとの対応は以下のとおりである。

- **機密性（Confidentiality）**: 許可された者のみがデータにアクセスできる — RASISとの対応: 安全性（Security）
- **完全性（Integrity）**: データが正確で改ざんされていない — RASISとの対応: 保全性（Integrity）
- **可用性（Availability）**: 必要なときにシステムを利用できる — RASISとの対応: 可用性（Availability）`;

  content = content.replace(ciaTablePattern, ciaList);

  // --- G パターン: 脅威と攻撃手法 3列表 → 箇条書き変換 ---
  const threatTablePattern = /\| 分類 \| 脅威・攻撃手法 \| 概要 \|\n\|---\|---\|---\|\n\| \*\*技術的脅威\*\* \| マルウェア（ウイルス・ランサムウェア） \| 悪意あるプログラムによる被害 \|\n\| \| 標的型攻撃（APT） \| 特定組織を狙った持続的攻撃 \|\n\| \| DDoS攻撃 \| 大量アクセスによるサービス妨害 \|\n\| \| SQLインジェクション \| データベースへの不正操作 \|\n\| \| フィッシング \| 偽サイトによる認証情報の詐取 \|\n\| \*\*人的脅威\*\* \| 内部不正 \| 従業員・委託先による情報持ち出し \|\n\| \| ソーシャルエンジニアリング \| 人間の心理的弱点を突いた情報窃取 \|\n\| \*\*物理的脅威\*\* \| 盗難・侵入 \| 機器・記録媒体の物理的な窃取 \|\n\| \| 災害 \| 地震・火災・水害によるシステム破壊 \|/;

  const threatList = `脅威の分類・手法・概要は以下のとおりである。

- **技術的脅威 — マルウェア（ウイルス・ランサムウェア）**: 悪意あるプログラムによる被害
- **技術的脅威 — 標的型攻撃（APT）**: 特定組織を狙った持続的攻撃
- **技術的脅威 — DDoS攻撃**: 大量アクセスによるサービス妨害
- **技術的脅威 — SQLインジェクション**: データベースへの不正操作
- **技術的脅威 — フィッシング**: 偽サイトによる認証情報の詐取
- **人的脅威 — 内部不正**: 従業員・委託先による情報持ち出し
- **人的脅威 — ソーシャルエンジニアリング**: 人間の心理的弱点を突いた情報窃取
- **物理的脅威 — 盗難・侵入**: 機器・記録媒体の物理的な窃取
- **物理的脅威 — 災害**: 地震・火災・水害によるシステム破壊`;

  content = content.replace(threatTablePattern, threatList);

  // --- D パターン: 参考資料セクション追加（末尾） ---
  const referenceSection = `
## 参考資料

- [情報セキュリティ（IPA 独立行政法人情報処理推進機構）](https://www.ipa.go.jp/security/) — 情報セキュリティ対策・脅威・ISMS に関する公式ガイドライン・レポートを掲載
- [サイバーセキュリティ戦略（NISC 内閣サイバーセキュリティセンター）](https://www.nisc.go.jp/policy/group/strategy/index.html) — 国のサイバーセキュリティ基本方針・戦略文書を公開
- [情報セキュリティの3要素「CIA」とは（IT用語辞典 e-Words）](https://e-words.jp/w/CIA.html) — CIA（機密性・完全性・可用性）の概念をわかりやすく解説`;

  // ファイル末尾（最終行）の後に追加
  content = content.trimEnd() + referenceSection + '\n';

  return content;
});

console.log('rewrite complete');
