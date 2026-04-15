#!/usr/bin/env node
// scripts/rewrite-dmz.mjs
// dmz/article.mdx のリライト（G + D パターン）
// G: 3列×セル超過の表を階層化箇条書きに変換
// D: 参考資料セクション新設

import { transformMdxFile } from './lib/mdx-io.mjs';

const filePath = '.local/r2/posts/pe-comprehensive-management/dmz/article.mdx';

transformMdxFile(filePath, (raw) => {
  let result = raw;

  // ── 1. frontmatter に reviewStatus / lastRewrittenAt / revisionCycle を追加 ──
  result = result.replace(
    /^(---\n[\s\S]*?)(publishedAt: '[^']*'\n)(---)/m,
    (_, before, publishedAtLine, closing) => {
      return before + publishedAtLine + "reviewStatus: needs-review\nlastRewrittenAt: '2026-04-15'\nrevisionCycle: 1\n" + closing;
    }
  );

  // ── 2. G パターン: DMZの構成方式 3列表 → 階層化箇条書き ──
  // 対象:
  //   | 方式 | 構成 | 特徴 |
  //   |---|---|---|
  //   | シングルファイアウォール方式 | 1台のFWに3つのインターフェース（外部・DMZ・内部） | 構成がシンプル。FW障害時に全体が影響を受ける |
  //   | デュアルファイアウォール方式 | 外部FWと内部FWの2台でDMZを挟む | セキュリティが高い。異なるベンダのFWを使うとさらに堅牢 |
  const configTablePattern = /(\| 方式 \| 構成 \| 特徴 \|\n\|---\|---\|---\|\n)([\s\S]*?)(\n\n)/m;
  result = result.replace(configTablePattern, (match, header, rows, tail) => {
    const lines = rows.trim().split('\n');
    const items = lines.map((line) => {
      const cols = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 3) {
        return `- **${cols[0]}**: ${cols[1]} — ${cols[2]}`;
      }
      return line;
    });
    const intro = '各方式の構成と特徴は以下のとおり。\n\n';
    return intro + items.join('\n') + tail;
  });

  // ── 3. G パターン: 通信制御のルール 3列表 → 階層化箇条書き ──
  // 対象:
  //   | 通信方向 | 可否 | 理由 |
  //   |---|---|---|
  //   | 外部 → DMZ | 許可（制限付き） | 公開サービスへのアクセスを許容 |
  //   | DMZ → 内部 | 原則禁止 | DMZ侵害時に内部への侵入を防ぐ |
  //   | 内部 → DMZ | 許可 | 内部からの管理・データ更新を許容 |
  //   | 内部 → 外部 | 許可（制限付き） | プロキシ経由等で制御 |
  //   | 外部 → 内部 | 禁止 | 直接アクセスは一切遮断 |
  const trafficTablePattern = /(\| 通信方向 \| 可否 \| 理由 \|\n\|---\|---\|---\|\n)([\s\S]*?)(\n\n)/m;
  result = result.replace(trafficTablePattern, (match, header, rows, tail) => {
    const lines = rows.trim().split('\n');
    const items = lines.map((line) => {
      const cols = line.split('|').map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 3) {
        return `- **${cols[0]}**（${cols[1]}）: ${cols[2]}`;
      }
      return line;
    });
    const intro = '各通信方向のアクセス制御ルールは以下のとおり。\n\n';
    return intro + items.join('\n') + tail;
  });

  // ── 4. D パターン: 参考資料セクション追加 ──
  // 挿入位置: ファイル末尾（最終行の後）
  const referenceSection = `
## 参考資料

- [中小企業の情報セキュリティ](https://www.ipa.go.jp/security/sme/index.html)（IPA 独立行政法人情報処理推進機構）: IPAが公開する中小企業向けセキュリティ対策の総合ポータル。ネットワーク設計・DMZを含む多層防御の基本を解説するガイドラインや自己診断ツールを提供している。
- [What Is a DMZ Network and Why Would You Use It?](https://www.fortinet.com/resources/cyberglossary/what-is-dmz)（Fortinet）: ファイアウォールベンダーFortinetによる英語の技術解説。シングルFW方式・デュアルFW方式の違い、IoT/OT環境へのDMZ応用まで網羅的に説明している。
- [非武装地帯（コンピュータセキュリティ）](https://ja.wikipedia.org/wiki/%E9%9D%9E%E6%AD%A6%E8%A3%85%E5%9C%B0%E5%B8%AF_%28%E3%82%B3%E3%83%B3%E3%83%94%E3%83%A5%E3%83%BC%E3%82%BF%E3%82%BB%E3%82%AD%E3%83%A5%E3%83%AA%E3%83%86%E3%82%A3%29)（Wikipedia）: ネットワークDMZの歴史的経緯・構成パターン・軍事用語との関係を日本語で網羅した解説記事。
`;

  // ファイル末尾に追記
  result = result.trimEnd() + '\n' + referenceSection;

  return result;
});

console.log('rewrite-dmz.mjs: 完了');
