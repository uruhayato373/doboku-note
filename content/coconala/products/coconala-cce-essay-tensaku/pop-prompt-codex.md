# 商品画像（POP）生成プロンプト — Codex 用

DN-0464。Codex にこのファイルの「依頼文」をそのまま渡す。意匠方針は `.claude/knowledge/reference/pop-image-policy.md`。

## 依頼文

doboku-note（/Users/minamidaisuke/doboku-note）で、ココナラ「コンクリート主任技士 小論文添削」（serviceId: coconala-cce-essay-tensaku・https://coconala.com/services/4425046）の商品画像を、承認済み POP 意匠（pop-20260927）の同シリーズとして作る。

参照画像（添付して編集ベースにする）: Drive `マイドライブ/doboku-note/制作物/ココナラ/pop-20260927/` の `thumb-cce-essay-pdf.png`（主任技士＝紫・1448×1086）と `thumb-tensaku-set.png`（添削の構図）。過去の生成プロンプトは同フォルダ `generation-manifest.json`（key: cce-essay-pdf / 2kyu-tensaku-3theme）。

```text
Edit the reference into a matching thumbnail for a DIFFERENT product in the same Coconala storefront. Same 4:3 dimensions (1448×1086), same large bold tightly-packed POP type style, same friendly original male engineer with plain white helmet, glasses, navy workwear and red pen on the right, same big yellow credential band. No logo, no price. This must look like the same design series.
Replace ALL original text, verbatim, with these product-specific texts:
Top band (very large, 2 clear lines): "コンクリート" plus "主任技士".
Main title left two lines: "小論文" and "添削" (second line in vivid red, huge; adapt font to fit, don't overlap character).
Supporting line: "題意・技術・実務経験まで".
Pill: "48時間｜書き直し1回".
Large yellow bottom credential band: "技術士〈総合技術監理部門〉" then "が直接添削".
Use rich purple/indigo for コンクリート主任技士 (same as the cce-essay-pdf reference). Keep yellow and red accents.
This is a personal correction service: the teacher may hold a red pen over a generic answer sheet with red marks, but no readable sample text.
No additional text, no old leftover phrases (no "模範答案", "PDF", "が制作"), no claims of guaranteed passing. Character must not cover text. Retain impactful large qualification/service and prominent 総合技術監理部門; narrow margins but no cut off letters.
```

確認（NG なら再生成）: 原寸と幅360pxで、6つの文字列が一字違わず入り、切れ・誤字・余計な文字が無い。顔が参照キャラクターと同一人物で、文字に重ならない。

保存と登録:
1. `.claude/config/coconala/assets/pop-20260927/thumb-cce-essay-tensaku.png` に置き、Drive の同フォルダにもコピー。`generation-manifest.json` に key "cce-essay-tensaku"（exam / examSub / line1 / line2 / benefit / scope / action / color:"purple" / prompt / path）を追加
2. 運営者に見せて承認をもらう（承認前に 3〜4 をしない）
3. 承認後、`.claude/config/coconala-thumb-approved.json` の coconala-cce-essay-tensaku の path と sha256（`shasum -a 256`）を更新
4. `node scripts/coconala-edit.mjs --service coconala-cce-essay-tensaku --image pop-20260927/thumb-cce-essay-tensaku.png --replace-image` で確認 → `--commit` で差し替え → `npm run check-coconala-wiring` が exit 0
5. 変更ファイルだけ git add して develop へ commit
