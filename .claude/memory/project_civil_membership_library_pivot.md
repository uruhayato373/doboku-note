---
name: project_civil_membership_library_pivot
description: 土木セコカン合格ラボ=ライブラリ内包モデル。完成答案/過去問は会員特典に内包OK(旧「会員に入れない」失効)。一線はFLOW(予想/添削)を買い切りに出さない、だけ
metadata: 
  node_type: memory
  type: project
  originSessionId: 23437d94-469a-4531-b01d-675ad44079ff
---

note メンバーシップ「**土木セコカン合格ラボ**」（1級・2級土木・URL は SKU civil-membership-lab）は **2026-07-01 ピボット（決定1）で「ライブラリ内包＋買い切りアンカー」モデル**へ転換。真実源＝`docs/note/1級・2級土木/noteコンテンツ計画.md` §1.4。

**旧「非重複二刀流（過去問・完成答案を会員に入れない）」は失効。** 現行：
- **完成答案・過去問（買い切りマガジン civil-1/2 の experience/pastexam/combo・完全攻略パック）は会員特典マガジンに内包＝会員読み放題**（入会の引き金）。**全6本を通年/添削 両プランに紐付け済み**（2026-07-01・ブラウザ確認）。**ガード3＝有料マガジンを特典化しても会員が無課金で読める、を実機検証済み**。
- **唯一の一線＝FLOW（月例予想・毎週添削・締切伴走）を買い切りに出さない**（出すと会員になる理由が消える）。会員お題は「お題＋着眼点＋提出枠」まで、完成答案は書き下ろさず既存買い切りを紐付けで提供。
- 買い切りは廃止せず＝¥9,800完全攻略パックを会員¥1,480/月のアンカー＋サブスク拒否層の受け皿。既存購入者は grandfather。

**Why**: 完成答案は所有価値が薄く¥9,800パック実売ゼロ(sales-log)。網羅性は「会員が自分の工種を探す検索ライブラリ」で最も活きる＝ライブラリが引き金・FLOWが引き止め(LTV本体=添削¥2,980×4ヶ月)。

**How to apply**: note-membership-operator の **Red Line #10 は逆転済み**（完成答案の会員内包OK・FLOWを買い切りに出さないのが一線）。SSOT是正済(PR#327)＝operator/agents-registry/メンバーシップREADME/docs/note README/1級2級プラン文書。旧「会員に入れない」を再適用しない。プラン設定（会費/定員/説明の保存）は [[reference_note_membership_plan_edit]] 相当の note-membership-plan-edit.mjs（保存=非公開のまま可逆・公開は運営者手動）。会員ローンチ残＝添削実測(定員最終判断・現20)→プラン公開③→SKU published:true。関連 [[project_civil1_flagship_pack]]。
