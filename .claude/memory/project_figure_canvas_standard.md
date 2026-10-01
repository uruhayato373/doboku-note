---
name: figure-canvas-standard
description: 図版SVGを固定キャンバス(feed 4:5 400x500/landscape 16:9 640x360)へ統一。全figureを4:5マスター化、YouTube横長は別途。段階バックフィル中（2026-06-22）
metadata: 
  node_type: memory
  type: project
  originSessionId: 5b8704f4-747d-4c5c-af8d-645a3049597c
---

記事＋SNS両用の図版SVGを**固定キャンバス標準**に統一する施策（2026-06-22 設計・着手）。真実源は [figure-canvas-policy.md](../../../doboku-note/docs/reference/figure-canvas-policy.md) と `.claude/config/figure-canvas.json`。[[textbook-svg-dual-use]] の運用基盤。

**決定**: 全 `figure-*.svg` のマスターは **feed 4:5（viewBox 400×500→1080×1350）**＝サイト記事＋IGフィード共通。**YouTube用 16:9（viewBox 640×360→1920×1080）は別ファイル `figure-N--wide.svg`**（記事非埋込・create-svg の幅≤400ルール対象外）。9:16は新規作図せず feed をレターボックス派生。正方は不採用。横長119枚も4:5へ再レイアウトする（ユーザー決定）。

**実装済み（develop）**:
- ガード `scripts/check-figure-canvas.mjs`（pre-commit+package.json配線、`--staged`/`--sync-allowlist`）。移行待ちは `figure-canvas.json` の `migrationAllowlist` で免除、移行完了で自動除外。
- `check-mdx/svg/detect.mjs` の P5(幅>400) を `--wide` で免除。
- `create-svg/SKILL.md` に固定キャンバス分岐を追記（dual-use図は固定/それ以外は従来）。
- `build-svg-catalog` に canvas/aspect/fitStatus/hasWideVariant 追加（SSOT=`.claude/state/svg-catalog.json`）。`svg-gallery` に canvas適合バッジ＋フィルタ。
- `render-figure-sns` に `vertical`(9:16 1080×1920)＋`all` を追加。
- 新エージェント `svg-canvas-fitter`（Generator/sonnet=再レイアウト）、`svg-figure-auditor` に固定キャンバス軸追加。

**進捗**: **バックフィル完了（2026-06-22）**。figure-*.svg = 95枚 全て viewBox 400×500 に適合（要再作図0・migrationAllowlist空）。svg-canvas-fitter(sonnet 3並列)で移行：優先度1=埋込44枚→orphan47枚→font/XML是正。全95枚 resvg レンダリング成功・audit HIGH=0・font≥11。概念名タイトルは図から除去（SNS枠ヘッダーと重複するため。図内タイトル禁止を policy/agent に明記）。**残: landscape(--wide)版の作成は未着手（YouTube通常動画用・必要時）／render-figure-sns の civil 対応（現状 pe ハードコード）／orphan 図の記事への ArticleImage 埋込（[[textbook-svg-dual-use]] Phase4・保留中）。**

**注意/教訓**:
- 対象は `figure-*.svg` 命名のみ（95枚）。Convention A の個別名SVG約99枚は標準対象外（必要なら rename+移行は別途）。
- 新規エージェント `svg-canvas-fitter` は**セッション起動時レジストリ未登録**だと subagent_type で呼べない→ `general-purpose`(sonnet) に指示埋込で代用（[[workflow-orchestration-gotchas]] と同根）。
- バックフィルのGeneratorは sonnet委譲・4〜6枚/バッチ・適用後 check-figure-canvas＋audit(HIGH=0)＋目視。親はcatalog JSON駆動でSVG本体を読まない。
- 2026-06-22、infra一式を stage 中に**並行セッションが同ワークツリーで巻き込みコミット**（89adbbd5f 等の別メッセージに混入）。作業は無傷だがメッセージ不整合。[[parallel-agent-commit-sweep]] [[session-start-git-sync]] の再演。
