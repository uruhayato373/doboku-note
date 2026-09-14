---
name: project_civil2_keiken_essay_line
description: 土木 施工経験記述 note有料マガジン。1級=2マガジン(過去問年度別+テーマ別)、2級=3マガジン(過去問年度別+テーマ別完成答案集+予想問題集)。全て develop・未公開
metadata: 
  node_type: memory
  type: project
  originSessionId: 9cae566a-85b9-4506-8f2a-47a54d8143a7
---

**1級は2マガジン体制で完成（2026-05-29、develop・未push）**: 総監と同じ「過去問=年度別 / 予想・汎用=テーマ別」二本立てをユーザー判断で採用。
- **A 過去問模範答案集（年度別 R03-R07）**: commit `27de15f5d`。`docs/note/1級土木/magazines/1級土木-施工経験記述-過去問模範答案集/`。各年度=実試験問題を再掲(出典明示・サイトsecondary-r0Xを正に転記)+その年の出題管理のフル答案。R06=安全×施工計画/R07=品質×環境の2テーマ必答・設問1≠設問2に対応。工種=管渠/擁壁/舗装/切土/RC擁壁。note-magazines.ts `civil-1-pastexam-essay`。
- **B テーマ別 完成答案集（5管理）**: commit `674352246`。5管理=品質/安全/工程/施工計画/環境、監理技術者レベル。工種=杭/シールド/造成/トンネル/近接施工/市街地/河川。note-magazines.ts `civil-1-experience-essay`。
- 配線: magazine-placement rule 8（年度ページr0X=A主+B副 / guide・examples=両提示）。PDF spec 各5本生成検証済。A↔B答案重複0（frontmatter+リンクのみ一致）、A・B↔サイト0。プラン `docs/note/1級土木/1級土木施工経験記述プラン.md`。残: カバー画像（並行OGPパイプラインが生成中）+ note公開。技術記述問題(2-11)はサイト網羅のためマガジン化しない。

---

**2級も3マガジン体制で完成（2026-05-29、develop・未push、commit `bfd48a549`）**: 1級の「過去問=年度別/予想=テーマ別」を2級に展開＋予想問題集を追加。
- 完成答案集（テーマ別 安全/品質/工程・主任技術者）= 既存 `civil-2-experience-essay`。
- 過去問模範答案集（年度別 R03-R07）= `civil-2-pastexam-essay`。実問題再掲＋その年テーマのフル答案。選択制(R03-R05)＋2テーマ必答(R06品質×工程/R07安全×工程)対応。工種=造成/路盤舗装/用水路/カルバート/擁壁。
- 予想問題集（R6新方向特化）= `civil-2-yosou-essay`。条件提示型/新項目(環境・出来形)/日常業務記述。**→ 2026-06-02 退役（commit 8f62c5e33）**：出題実績のない投機かつ無料ガイドの「3管理で十分」と矛盾。原稿dir・SoT・placement・cover・pdf-spec 全削除。1級予想問題集も別途退役済→2テーマ組合せ大全へ転換 [[project_civil1_combo_essay]]。
- **環境対策の扱い（教訓）**: 一旦「環境対策のみ完成答案集へ4テーマ目昇格」したが**撤回（commit 68cb6fe6d）**。理由＝2級経験記述は**3管理（安全/品質/工程）が正規テーマ**で、環境対策はR03-R07で**出題実績ゼロ**、サイトガイド自身が環境を「新項目」に分類し準備推奨は3管理。出来形等を投機退役したのと同枠で一貫性を欠くため。**完成答案集は3テーマが正（¥1,980/3本）**。環境対策は2級経験記述の正規テーマではない。

**公開状況（2026-06-02）**: 2級過去問模範答案集 `civil-2-pastexam-essay` は **note公開済**（マガジン md3aa0f9a37d7＋全5記事個別URL、published:true）。完成答案集 `civil-2-experience-essay` は未公開（published:false、環境対策追加済）。
- 配線: placement rule 7（年度=過去問主、guide/examples=完成答案集主、予想は副、3マガジン提示）。PDF spec 3件（オンデマンド用・生成は実行しない方針 [[feedback_pdf_on_demand_only]]）。Bと答案重複0。
- 注: 1級は予想問題集を未作成（2級のみ）。対称化するなら1級にも追加余地あり。

2級土木施工管理技士 第2次検定「施工経験記述」を、技術士総監の note マガジンプレイブック（3層分業）で展開する新ライン。起点素材は `%USERPROFILE%\Downloads\施工経験記述_文字起こし.md`（市販本の文字起こし＝逐語転載禁止、事実のみ流用）。SSOT は `docs/note/2級土木施工経験記述プラン.md`。

**確定方針**（2026-05-29 ユーザー判断）: サイト基盤→note有料の順 / note商品=工種×テーマ完成答案集 / 対象は2級のみ（効果測定後に1級横展開判断）。

**Phase 1（サイト無料・SEO/AdS_ense基盤）完了・commit `33af98abe`（develop）**:
- `.local/r2/posts/civil-construction-2/secondary-experience-writing-guide`（型/出題傾向/R6形式見直し/留意事項/減点回避/3管理ヒント）
- 同 `-examples`（工種×テーマ完成記入例+工事概要改善例）
- 1級構造をミラー。dev サーバで HTTP 200/`<main>`/文字化け0 確認済み。

**Phase 2（note有料マガジン本体）完成・commit `de7f3fd98`（develop）**:
- `docs/note/magazines/2級土木-施工経験記述-完成答案集/`（_meta.yaml セット¥1,980/3記事 + 安全/品質/工程 各~11KB）。総監マガジン構造踏襲。
- 各記事=現行形式(R6-R7:2項目)+旧形式(3項目)両対応フル答案 + 置換ガイド + NG→OK添削 + 採点者視点。
- **Red Line #4**: サイト無料A2と別の現場設定（河川護岸/管渠/築堤/函渠/砂防/道路改良）で書き下ろし、A2と完全一致長文行0件。

**Phase 2 配線完了・commit `6cdacb905`（develop に FF マージ済み、配線ブランチ削除済み、origin/develop より ahead 1・未push）**: note-magazines.ts エントリ `civil-2-experience-essay`（published:false・¥1,980/3本）/ magazine-placement.ts rule 7（civil-construction-2-secondary-* → 本マガジン）+ utmContentFor prefix / `scripts/pdf-specs/2級土木-施工経験記述-完成答案集.json`（3 PDF 生成検証済）。type-check 通過。main は 6cd5976d2（Phase1/2 コンテンツは含むが配線は develop のみ＝/deploy 待ち）。

**Phase 2 残（これだけ）**: ①カバー画像 `/images/magazines/civil-2-experience-essay-cover.{png,webp}`（published前は未参照）②note公開→URL投入→published:true（ユーザー作業・site流入の効果測定ゲート後）。published化で `civil-construction-2-secondary-*` 各ページに CTA 自動表示。feature ブランチの統合方法（PR or develop直マージ）はユーザー判断待ち。stale ブランチ `feature/civil-2-experience-essay-magazine`（Phase2含まず）は削除可。

**注意（2026-05-29 セッション）**: 作業中 develop に並行エージェントの commit（クロストレードオフM12等）が多数入り、共有作業ツリーの HEAD が勝手に develop へ切替わる事象が発生。feature ブランチ `feature/civil-2-experience-essay-magazine` は stale（Phase2を含まず、Phase1のみ。develは祖先）。両 commit とも develop に到達可能で安全。[[feedback_parallel_agent_git]] [[feedback_tool_output_hallucination]] のとおり git 実体を逐次確認した。**未 push**（develop push / main deploy はユーザー判断）。

---

**2級版 想定工事バンク展開設計（2026-07-01、commit `b42e3da6a`・develop push済）**: 1級の「想定工事100 完全攻略パック」(工事軸・5管理・104本)を2級へ移植する設計＋工種台帳を新設。SSOT=`docs/note/1級・2級土木/2級土木/2級版-想定工事バンク展開設計.md`。
- 核心の判断: ①答案は流用不可(2級=250字/4要素/現場代理人視点 vs 1級=200字/5要素/監理技術者。字数真実源 `src/app/tools/keiken-charcount/KeikenCharcountClient.tsx`)②管理は**5管理=3主+2備え**(当初3管理案→2026-07-01ユーザー判断で5管理フルへ転換。必出=品質/安全/工程はR03-R07実証、施工計画/環境は経験記述で未出題だが1級パックからdown-adaptで低コスト＋制度改定への保険＋書籍差別化。フレーミングは「頻出/出る」禁止・「未出題だが保険」と正直に=Red Line)③**中小規模36工種にフィルタ**(トンネル全8・ケーソン・シールド・鋼管矢板井筒・鉄道高架・大架設等の大規模=監理技術者領域を除外＝ペルソナ真正性 [[feedback_essay_persona_authentic_seat]])。
- 既存資産との棲み分け: 既存の管理軸「完成答案集(3管理×6工種¥1,980・公開済)」は入口サンプラーとして残置、工事バンクは工事軸の上位版・membership 2級ライブラリに内包。価格=¥5,480〜6,980(P1 15工種先行は暫定¥3,480〜3,980)。設計SSOT=`docs/note/1級・2級土木/2級土木/2級版-想定工事バンク展開設計.md`(commit 63409f62b)。
- ★既存6工種(道路改良/河川築堤/函渠/河川護岸/砂防堰堤/下水道管渠)は完成答案集から移植が最速。実装は `civil-keiken-essay-writer`＋`/keiken-charcount`(civil-2 250字)。統合SSOT=[[project_civil_membership_library_pivot]] のライブラリ内包モデル。

**量産進捗(2026-07-01・develop push済)**: マガジン dir=`docs/note/1級・2級土木/2級土木/magazines/2級土木-想定工事バンク/`。採番は**2級 工事NN=1級 工事NN**(1級完全攻略パックから down-adapt)。**P1 15/36本完成(2026-07-01・全てdevelop push済)**: 工事01道路改良盛土/02河川築堤/05サンドドレーン/07切土法面/17RCボックス/18逆T擁壁/27場所打ち杭/37舗装新設/38舗装打換え/40道路改良拡幅/51河川護岸/53樋門樋管/62砂防堰堤/63下水道管渠/80橋梁耐震補強。うち02・37は手書き(雛形/河川・非河川パターン)、02はcem…でなくcivil-keiken-essay-qaでQA済。他13本はcivil-keiken-essay-writerで生成→**私が独立検証で受入**(charcount全10○/note-lint/太字全角括弧0/監理技術者語0/工程(2)文言/近接工種との答案重複0)。**Generatorが雛形を高精度再現できることを実証**。仕様=工事軸5管理(3主品質/安全/工程＋2備え施工計画/環境)・各設問250字以内かつ≥200字・工程設問(2)は「講じた対策とその理由」(品質/安全は「検討した項目とその対応処置」)・現場代理人視点・太字内全角括弧禁止(note-lint Pattern A)。**公開準備完了(2026-07-01)**: 15記事とも3点セット(article+cover.png+hashtags.txt)完備・paidBoundary:品質管理付与・冒頭CTA(マガジンリンクカード)＋末尾関連リンクUTM化(check-note-site-utm準拠)。マガジンカバー/サイドバー生成・note掲載文.txt(¥3,480)。SoT=note-magazines.ts civil-2-koji-bank登録済(noteUrl=m8554e87ca6ec反映・**published:false据え置き**=15記事収録完了まで空/部分マガジン非広告ゲート)。node_modulesはnpm installで復旧済(pre-commit正常化)。**マガジンは手動公開済(m8554e87ca6ec)。15記事のnote公開＋収録は別PCのbrowser-useで実施予定→引き継ぎ=docs/handoffs/2026-07-01-civil2-koji-bank-note-publish.md**(paidBoundary品質管理/¥980/publish-note or note-publish.mjs/公開後noteId実体検証→published:true)。**残=15記事公開＋収録→published:true / P2で21工種追加し36へ / 索引記事(無料)**。
