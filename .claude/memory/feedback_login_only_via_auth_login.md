---
name: feedback_login_only_via_auth_login
description: 収集が使うログインは npm run auth:login だけ。ほかのブラウザで入っても土曜の収集には効かない。失敗印と KDP の端末の記憶
metadata:
  type: feedback
---

土曜の収集・週次レビューが使うログイン（KDP・A8・もしも・note・ココナラほか）は、`npm run auth:login -- --service <id>` で開いた窓で入ったものだけが効く。アプリ内ブラウザ・Playwright MCP・普段の Chrome でログインしても、収集のプロファイル（`~/Library/Application Support/doboku-note/playwright-auth/profiles/`）には入らない。

**Why:** 2026-11-15、運営者が「この Mac で何度も（昨日も）ログインしているのに毎週切れる」と指摘した。調べると、運営者は Claude が開いたブラウザでログインしており、auth:login の成功は KDP 11/8・もしも 11/3 が最後だった。あわせて、自動の入り直しの失敗印 `metadata/<service>.autologin-failed`（KDP 10/31・もしも 10/11）が消えずに残り、キーチェーンの資格情報での入り直しを止めていた（DN-1212 で直す）。KDP の 2 段階認証は Mac の指紋で、機械では通さない（運営者の決定）。

**How to apply:**
- ログインが要ると分かったら、エージェントはほかのブラウザを開かず、運営者に `npm run auth:login -- --service <id>` を案内する（入力は運営者だけ）。KDP では画面の「ログインしたままにする」「このブラウザではコードを要求しない」に印を付けてもらう。
- 「ログインしたのに切れる」と言われたら、先に `npm run auth:status -- --all` と auth root の `metadata/*.autologin-failed` を見る。置き場のずれ（worktree・launchd）は原因ではない（どこから実行しても同じ場所）。
- キーチェーンの資格情報での入り直し（`npm run auth:refresh`）はエージェントの実行では走らない設計。運営者の端末か土曜の収集で回す。

関連: [[project_ci_encrypted_state_login_collectors]]・[[feedback_verify_your_excuses]]
