---
title: 自治体の土木担当シリーズで確かめた一次資料（骨子と執筆担当が引く）
---

# 自治体の土木担当シリーズで確かめた一次資料（骨子と執筆担当が引く）

シリーズ `municipal-civil-engineer`（`config/content-series.json`）の章の骨子を作るときと記事を書くとき、担当はまずここを読む。ここにある値は、2026-10-13 に骨子の担当が公開ページ・e-Gov の条文で確かめたもの。ここに無い値だけを WebSearch / WebFetch で確かめる。手順は [book-coverage-expansion.md](./book-coverage-expansion.md) §4、骨子は `content/sources/series/municipal-civil-engineer/`。

- 法令の条は参考文献の台帳の id で引く（e-Gov の法令 ID と条は `config/egov-laws.json`・`npm run egov-laws`）。ここには条文で確かめた値だけを書く
- 自治体の資料（市・県の要領・手数料など）は「例として」使う値で、全国の決まりではない
- 担当が新しく確かめた値は、返答に「値 — 出典 URL（版・条・頁）」で書く。親がここへ足す。改正を見つけたら古い行を消さずに「（令和◯年◯月に改正）」と書き足す
- 令和8年法律第65号（下水道法等の一部を改正する法律）は道路法の占用（申請書の記載事項・地下の占用工事の完了の届出・占用物件等維持修繕協定）も改める。施行は公布（令和8年7月23日）から 6 か月以内の政令で定める日（https://www.mlit.go.jp/report/press/content/002014980.pdf）。先に施行したのは災害時の下水道の復旧工事の代行の規定だけ（令和8年8月17日）。e-Gov の改正履歴にある令和9年1月22日は期限の上限で、確定した施行日ではない（令和8年10月15日時点で施行期日の政令は未確認）

## 道路（A-06・A-07・A-09・A-10）
- 市町村道の実延長 1,035,760.3 km、全体 1,231,084.7 km（令和5年3月31日現在）。市町村道の割合 約84.1% — https://www.mlit.go.jp/road/soudan/soudan_10b_01.html（道路統計年報2024）
- 道路区域決定の公示の図面は縮尺千分の一以上 — 道路法施行規則第2条
- 供用開始の公示の図面は国道・都道府県道 五万分の一、市町村道 一万分の一程度 — 同規則第3条
- 路線認定の公示の図面は都道府県道 五万分の一、市町村道 一万分の一程度 — 同規則第1条の2
- 道路台帳の調書は15項目、図面は千分の一以上、変更時はすみやかに訂正 — 同規則第4条の2
- 承認の要らない軽易な維持は砂利・土砂の局部的補充など構造に影響しないもの — 道路法施行令第3条
- 路線の変更と区域の変更の区別・付替え時の旧道新道・供用廃止 — https://www.mlit.go.jp/notice/noticedata/sgml/066/79000001/79000001.html（建設省道発第416号 昭和29年11月17日。条番号は旧法）
- 道路使用許可の標準処理期間 7日以内（休日除く・協議期間は別） — https://www.police.pref.saitama.lg.jp/documents/32088/77-1dourosiyou.pdf（埼玉県警察 令和6年3月1日）
- 承認の標準処理期間 20日（警察協議を除く）— https://www.pref.shiga.lg.jp/kensei/zyourei/308809/308802/11093.html（滋賀県）
- 全国道路基盤地図等データベースの一般公開 令和6年5月31日 — https://www.mlit.go.jp/report/press/road01_hh_001807.html
- 国交省「承認工事の概要」PDF（2019年2月）は24条の文言が旧い。条文は e-Gov — https://www.mlit.go.jp/road/senyo/pdf/syonin-gaiyou.pdf
- 例（自治体）: 川崎市 手続き依頼時期（議決 40日前・告示 30日前）、堺市 境界確認証明 2,000円、横浜市 道路台帳図の写し 300円、名古屋国道事務所 官民境界確認 約3か月
## 川・里道（A-13・A-14・A-15・A-19）
- 一級水系 109・一級河川 14,066・二級河川 7,081・準用河川 14,327（平成30年4月30日現在・古い） — https://www.mlit.go.jp/river/basic_info/iken/question/
- 保全区域は河川区域の境界から 50 m を超えて指定しない（例外あり） — 河川法第54条第3項
- 市長が施行できる河川工事の流域面積の限度おおむね 30 km² — 河川法施行規則第7条の4
- 許可の承継は 30 日以内に届出 — 河川法第33条第3項
- 第26・27条違反は 1 年以下の拘禁刑または 50 万円以下の罰金 — 河川法第102条
- 河川管理施設の敷地から 10 m 以上離れた土地の耕うんは許可不要 — 河川法施行令第15条の4第1号
- 径間長の上限 50 m — 河川管理施設等構造令第63条／伏せ越しの深さ 2 m 以上 — 同第72条
- 堤脚から二割勾配の線の外かつ 20 m（深さ10m以内は10m）を超える範囲は支障なし・排水機場の吐出水槽は堤防のり尻から 5 m 以上 — https://www.mlit.go.jp/notice/noticedata/sgml/052/78000086/78000086.html（平成6年5月31日 建設省河治発第40号）
- 工作物設置許可基準: 平成6年9月22日 建設省河治発第72号・最終改正 平成14年7月12日 国河治第71号 — https://www.mlit.go.jp/river/shishin_guideline/kasen/pdf/kouisakubutsu_secchi_kijun.pdf
- 許可工作物技術審査の手引き: 平成23年5月11日 事務連絡 — https://www.mlit.go.jp/river/shishin_guideline/kasen/pdf/kyokakousakubutu_tebiki.pdf
- 里道・水路の譲与は平成17年3月31日までに完了（延長期限 平成19年3月31日）。譲与されなかったものは一括用途廃止で国が直接管理 — https://www.mof.go.jp/about_mof/act/kokuji_tsuutatsu/tsuutatsu/TU-19990716-2592-14.html（蔵理第2592号・平成30年と令和4年改正）
- 譲与の根拠 国有財産特別措置法第5条第1項第5号
- 黙示の公用廃止は形態・機能を全く喪失した場合 — 最高裁 昭和52年4月28日 https://www.courts.go.jp/hanrei/74531/detail2/index.html ／名古屋高裁 平成27年3月19日 https://www.courts.go.jp/hanrei/17535/detail5/index.html
- 準用河川内の国有地の占用許可は市町村長 — https://www.mlit.go.jp/notice/noticedata/sgml/050/78000020/78000020.html（昭和47年9月7日 河政発第78号）
## 仕事の土台・1年（A-01・A-03〜A-05）
- 土木費 12兆9,265億円（前年度比 +4.1%・道路橋りょう +3.8%・都市計画 +4.5%・河川海岸 +1.8%）、普通建設事業費 +1.9% — 令和8年版地方財政白書（令和6年度決算）https://www.soumu.go.jp/menu_seisaku/hakusyo/chihou/r08data/2026data/r08czb01-04.html
- 地方債 8兆8,506億円・地方交付税 19兆9,346億円（決算） — 同 https://www.soumu.go.jp/menu_seisaku/hakusyo/chihou/r08data/2026data/r08czb01-03.html
- 社会資本整備総合交付金 令和8年度予算 4,597億円・防災・安全交付金 8,529億円・効果促進事業は全体の2割目途 — https://www.mlit.go.jp/page/content/002000088.pdf
- 基幹事業 17・交付期間おおむね 3〜5 年 — 社会資本整備総合交付金交付要綱（令和8年4月7日最終改正）https://www.mlit.go.jp/page/content/001852523.pdf
- 地方交付税の総額（所得税・法人税 33.1%・酒税 50%・消費税 19.5%・地方法人税全額）、普通 94%・特別 6%、基準財政収入額は原則 75% — https://www.soumu.go.jp/main_content/001022461.pdf（年度記載なし）
- 令和8年度地方債同意等基準（総務省告示第159号）— https://www.soumu.go.jp/main_content/001068238.pdf
- 河川の延長 直轄約10,600km・指定区間約77,500km・二級約35,900km・準用約20,100km — https://www.mlit.go.jp/river/shinngikai_blog/kentoukai/drone/dai01kai/pdf/2_kanri.pdf（河川ハンドブック2018）
- 道路の種類ごとの管理者 — https://www.mlit.go.jp/road/sisaku/dorogyousei/2.pdf
- 自治事務と法定受託事務の関与の違い — https://www.soumu.go.jp/main_content/000451012.pdf
- 令和8年度出水期から国管理河川で堤防に直接影響する工種も条件付きで施工可 — https://www.mlit.go.jp/river/shishin_guideline/kasen/pdf/2607_shussuikisekou.pdf
- 施工時期の平準化の見える化 第6回 令和8年3月31日 — https://www.mlit.go.jp/totikensangyo/const/totikensangyo_const_tk1_000105.html
- 条例は公布から 10 日・法律は 20 日で施行 — 地方自治法第16条・法の適用に関する通則法第2条
- 法令用語の読み分け — 法務省「法令翻訳の手引き」令和6年3月 https://www.moj.go.jp/content/001414689.pdf
## 点検・計画・海岸港湾（A-11・A-16〜A-18）
- 道路橋定期点検要領（技術的助言）令和6年3月: 橋長2.0m以上・5年に1回が基本 — https://www.mlit.go.jp/road/sisaku/yobohozen/tenken/yobo7_1.pdf
- 点検要領の版（橋・トンネル等 令和6年3月・舗装 平成28年10月・小規模附属物 平成29年3月・土工構造物 平成29年8月）— https://www.mlit.go.jp/road/sisaku/yobohozen/yobohozen.html
- 健全性 4 区分 — 道路メンテナンス年報 令和7年8月25日 https://www.mlit.go.jp/report/press/content/001906343.pdf
- 2025年度末 Ⅲ・Ⅳの橋 51,046・地方公共団体の2巡目Ⅲ・Ⅳ 48,494 橋のうち着手 69%・完了 45% — 道路メンテナンス年報（2025年度）令和8年8月26日 https://www.mlit.go.jp/road/sisaku/yobohozen/pdf/r07/r07road_outline.pdf
- 集約・撤去・機能縮小の検討 92%（2024年度末）— 同 3巡目1年目 p.8
- 道路メンテナンス事業補助: 国費率 5.5/10×δ・令和8年度の追加要件 — https://www.mlit.go.jp/road/sisaku/yobohozen/pdf/jigyo-hojo.pdf
- 河川管理施設の点検 1年に1回以上 — 河川法施行令第9条の3・施行規則第7条の2（記録の保存）
- 中小河川の点検要領（国水環保第7号 平成27年3月31日改訂）: 出水期前に年1回以上・5年程度で全区間徒歩点検 — https://www.mlit.go.jp/river/shishin_guideline/kasen/pdf/tyusyo_tenken.pdf
- 直轄の点検・評価要領 平成31年4月（A〜D 区分）— https://www.mlit.go.jp/river/shishin_guideline/kasen/pdf/01_teibou_tenkenhyouka_youryou.pdf
- 樋門等の操作員の退避のガイドライン 令和元年6月21日改正 — https://www.mlit.go.jp/river/shishin_guideline/kasen/pdf/himon_sousa_guideline.pdf
- 総務省の陸閘の勧告 令和5年7月7日（安全最優先の規定なし約40%）— https://www.soumu.go.jp/main_content/000891170.pdf
- 整備計画の案は関係市町村長の意見（河川法施行令第10条の4）・準用河川に第16条〜16条の3は準用しない（同第56条）
- 降雨量変化倍率（2℃: 北海道1.15・その他1.1）— https://www.mlit.go.jp/river/shinngikai_blog/chisui_kentoukai/pdf/r0304/00_gaiyou.pdf
- 流域治水の答申 令和2年7月・3つの対策 — 社整審答申 6.2.1
- 流域治水プロジェクト 109 水系 令和3年3月30日公表 — https://www.mlit.go.jp/river/kasen/ryuiki_pro/index.html
- 流域治水関連法 令和3年法律第31号（5月10日公布・11月1日施行）— https://www.mlit.go.jp/report/press/mizukokudo05_hh_000133.html
- 特定都市河川法: 雨水浸透阻害行為 1,000㎡以上・貯留浸透施設の認定 30㎥以上 — https://www.mlit.go.jp/report/press/content/001430872.pdf
- 海岸保全区域は水際線から原則 50 m・操作規則は市町村長の意見 — 海岸法第3条第3項・第14条の2
- 水門・陸閘等のガイドライン Ver.3.3 令和8年3月 — https://www.mlit.go.jp/river/shishin_guideline/kaigan/suimonguidelinev3.3.pdf
- 港湾の点検診断ガイドライン 令和8年改訂（報道発表 令和8年4月17日）— https://www.mlit.go.jp/report/press/port05_hh_000440.html
- 臨港地区内の行為の届出は工事開始の 60 日前まで — 港湾法第38条の2
## 事業（A-20〜A-25・A-27・A-28）
- 社会的割引率 4%・指標 3 つ — 費用便益分析に関する技術指針（共通編）令和7年9月 https://www.mlit.go.jp/tec/hyouka/public/250918_shishin/shishin/shishin250918.pdf
- 再評価（未着工5年・継続中5年・再評価後5年）、実施主体は地方公共団体等 — 再評価実施要領（令和7年9月18日施行・令和8年度以降）https://www.mlit.go.jp/tec/hyouka/public/250918/youryou/04_sai_koukyou250918.pdf
- 事後評価は完了後 5 年以内 — https://www.mlit.go.jp/tec/hyouka/public/250918/youryou/06_jigo_koukyou250918.pdf
- 新規事業採択時評価の資料は地方公共団体等が作成 — https://www.mlit.go.jp/tec/hyouka/public/250918/youryou/02_shinki_koukyou250918.pdf
- 計画段階評価の対象は直轄と独法 — https://www.mlit.go.jp/tec/hyouka/public/250918/youryou/01_keikaku_koukyou250918.pdf
- 道路の便益 3 つ・割引率 4% — 費用便益分析マニュアル 令和7年8月 https://www.mlit.go.jp/road/ir/ir-hyouka/ben-eki_2.pdf
- 第6次社会資本整備重点計画 令和8年1月16日閣議決定・令和12年度まで — https://www.mlit.go.jp/report/press/sogo12_hh_000496.html
- 第三次国土形成計画 令和5年7月28日閣議決定 — https://www.mlit.go.jp/kokudoseisaku/kokudokeikaku_fr3_000003.html
- 構想段階ガイドライン 平成20年4月・解説 平成21年3月 — https://www.mlit.go.jp/tec/kanri/pdf/koukyou_guidegaiyou.pdf
- 損失補償基準要綱 昭和37年6月29日閣議決定・令和元年12月20日最終改正 — https://www.mlit.go.jp/common/001338602.pdf
- 税の特例 5,000万円特別控除（申出から6か月以内）・代替資産 — https://www.mlit.go.jp/common/001208299.pdf
- 民間の届出は 60 日前（文化財保護法第93条）・停止命令 3か月以内・通算6か月（第96条）・自治体は通知（第94条）
- 発掘調査の経費負担の考え方 — 文化庁次長通知 平成10年9月29日 庁保記第75号 https://www.bunka.go.jp/seisaku/bunkazai/shokai/pdf/hokoku_03.pdf
- 周知の埋蔵文化財包蔵地 47 万か所以上 — https://www.bunka.go.jp/seisaku/bunkazai/shokai/pdf/93958001_02.pdf（頁未確認）
- 建設リサイクル法の対象規模（解体 80㎡・新築 500㎡・修繕等 1 億円・建築物以外 500 万円）・特定建設資材 4 品目 — 同法施行令第1・2条／公共は通知（同法第11条）
- 特定建設作業の届出は 7 日前 — 騒音規制法・振動規制法第14条／騒音 85 dB・作業時間 — 告示 https://www.env.go.jp/hourei/07/000050.html／振動 75 dB — 振動規制法施行規則第11条
- 環境影響評価法の対象道路に市町村道は含まれない — 同法施行令別表第一
- 建設副産物適正処理推進要綱（平成14年5月30日改正）第5・12(1)・16 — https://www.mlit.go.jp/sogoseisaku/region/recycle/d11pdf/recyclehou/recycle_rule/youkou.pdf
- 発生土の指定利用等 実施率 国 99%・市区町村 69% — https://www.mlit.go.jp/totikensangyo/const/content/001499462.pdf（年度未確認）
- 優先的検討規程は人口 5 万人以上 — https://www8.cao.go.jp/pfi/yuusenkentou/pdf/shishin7.pdf（令和7年6月4日改定）
- 包括的民間委託の導入団体 374（2021年4月）— https://www.mlit.go.jp/sogoseisaku/maintenance/_pdf/houkatsu_tebiki.pdf
- 土木工事監督技術基準（案）（令和4年3月31日最終改正）第2条 — https://www.mlit.go.jp/tec/content/001475846.pdf
- 監督・検査の方法 — 地方自治法施行令第167条の15
- 低入札の確認頻度 — 発注関係事務の運用に関する指針 令和7年2月3日改正 https://www.mlit.go.jp/tec/content/001860706.pdf
## 設計変更・安全・災害（A-29・A-30・A-37・A-38）
- 公共工事標準請負契約約款 令和7年12月2日改正 — https://www.mlit.go.jp/totikensangyo/const/content/001499463.pdf（第26条 スライド: 12か月経過後・残工事の 1.5% 超／第30条 不可抗力: 請負代金の 1/100 超を発注者負担／第21条 著しく短い工期の禁止／第3条第2項 内訳書に安全衛生経費）
- 関東地整 設計変更ガイドライン（総合版）令和7年3月（30％超でも応じないことはあってはならない＝国の運用）— https://www.ktr.mlit.go.jp/ktr_content/content/000697185.pdf
- 運用指針 令和7年2月3日改正 Ⅱ1-3・Ⅲ1-1・Ⅲ1-2(5) — https://www.mlit.go.jp/tec/content/001860706.pdf
- 国庫負担法 第6条（市町村は一箇所 60 万円未満を除外・100 m 以内は一箇所）・第4条（負担率 2/3・3/4・4/4）・施行令第4〜7条
- 査定方針解説 令和4年6月（机上査定 原則 1,000万円・採択保留 原則 4億円）— https://www.mlit.go.jp/toshi/content/001402749.pdf
- 災害報告は終息後 10 日以内・査定は通常 2 か月以内・査定前の着工可 — https://www.mlit.go.jp/river/bousai/hukkyu/pdf/00-index-nagare.pdf
- 公衆災害防止対策要綱（土木工事編）令和元年9月2日 国交省告示第496号 — https://www.mlit.go.jp/tec/content/001305480.pdf
- 土木工事安全施工技術指針 令和8年3月版 — https://www.mlit.go.jp/tec/content/001990889.pdf
- 防災基本計画 令和8年7月14日修正 — https://www.bousai.go.jp/taisaku/keikaku/kihon.html
- 避難情報に関するガイドライン 令和8年3月改定（令和8年5月下旬の新しい防災気象情報の運用開始に合わせた改定。旧版の関連情報の番号とは対応しない）— https://www.bousai.go.jp/oukyu/hinanjouhou/r3_hinanjouhou_guideline/pdf/hinan_guideline_r8_1.pdf
- 水害ハザードマップ作成の手引き 平成28年4月（令和3年12月一部改定）— https://www.mlit.go.jp/river/basic_info/jigyo_keikaku/saigai/tisiki/hazardmap/suigai_hazardmap_tebiki_1.pdf
## 土砂災害・説明・資格・社会資本・ハブ（A-39〜A-41・A-02・A-00）
- 土砂災害警戒区域 約72万1千・特別警戒区域 約62万1千（令和8年6月末）— https://www.mlit.go.jp/mizukokudo/sabo/content/001888481.pdf
- 土砂災害の避難指示は警戒区域が発令の単位 — 避難情報に関するガイドライン（令和8年3月改定）4.3（p.94）・関連情報㉕（p.96）
- 急傾斜地法第7条第4項（国・地方公共団体は協議）・第21条（国の補助 1/2 以内）・第23条（受益者負担金）／砂防法第15条（市町村負担）
- 土砂災害防止法第8条（地域防災計画・周知）・第8条の2（要配慮者利用施設の避難確保計画）
- 議決を要する工事請負の基準額（都道府県 5億・指定都市 3億・市 1.5億・町村 5千万）— 地方自治法施行令第121条の2の2 別表第三
- 決算の成果説明・入札契約の公表 — 地方自治法第233条・入札契約適正化法第7・8条
- 公用文作成の考え方 令和4年1月7日 — https://www.bunka.go.jp/seisaku/bunkashingikai/kokugo/hokoku/pdf/93731901_01.pdf
- 構想段階の計画策定プロセスガイドライン 2008年4月 — https://www.mlit.go.jp/tec/kanri/pdf/processGL.pdf
- 令和8年測量士補試験 受験 12,269・合格 5,447・合格率 44.4% — https://www.gsi.go.jp/LAW/SHIKEN/shikakuseido20260625_00001.html
- 普通建設事業費（令和6年度決算）15兆8,231億円（補助 7兆4,796億・単独 7兆5,522億・直轄負担金 7,914億）、更新整備の割合 都道府県 43.6%・市町村 61.1% — 地方財政白書 令和8年3月 第19表 p.50
- 国土交通白書2025 p.142〜144（予防保全で 30 年累計約 3 割縮減・群マネのモデル地域 11 件 40 団体）
- 建設後 50 年以上の割合の対象施設数 — https://www.mlit.go.jp/sogoseisaku/maintenance/_pdf/50year_percentage.pdf
