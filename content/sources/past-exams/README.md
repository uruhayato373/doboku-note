# content/sources/past-exams/ — 公式過去問の原本

試験実施機関が公開する過去問（問題・正答・解答例）の原本 PDF の置き場。`{資格}/{年度}/` で並べる。

- PDF は Git に入れない（`.gitignore`）。正本は Google Drive `原資料PDF/過去問/{資格}/{年度}/`（drive-vault group `past-exam-source-pdf`）
- 年度在庫（公式掲載状態・公式 URL・取得日・出題形式の分析）の SSOT は `data/pastexams/inventory.json`
- 取得・Drive 退避・照合・台帳登録の手順は `/past-exam-archive`（`.claude/skills/conversion/past-exam-archive/SKILL.md`）
- 第三者の模範解答・解説・模擬試験は公式ではないので、教材側 `content/sources/textbook/{資格}/過去問解説/` に置く
