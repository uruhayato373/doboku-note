// Shared building blocks for privacy page designs.
// Note: privacy pages should NEVER carry ads or affiliate links — placing AdSense
// on a privacy policy looks scammy and damages the trust the page is supposed to build.
// Monetization here is INDIRECT: clean disclosure → reader trust → paid products elsewhere.

const policySections = [
  {
    id: "intro",
    num: "01",
    title: "はじめに",
    icon: "IconShield",
    summary: "当サイトは、ユーザーの個人情報の保護を重要な責務と考えます。",
    body: "doboku-note（以下「当サイト」）は、ユーザーの個人情報の保護を重要な責務と考え、以下のプライバシーポリシーに従って個人情報を適切に取り扱います。本ポリシーは個人情報保護法・特定商取引法・GDPR の要件を踏まえて作成しています。",
  },
  {
    id: "collect",
    num: "02",
    title: "収集する情報",
    icon: "IconChart",
    summary: "アクセス解析データと、フォーム経由で提供いただく情報のみを収集します。",
    body: "当サイトが取得する情報は、自動収集される技術情報と、ユーザーが任意に提供する情報の2種類です。",
    table: {
      head: ["カテゴリ", "取得元", "保持期間", "目的"],
      rows: [
        ["IP アドレス", "全ページ", "26ヶ月", "アクセス解析・不正検知"],
        ["ブラウザ / OS / デバイス", "全ページ", "26ヶ月", "サイト最適化"],
        ["アクセス日時 / 参照元 URL", "全ページ", "26ヶ月", "流入分析"],
        ["問い合わせ内容", "問い合わせフォーム", "5年", "返信・サポート"],
        ["メールアドレス", "ニュースレター登録", "解除まで", "配信"],
      ],
    },
  },
  {
    id: "purpose",
    num: "03",
    title: "情報の利用目的",
    icon: "IconCheck",
    summary: "サイトの運営・改善・統計分析・法的義務の履行に限定します。",
    body: "収集した情報は、以下の目的に限定して利用します。",
    list: [
      "サイトの運営・改善",
      "ユーザーサポートの提供",
      "コンテンツの最適化",
      "不正アクセスの防止",
      "統計データの作成（個人を特定できない形式）",
      "法的義務の履行",
    ],
  },
  {
    id: "third",
    num: "04",
    title: "第三者との情報共有",
    icon: "IconUser",
    summary: "ユーザーの同意・法令の要請がある場合を除き、共有しません。",
    body: "以下の場合を除き、個人情報を第三者と共有することはありません。",
    list: [
      "ユーザーの同意がある場合",
      "法令に基づく場合",
      "生命、身体または財産の保護のために必要な場合",
      "公衆衛生の向上または児童の健全な育成の推進のために特に必要な場合",
    ],
  },
  {
    id: "cookies",
    num: "05",
    title: "クッキーと第三者サービス",
    icon: "IconCookie",
    summary: "Google Analytics・AdSense を含む第三者 Cookie を使用します。",
    body: "当サイトでは、ユーザーエクスペリエンスの向上と運営のために Cookie を使用しています。Cookie はブラウザの設定により無効化できます。",
  },
  {
    id: "retention",
    num: "06",
    title: "データの保存期間",
    icon: "IconClock",
    summary: "目的達成に必要な期間のみ保存し、その後は削除または匿名化します。",
    body: "個人情報は、利用目的の達成に必要な期間のみ保存し、その後は適切に削除または匿名化します。ただし、法令により保存が義務付けられている場合は、その期間に従います。",
  },
  {
    id: "security",
    num: "07",
    title: "データの保護",
    icon: "IconLock",
    summary: "TLS 暗号化通信と、最小権限アクセス制御を実施しています。",
    body: "当サイトは、個人情報の漏洩、滅失、毀損の防止その他の安全管理のために、必要かつ適切な措置を講じます。具体的には、TLS 1.3 による全通信の暗号化、管理画面への二要素認証、サードパーティ監査ログの常時記録を行っています。",
  },
  {
    id: "rights",
    num: "08",
    title: "ユーザーの権利",
    icon: "IconUserCheck",
    summary: "開示・訂正・削除・利用停止の各請求権を保証しています。",
    body: "ユーザーは以下の権利を有します。各請求は問い合わせ窓口より 30 日以内に対応します。",
    list: [
      "個人情報の開示請求",
      "個人情報の訂正・削除請求",
      "個人情報の利用停止・消去請求",
      "個人情報の第三者提供の停止請求",
    ],
  },
  {
    id: "changes",
    num: "09",
    title: "ポリシーの変更",
    icon: "IconRefresh",
    summary: "変更時は当サイト上で公表し、重大な変更時はメール通知します。",
    body: "当サイトは、必要に応じて本プライバシーポリシーを変更することがあります。変更があった場合は、当サイト上で公表し、ニュースレター購読者には重要な変更を電子メールで通知します。",
  },
  {
    id: "contact",
    num: "10",
    title: "お問い合わせ",
    icon: "IconMail",
    summary: "privacy@doboku-note.com にてお受けします。",
    body: "本プライバシーポリシーに関するお問い合わせは、以下の方法でお願いします。",
  },
];

const thirdPartyServices = [
  { name: "Google Analytics 4", purpose: "サイト分析", data: "IP / セッション / イベント", retention: "26ヶ月", category: "Analytics", optOut: "https://tools.google.com/dlpage/gaoptout" },
  { name: "Google AdSense", purpose: "広告配信", data: "Cookie / 興味カテゴリ", retention: "13ヶ月", category: "Ads", optOut: "https://adssettings.google.com/" },
  { name: "Cloudflare", purpose: "CDN / DDoS 防御", data: "IP / User-Agent", retention: "30日", category: "Infrastructure", optOut: "—" },
  { name: "Microsoft Clarity", purpose: "ヒートマップ", data: "セッション録画 (匿名化)", retention: "12ヶ月", category: "Analytics", optOut: "サイト内設定" },
  { name: "Resend", purpose: "メール配信", data: "メール / 開封", retention: "解除まで", category: "Email", optOut: "メール内リンク" },
  { name: "note (note.com)", purpose: "有料マガジン販売", data: "決済はnoteで完結", retention: "note ポリシー準拠", category: "Payment", optOut: "note アカウント設定" },
];

const cookieCategories = [
  { key: "essential", label: "必須", color: "var(--ink)", required: true, desc: "サイトの基本機能（ログイン状態・カート・テーマ）に必要", count: 3 },
  { key: "analytics", label: "分析", color: "var(--accent)", required: false, desc: "Google Analytics・Microsoft Clarity による利用状況の集計", count: 6 },
  { key: "ads", label: "広告", color: "var(--amazon)", required: false, desc: "Google AdSense によるパーソナライズ広告", count: 4 },
  { key: "preference", label: "設定", color: "#5b21b6", required: false, desc: "ダークモード設定・読了位置の記憶", count: 2 },
];

window.PrivacyMock = { policySections, thirdPartyServices, cookieCategories };
