# 商品画像（POP）生成プロンプト — Codex 用

DN-0941。Codex にこのファイルの「依頼文」をそのまま渡す。意匠方針は `.claude/knowledge/reference/pop-image-policy.md`。

## 依頼文

doboku-note（/Users/minamidaisuke/doboku-note）で、ココナラ「コンクリート主任技士 小論文の診断」（serviceId: coconala-cce-essay-shindan・下書き 4482903・未公開）の商品画像を、承認済み POP 意匠（pop-20260927）の同シリーズとして作る。

参照画像（添付して編集ベースにする）: `content/coconala/assets/pop-20260927/thumb-cce-essay-tensaku.png`（同じ主任技士の添削・紫・承認済み。実体が無ければ Drive `マイドライブ/doboku-note/制作物/ココナラ/pop-20260927/` の同名ファイル）。過去の生成プロンプトは同フォルダ `generation-manifest.json`（key: cce-essay-tensaku）。

```text
Edit the reference into a matching thumbnail for a DIFFERENT product in the same Coconala storefront. Same 4:3 dimensions (1448×1086), same large bold tightly-packed POP type style, same friendly original male engineer with plain white helmet, glasses, navy workwear on the right, same big yellow credential band. No logo, no price. This must look like the same design series, but clearly a lighter "diagnosis" service, not the full correction service.
Replace ALL original text, verbatim, with these product-specific texts:
Top band (very large, 2 clear lines): "コンクリート" plus "主任技士".
Main title left two lines: "小論文" and "診断" (second line in vivid red, huge; adapt font to fit, don't overlap character).
Supporting line: "減点箇所をA/B/Cで判定".
Pill: "1本｜48時間で返却".
Large yellow bottom credential band: "技術士〈総合技術監理部門〉" then "が直接診断".
Use rich purple/indigo for コンクリート主任技士 (same as the reference). Keep yellow and red accents.
The teacher may hold a magnifying glass or a checklist over a generic answer sheet with a few red marks, but no readable sample text and no rewritten sentences.
No additional text, no old leftover phrases (no "添削", "書き直し", "模範答案", "PDF", "が制作"), no claims of guaranteed passing. Character must not cover text. Retain impactful large qualification/service and prominent 総合技術監理部門; narrow margins but no cut off letters.
```

確認（NG なら再生成）: 原寸と幅360pxで、6つの文字列が一字違わず入り、切れ・誤字・余計な文字が無い。「添削」と読める文字が残っていない。顔が参照キャラクターと同一人物で、文字に重ならない。

保存と登録:
1. `content/coconala/assets/pop-20260927/thumb-cce-essay-shindan.png` に置き、Drive の同フォルダにもコピー。`generation-manifest.json` に key "cce-essay-shindan"（exam / examSub / line1 / line2 / benefit / scope / action / color:"purple" / prompt / path）を追加
2. 運営者に見せて承認をもらう（承認前に 3〜5 をしない）
3. 承認後、`data/coconala/thumb-approved.json` に coconala-cce-essay-shindan の path と sha256（`shasum -a 256`）を足す
4. 手元に置いてあるカタログの行（config/products.json・config/coconala-listings.json・src/lib/coconala-services.ts。控えは `.tmp/dn-0941-catalog.patch`）を戻し、`npm run check-coconala-wiring` が exit 0 になることを確かめて、変更ファイルだけ git add して develop へ commit
5. 運営者が下書き 4482903 を確認したら、`node scripts/coconala-publish.mjs --service coconala-cce-essay-shindan --image pop-20260927/thumb-cce-essay-shindan.png --commit` で公開する（本文の「11/25 までに受領した分は試験前に返却」を守れる日までに）
