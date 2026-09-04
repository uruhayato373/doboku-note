/**
 * Instagram カルーセル予約投稿スクリプト（Meta Business Suite / Playwright 永続プロファイル）
 *
 * 既存の Graph API ルート（scripts/publish-ig.mjs）は「予約投稿」をネイティブサポートしない。
 * このスクリプトは Business Suite（business.facebook.com）のコンポーザを Playwright で操作し、
 * カルーセル（画像 2-10 枚）を「予約投稿（スケジュール）」する。
 *
 * 設計は .claude/skills/social/publish-x/publish-x.ts に倣う:
 *   - システム Chrome（channel:"chrome"）+ 永続プロファイルで bot 検知を回避
 *   - 偽成功を物理的に出さない（各ステップを read-back 検証、未確認なら中止）
 *   - 初回 / セレクタ更新後は必ず --dry-run（予約確定の手前で停止しスクショ）
 *
 * ⚠️ ToS 注意: Business Suite のブラウザ自動操作は Meta 利用規約上グレー〜違反。
 *    アカウント制限のリスクは自己責任。公式ルートが必要なら scripts/publish-ig.mjs（Graph API）を使う。
 *
 * ⚠️ セレクタ未検証: ログイン後の Business Suite DOM は実アカウントでしか確認できない。
 *    SELECTORS は候補配列（JA/EN/role）で組んであるが、初回 --dry-run のスクショを見て
 *    SKILL.md のセレクタ表と本ファイルの SELECTORS を必ず調整すること。
 *
 * 使い方:
 *   # 0) 初回ログイン（一度だけ。2FA はブラウザ上で手動）
 *   npx tsx .claude/skills/social/publish-ig-bs/publish-ig-bs.ts login
 *
 *   # 1) dry-run（初回・セレクタ更新後は必須。予約確定の手前まで実行しスクショ）
 *   npx tsx .claude/skills/social/publish-ig-bs/publish-ig-bs.ts post \
 *     "civil-1/theme-packs/hoki-labor/pack-01" --schedule 2026-06-10T07:00 --dry-run
 *
 *   # 2) 本番予約投稿
 *   npx tsx .claude/skills/social/publish-ig-bs/publish-ig-bs.ts post \
 *     "civil-1/theme-packs/hoki-labor/pack-01" --schedule 2026-06-10T07:00
 *
 *   # 3) 予約ウィジェットのセレクタを対話的に拾う（Playwright Inspector を schedule 手前で起動）
 *   npx tsx ... post "<pack>" --schedule 2026-06-10T07:00 --pause
 *
 * 引数:
 *   <pack>            content/sns/instagram 配下のパスか、絶対/相対パス。
 *                     carousel/img/*.png + carousel/caption.txt を含むディレクトリ（img/ caption.txt 直下も可）
 *   --schedule <dt>   予約日時 JST（YYYY-MM-DDTHH:MM）。Meta 制約: 約20分後〜75日先
 *   --now             予約せず即時公開（fail-safe が緩むため非推奨。明示時のみ）
 *   --dry-run         予約確定の手前で停止しスクショ（実投稿しない）
 *   --pause           schedule ステップ手前で page.pause()（Inspector でセレクタ採取）
 *   --keep-fb         Facebook 同時投稿を無効化しない（既定は IG 単独投稿を試みる）
 */
import { chromium, type BrowserContext, type Page, type Locator } from "playwright";
import * as path from "path";
import * as fs from "fs";
import { spawnSync } from "child_process";

// ─── 設定 ─────────────────────────────────────────────
const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
const IG_DIR = path.join(PROJECT_ROOT, "content/sns/instagram");
// ログインプロファイルはメインチェックアウト固定で共有する（worktree 実行時の再ログイン防止）。
// .claude/knowledge/reference/playwright-auth-profiles.md
const PROFILE_ROOT = "/Users/minamidaisuke/doboku-note";
const PROFILE_DIR = path.join(PROFILE_ROOT, ".local/playwright-ig-bs-profile");
const DEBUG_DIR = path.join(PROJECT_ROOT, ".local/playwright-ig-bs-debug");

const IG_CAPTION_LIMIT = 2200; // Instagram キャプション上限（文字数）
const CAROUSEL_MIN = 1;
const CAROUSEL_MAX = 10;

// 投稿先アカウント名（2026-06-09 実測。別アカウントは env で上書き）
//   投稿先ドロップダウンの role=option ラベルと一致させること
const FB_PAGE_NAME = process.env.IG_BS_FB_PAGE || "Doboku-note";       // 外す対象（Facebook ページ）
const IG_ACCOUNT_NAME = process.env.IG_BS_IG_ACCOUNT || "dobokunotecom"; // 残す対象（Instagram）

let IS_DRY_RUN = false;
let IS_PAUSE = false;

// ─── screenshot ────────────────────────────────────────
async function shot(page: Page, label: string): Promise<void> {
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filepath = path.join(DEBUG_DIR, `${ts}_${label}.png`);
  try {
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 screenshot: ${path.relative(PROJECT_ROOT, filepath)}`);
  } catch (e) {
    console.error(`screenshot 失敗: ${e}`);
  }
}

// ─── 最初に visible になった候補を返す（UI 揺れ吸収）──────
async function firstVisible(cands: Locator[], timeoutEach = 2500): Promise<Locator | null> {
  for (const c of cands) {
    try {
      const loc = c.first();
      await loc.waitFor({ state: "visible", timeout: timeoutEach });
      return loc;
    } catch {
      /* 次の候補へ */
    }
  }
  return null;
}

// click が pointer intercept される場合に DOM click へフォールバック
async function clickResilient(loc: Locator): Promise<void> {
  try {
    await loc.click({ timeout: 5000 });
  } catch {
    await loc.evaluate((el: HTMLElement) => el.click());
  }
}

// ════════════════════════════════════════════════════════
//  SELECTORS — ⚠️ ログイン後 DOM は未検証。dry-run スクショで要調整。
//  各操作は候補配列。firstVisible が最初に当たったものを使う。
// ════════════════════════════════════════════════════════
const SEL = {
  // 「投稿を作成」エントリ（home 上）
  createPost: (p: Page): Locator[] => [
    p.getByRole("button", { name: /投稿を作成|Create post|投稿する/ }),
    p.getByRole("link", { name: /投稿を作成|Create post/ }),
    p.getByText(/^投稿を作成$/),
  ],
  // 作成メニューで「投稿」を選ぶ（ストーリーズ/リールと並ぶ場合）
  pickPostType: (p: Page): Locator[] => [
    p.getByRole("menuitem", { name: /^投稿$|^Post$/ }),
    p.getByRole("button", { name: /^投稿$|^Post$/ }),
  ],
  // コンポーザに入れたかの判定（2026-06-09 実測）。「投稿の詳細」「キャンセル」はモード非依存
  composerReady: (p: Page): Locator[] => [
    p.getByText("投稿の詳細"),
    p.getByRole("button", { name: "キャンセル" }),
    p.getByRole("button", { name: /写真.*追加/ }),
  ],
  // メディア追加ボタン（実測: FB+IG時「写真を追加」/ IG単独時「写真・動画を追加」）
  addMedia: (p: Page): Locator[] => [
    p.getByRole("button", { name: /写真.*追加|メディア.*追加|動画を追加/ }),
    p.getByText(/写真・動画を追加|写真を追加/),
  ],
  // メディア追加クリック後にメニューが出た場合のアップロード項目
  uploadMenuItem: (p: Page): Locator[] => [
    p.getByRole("menuitem", { name: /アップロード|コンピュータ|ファイル/ }),
    p.getByText(/コンピュータからアップロード|ファイルをアップロード|写真をアップロード|端末からアップロード/),
  ],
  // 隠し file input（最も安定。複数枚 setInputFiles）
  fileInput: (p: Page): Locator => p.locator('input[type="file"]').first(),
  // キャプション入力欄（実測: 「テキスト」欄の contenteditable）
  caption: (p: Page): Locator[] => [
    p.locator('div[contenteditable="true"][role="textbox"]'),
    p.locator('[contenteditable="true"]'),
    p.locator('textarea[aria-label*="テキスト"], textarea[aria-label*="キャプション"], textarea[placeholder*="テキスト"]'),
    p.getByRole("textbox", { name: /テキスト|キャプション|説明|caption/i }),
  ],
  // 投稿先ドロップダウンを開くフィールド（FB ページ名を表示している）
  placementField: (p: Page): Locator[] => [
    p.getByText(new RegExp(FB_PAGE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).first(),
  ],
  // ドロップダウン内のアカウント option（2026-06-09 実測: role=option, aria-checked）
  placementOption: (p: Page, name: string): Locator => p.getByRole("option", { name }),
  // 予約 ON/OFF トグル（実測: role=switch aria-label="日時を設定"）
  scheduleToggle: (p: Page): Locator[] => [
    p.getByRole("switch", { name: "日時を設定" }),
    p.getByLabel("日時を設定"),
  ],
  // 日付 / 時 / 分（実測: 投稿先ごとに 1 セット。IG 単独化で 1 セット）
  dateInputs: (p: Page): Locator => p.locator('input[placeholder="yyyy/mm/dd"]'),
  hourInputs: (p: Page): Locator => p.locator('input[aria-label="時間"]'),
  minuteInputs: (p: Page): Locator => p.locator('input[aria-label="分"]'),
  // 予約確定ボタン（実測: 予約 ON で「公開する」→「日時を指定」に変化）
  scheduleConfirm: (p: Page): Locator => p.getByRole("button", { name: "日時を指定" }),
  // 即時公開ボタン
  publishNow: (p: Page): Locator => p.getByRole("button", { name: "公開する" }),

  // ── リール（2026-06-09 実測）──
  reelEntry: (p: Page): Locator => p.getByRole("button", { name: "リール動画を作成" }),
  reelComposerReady: (p: Page): Locator[] => [
    p.getByRole("button", { name: "動画を追加" }),
    p.getByText("リール動画を作成"),
  ],
  reelAddVideo: (p: Page): Locator => p.getByRole("button", { name: "動画を追加" }),
  reelNext: (p: Page): Locator => p.getByRole("button", { name: /次へ/ }), // 右下を位置で選別
  reelScheduleOption: (p: Page): Locator => p.getByRole("button", { name: "日時を指定" }),
  reelScheduleConfirm: (p: Page): Locator => p.getByRole("button", { name: "公開日時を指定" }),
  reelPublishNow: (p: Page): Locator => p.getByRole("button", { name: "今すぐシェア" }),
  // サムネイル（＝カバー）。Business Suite リール作成の「サムネイル」セクション。
  // 候補配列で組み、初回 --dry-run のスクショで確定する。
  reelThumbSection: (p: Page): Locator => p.getByText(/サムネイル/).first(),
  reelCoverUpload: (p: Page): Locator[] => [
    p.getByRole("button", { name: /画像をアップロード|ファイルからアップロード/ }),
    p.getByText(/画像をアップロード|ファイルからアップロード/),
  ],
  reelCoverDone: (p: Page): Locator[] => [
    p.getByRole("button", { name: /^完了$|^適用$|^保存$|^確定$|^トリミング$|^選択$/ }),
  ],
};

// 予約モードかどうか（実測: 予約 ON で最終ボタンが「公開する」→「日時を指定」になる）
async function isScheduledMode(page: Page): Promise<boolean> {
  try {
    return await SEL.scheduleConfirm(page).first().isVisible();
  } catch {
    return false;
  }
}

// ─── パック解決 ────────────────────────────────────────
interface Pack {
  dir: string;        // パックのルート
  kind: "carousel" | "reel";
  images: string[];   // carousel: ソート済み画像フルパス / reel: []
  video: string | null; // reel: video.mp4 のパス
  cover: string | null; // reel: カバー画像（00-cover.png / cover.png）。null ならカバー未指定（Meta 自動）
  caption: string;
  slug: string;       // status / ログ用
}

function resolvePackDir(arg: string): string {
  const cands = [arg, path.join(IG_DIR, arg), path.join(PROJECT_ROOT, arg)];
  for (const c of cands) {
    if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return path.resolve(c);
  }
  throw new Error(`パックが見つかりません: ${arg}\n  試した場所: ${cands.join(", ")}`);
}

function findFirstExisting(paths: string[]): string | null {
  for (const p of paths) if (fs.existsSync(p)) return p;
  return null;
}

function readCaption(captionPath: string): string {
  const caption = fs.readFileSync(captionPath, "utf-8").trim();
  if ([...caption].length > IG_CAPTION_LIMIT) {
    throw new Error(`caption が ${IG_CAPTION_LIMIT} 文字を超過: ${[...caption].length} 文字（Instagram 上限）`);
  }
  return caption;
}

/**
 * パックのレンダー画像は DN-0111 Phase 4-E で R2 へ退避し Git 追跡から外した。
 * 実体はローカルに残るが、新規 clone や別 PC には無い。**Instagram へ触る前に**
 * 取り寄せる。取れなければ何も投稿せずに止める（fail-closed）。
 *
 * asset-hydrate は「ローカルに在るものは何もしない」ので、通常運用では無害な no-op。
 */
function hydratePackAssets(dir: string): void {
  const rel = path.relative(PROJECT_ROOT, dir).replace(/\\/g, "/");
  if (!rel || rel.startsWith("..")) return;
  const hasImages = fs.existsSync(path.join(dir, "img"))
    && fs.readdirSync(path.join(dir, "img")).some((f) => /\.(png|jpe?g)$/i.test(f));
  if (hasImages) return;
  const manifestPath = path.join(PROJECT_ROOT, ".claude/state/assets/manifest.json");
  if (!fs.existsSync(manifestPath)) return;
  const entries = JSON.parse(fs.readFileSync(manifestPath, "utf-8")).entries || {};
  const needed = Object.keys(entries).filter((k) => k.startsWith(rel + "/"));
  if (needed.length === 0) return;
  console.log(`[prep] 画像がローカルに無いので R2 から取り寄せます: ${rel}（${needed.length} 件）`);
  const r = spawnSync(process.execPath, ["scripts/asset-hydrate.mjs", "--path", rel + "/"],
    { cwd: PROJECT_ROOT, stdio: "inherit" });
  if (r.status !== 0) {
    throw new Error(`アセットの取り寄せに失敗しました。Instagram には何も投稿せずに止めます: ${rel}`);
  }
}

function loadPack(arg: string, kind: "carousel" | "reel" = "carousel"): Pack {
  const dir = resolvePackDir(arg);
  hydratePackAssets(dir);
  const slug = path.relative(IG_DIR, dir).replace(/[\\/]/g, "-") || path.basename(dir);

  if (kind === "reel") {
    // 動画: <dir>/reels/video.mp4 → <dir>/video.mp4
    const video = findFirstExisting([
      path.join(dir, "reels", "video.mp4"),
      path.join(dir, "video.mp4"),
    ]);
    if (!video) {
      throw new Error(`reels/video.mp4 が見つかりません: ${dir}\n  （ig-reel-create で mp4 を先に生成）`);
    }
    const captionPath = findFirstExisting([
      path.join(dir, "reels", "caption.txt"),
      path.join(dir, "caption.txt"),
    ]);
    if (!captionPath) throw new Error(`reels/caption.txt が見つかりません: ${dir}`);
    // カバー画像（任意）: 編集ステップで明示アップロードしてサムネを確定する。
    // reels-pp(JIT)=<dir>/cover.png / 旧 reels 構造=<dir>/reels/img/00-cover.png
    const cover = findFirstExisting([
      path.join(dir, "cover.png"),
      path.join(dir, "reels", "img", "00-cover.png"),
      path.join(dir, "img", "00-cover.png"),
      path.join(dir, "reels", "cover.png"),
    ]);
    return { dir, kind, images: [], video, cover, caption: readCaption(captionPath), slug };
  }

  // ── carousel ──
  const imgDir =
    findFirstExisting([
      path.join(dir, "carousel", "img"),
      path.join(dir, "img"),
    ]) || dir;
  const images = fs
    .readdirSync(imgDir)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .sort()
    .map((f) => path.join(imgDir, f));
  if (images.length < CAROUSEL_MIN || images.length > CAROUSEL_MAX) {
    throw new Error(
      `カルーセル画像は ${CAROUSEL_MIN}-${CAROUSEL_MAX} 枚。検出 ${images.length} 枚（${imgDir}）`
    );
  }
  const captionPath = findFirstExisting([
    path.join(dir, "carousel", "caption.txt"),
    path.join(dir, "caption.txt"),
  ]);
  if (!captionPath) {
    throw new Error(`caption.txt が見つかりません（carousel/caption.txt か caption.txt）: ${dir}`);
  }
  return { dir, kind: "carousel", images, video: null, cover: null, caption: readCaption(captionPath), slug };
}

// ─── status.json 更新 ─────────────────────────────────
function updateStatus(pack: Pack, scheduledDate: Date | null): void {
  const statusPath = path.join(pack.dir, "status.json");
  const cur = fs.existsSync(statusPath)
    ? JSON.parse(fs.readFileSync(statusPath, "utf-8"))
    : {};
  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace("Z", "+09:00");
  const scheduledJst = scheduledDate
    ? new Date(scheduledDate.getTime() + 9 * 60 * 60 * 1000).toISOString().replace("Z", "+09:00")
    : null;
  cur[pack.kind] = {
    ...(cur[pack.kind] || {}),
    channel: "business-suite",
    status: scheduledDate ? "scheduled" : "posted",
    scheduled_at: scheduledJst,
    posted_at: scheduledDate ? null : nowJst,
    ...(pack.kind === "reel"
      ? { video: pack.video ? path.basename(pack.video) : null }
      : { image_count: pack.images.length }),
    updated_at: nowJst,
  };
  fs.writeFileSync(statusPath, JSON.stringify(cur, null, 2) + "\n", "utf-8");
  console.log(`📝 status.json 更新: ${pack.kind} → ${scheduledDate ? "scheduled" : "posted"}`);
}

// ─── ログイン確認 ──────────────────────────────────────
async function ensureLogin(page: Page): Promise<void> {
  console.log("Business Suite にアクセスしています...");
  await page.goto("https://business.facebook.com/latest/home", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  const url = page.url();
  if (/login|checkpoint|two_factor|\/login\//.test(url) || url.includes("facebook.com/login")) {
    console.log("\n⚠️  ログインが必要です。ブラウザでログイン（2FA 含む）してください。");
    console.log("   business.facebook.com/latest に入ると自動的に続行します...\n");
    await page.waitForURL("**/latest/**", { timeout: 300_000 });
    console.log("✅ ログイン完了！");
    await page.waitForTimeout(2000);
  } else {
    console.log("✅ ログイン済み");
  }
}

// ─── コンポーザを開く ──────────────────────────────────
async function openComposer(page: Page): Promise<boolean> {
  // まず直 URL を試す
  await page.goto("https://business.facebook.com/latest/composer", { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(3500);

  let ready = await firstVisible(SEL.composerReady(page), 3000);
  if (ready) {
    console.log("✅ コンポーザ表示（直 URL）");
    return true;
  }

  // home → 「投稿を作成」クリック
  console.log("直 URL で開けず。home から『投稿を作成』を試行...");
  await page.goto("https://business.facebook.com/latest/home", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);

  const createBtn = await firstVisible(SEL.createPost(page), 6000);
  if (!createBtn) {
    console.error("🚨 『投稿を作成』ボタンが見つかりません。UI 変更の可能性。");
    await shot(page, "composer-create-button-missing");
    return false;
  }
  await clickResilient(createBtn);
  await page.waitForTimeout(2500);

  // 作成メニューが出たら「投稿」を選ぶ
  const postType = await firstVisible(SEL.pickPostType(page), 2500);
  if (postType) {
    await clickResilient(postType);
    await page.waitForTimeout(2500);
  }

  ready = await firstVisible(SEL.composerReady(page), 6000);
  if (!ready) {
    console.error("🚨 コンポーザが開けませんでした。");
    await shot(page, "composer-not-ready");
    return false;
  }
  console.log("✅ コンポーザ表示（home 経由）");
  return true;
}

// ─── 配信先を Instagram 単独に寄せる（投稿先ドロップダウンで FB ページを外す）──
// 実測（2026-06-09）: 投稿先は role=option × 2（FB ページ / IG アカウント、いずれも aria-checked=true）。
// FB ページ option を外すと IG 単独になり、予約セクションも IG 1 行のみになる。
async function setPlacementInstagramOnly(page: Page, keepFb: boolean): Promise<void> {
  if (keepFb) {
    console.log("ℹ️  --keep-fb: 投稿先は FB+IG のまま（予約は両行に同一日時を入れます）");
    return;
  }
  const igOpt = SEL.placementOption(page, IG_ACCOUNT_NAME).first();
  const fbOpt = SEL.placementOption(page, FB_PAGE_NAME).first();

  // option の選択状態（実測: aria-selected で持つ。aria-checked は null のことがある）
  const optSelected = async (loc: Locator): Promise<boolean> => {
    const sel = await loc.getAttribute("aria-selected").catch(() => null);
    const chk = await loc.getAttribute("aria-checked").catch(() => null);
    return sel === "true" || chk === "true";
  };
  // 開いた確証 = FB option が実体（boundingBox 幅>0）を持つ
  const isOpen = async (): Promise<boolean> => {
    const box = await fbOpt.boundingBox().catch(() => null);
    return !!(box && box.width > 0 && box.height > 0);
  };

  // ドロップダウンを開く（proven: 投稿先フィールドのテキストをクリック。最大2回）
  const field = (await firstVisible(SEL.placementField(page), 3000)) || page.getByText(new RegExp(FB_PAGE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).first();
  let opened = false;
  for (let attempt = 0; attempt < 2 && !opened; attempt++) {
    await clickResilient(field);
    await page.waitForTimeout(1500);
    opened = await isOpen();
  }
  if (!opened) {
    console.log("⚠️  投稿先ドロップダウンを開けず（IG 単独化スキップ→両行に同一日時で予約）");
    await shot(page, "placement-open-failed");
    return;
  }
  await shot(page, "placement-open");

  // FB ページ option を外す（選択中のときだけクリック）。クリック後に未選択を検証
  if (await optSelected(fbOpt)) {
    await clickResilient(fbOpt);
    await page.waitForTimeout(700);
    if (!(await optSelected(fbOpt))) {
      console.log(`📌 投稿先から Facebook「${FB_PAGE_NAME}」を外しました（IG 単独）`);
    } else {
      console.log(`⚠️  Facebook「${FB_PAGE_NAME}」の解除を確認できず（再 dry-run / 名前確認）`);
    }
  } else {
    console.log(`ℹ️  Facebook「${FB_PAGE_NAME}」は既に未選択`);
  }

  // IG が選択されていることを保証
  if (!(await optSelected(igOpt))) {
    await clickResilient(igOpt);
    console.log(`📌 Instagram「${IG_ACCOUNT_NAME}」を選択`);
  }

  // ドロップダウンを閉じる
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(800);
}

// ─── 画像アップロード ──────────────────────────────────
async function uploadImages(page: Page, images: string[]): Promise<boolean> {
  console.log(`📷 ${images.length} 枚アップロード...`);

  // 1) 隠し input[type=file] に直接 setInputFiles（最も安定。「写真を追加」のメニュー差異を回避）
  const input = SEL.fileInput(page);
  if ((await input.count()) > 0) {
    await input.setInputFiles(images);
    console.log("📷 hidden input に直接投入");
  } else {
    // 2) 「写真を追加」→ filechooser。メニューが出たらアップロード項目経由
    const addBtn = await firstVisible(SEL.addMedia(page), 4000);
    if (!addBtn) {
      console.error("🚨 メディア追加 UI が見つかりません");
      await shot(page, "upload-ui-missing");
      return false;
    }
    try {
      const [chooser] = await Promise.all([
        page.waitForEvent("filechooser", { timeout: 6000 }),
        clickResilient(addBtn),
      ]);
      await chooser.setFiles(images);
      console.log("📷 filechooser で投入");
    } catch {
      // メニューが開いたパターン: アップロード項目をクリックして filechooser
      const up = await firstVisible(SEL.uploadMenuItem(page), 3000);
      if (up) {
        const [chooser2] = await Promise.all([
          page.waitForEvent("filechooser", { timeout: 6000 }),
          clickResilient(up),
        ]);
        await chooser2.setFiles(images);
        console.log("📷 メニュー→filechooser で投入");
      } else {
        const input2 = SEL.fileInput(page);
        if ((await input2.count()) > 0) {
          await input2.setInputFiles(images);
          console.log("📷 再探索した hidden input に投入");
        } else {
          console.error("🚨 filechooser もメニューも file input も検出できず");
          await shot(page, "upload-no-input");
          return false;
        }
      }
    }
  }

  // プレビュー生成待ち（枚数ぶんのサムネが出るまで猶予）
  await page.waitForTimeout(Math.min(4000 + images.length * 800, 12000));
  await shot(page, "after-upload");
  return true;
}

// ─── キャプション入力（clipboard 経由 + read-back 検証）─────
async function fillCaption(page: Page, caption: string): Promise<boolean> {
  let box = await firstVisible(SEL.caption(page), 6000);
  if (!box) {
    // 2026-09-04 の Meta UI は、10枚カルーセルのメディア一覧が左ペインを占有し、
    // 下方のキャプション欄を遅延描画する。スクロール可能な左ペインを末尾へ送って再探索する。
    const scrolled = await page.evaluate(() => {
      const candidates = [...document.querySelectorAll<HTMLElement>('div')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.left < 760 && r.width > 250 && r.height > 250 && el.scrollHeight > el.clientHeight + 80;
        })
        .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
      for (const el of candidates.slice(0, 3)) el.scrollTop = el.scrollHeight;
      return candidates.length;
    }).catch(() => 0);
    console.log(`[caption] 左ペイン末尾へスクロール（候補 ${scrolled}）`);
    await page.waitForTimeout(1500);
    box = await firstVisible(SEL.caption(page), 5000);
    if (!box) {
      // 現行UIでは空のテキスト欄が role/contenteditable を持たず、クリック後にだけ
      // 編集要素へフォーカスが移る場合がある。ラベル直下の入力面をクリックして :focus を採る。
      const rect = await page.evaluate(() => {
        const labels = [...document.querySelectorAll<HTMLElement>('*')]
          .filter((el) => el.childElementCount === 0 && el.textContent?.trim() === 'テキスト')
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height > 0 && r.left < 760 && r.top >= 0 && r.bottom <= innerHeight);
        const r = labels[0];
        return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
      }).catch(() => null);
      if (rect) {
        await page.mouse.click(rect.x + Math.min(180, Math.max(40, rect.width / 2)), rect.y + rect.height + 45);
        await page.waitForTimeout(500);
        const focused = page.locator(':focus').first();
        if ((await focused.count()) > 0 && await focused.isVisible().catch(() => false)) {
          box = focused;
          const attrs = await focused.evaluate((el) => ({
            tag: el.tagName,
            role: el.getAttribute('role'),
            aria: el.getAttribute('aria-label'),
            contenteditable: el.getAttribute('contenteditable'),
          })).catch(() => null);
          console.log(`[caption] ラベル直下クリックで入力面を捕捉 ${JSON.stringify(attrs)}`);
        }
      }
    }
  }
  if (!box) {
    console.error("🚨 キャプション入力欄が見つかりません");
    await shot(page, "caption-box-missing");
    return false;
  }
  await box.click();
  await page.waitForTimeout(400);

  await page.evaluate(async (text: string) => {
    const item = new ClipboardItem({ "text/plain": new Blob([text], { type: "text/plain" }) });
    await navigator.clipboard.write([item]);
  }, caption).catch(() => {});
  await page.keyboard.press("ControlOrMeta+v");
  await page.waitForTimeout(1200);

  const readBack = async (): Promise<number> =>
    (await box.innerText().catch(() => "")).replace(/\s+/g, "").length ||
    ((await box.inputValue().catch(() => "")) || "").replace(/\s+/g, "").length;

  if ((await readBack()) === 0) {
    console.log("⚠️  paste 不発。keyboard.insertText で再入力");
    await box.click();
    await page.keyboard.insertText(caption);
    await page.waitForTimeout(1000);
  }
  const len = await readBack();
  if (len === 0) {
    console.error("🚨 キャプション入力失敗（空）— 中止");
    await shot(page, "caption-empty");
    return false;
  }
  console.log(`⌨️  キャプション入力 OK（read-back ${len} 文字）`);
  return true;
}

// ─── 日付・時刻欄の入力（カルーセル/リール 共通。2026-06-09 実測ウィジェット）──
//   日付: input[placeholder="yyyy/mm/dd"]（複数あれば全て＝FB/IG 両行）
//   時/分: role="spinbutton"。値は .value ではなく aria-valuenow（ゼロ埋め無し "8"）。
//          keyboard.type で設定し aria-valuenow を parseInt 比較で検証＋リトライ（分が既定値のまま残る事故対策）。
async function fillDateTimeFields(page: Page, when: Date): Promise<boolean> {
  const yyyy = when.getFullYear();
  const mm = String(when.getMonth() + 1).padStart(2, "0");
  const dd = String(when.getDate()).padStart(2, "0");
  const HH = String(when.getHours()).padStart(2, "0");
  const MM = String(when.getMinutes()).padStart(2, "0");
  const dateStr = `${yyyy}/${mm}/${dd}`;

  const dateInputs = SEL.dateInputs(page);
  const dCount = await dateInputs.count();
  if (dCount === 0) {
    console.error("🚨 日付入力欄が出現しません");
    await shot(page, "schedule-date-missing");
    return false;
  }
  for (let i = 0; i < dCount; i++) {
    const di = dateInputs.nth(i);
    await di.click().catch(() => {});
    await di.fill(dateStr).catch(async () => {
      await di.press("ControlOrMeta+a").catch(() => {});
      await page.keyboard.type(dateStr);
    });
    await page.keyboard.press("Escape").catch(() => {}); // カレンダーポップを閉じる
    await page.waitForTimeout(300);
  }

  const fillVerified = async (el: Locator, value: string, label: string): Promise<boolean> => {
    const target = parseInt(value, 10);
    for (let attempt = 0; attempt < 3; attempt++) {
      await el.click().catch(() => {});
      await el.press("ControlOrMeta+a").catch(() => {});
      await page.keyboard.type(value, { delay: 80 });
      await page.waitForTimeout(350);
      const now = await el.getAttribute("aria-valuenow").catch(() => null);
      if (now != null && parseInt(now, 10) === target) return true;
    }
    const now = await el.getAttribute("aria-valuenow").catch(() => null);
    console.log(`⚠️  ${label} 入力検証 NG（期待 ${target} / 実 aria-valuenow=${now}）— UI 変更の可能性`);
    return false;
  };
  const fillAll = async (loc: Locator, value: string, label: string): Promise<boolean> => {
    const n = await loc.count();
    if (n === 0) {
      console.log(`⚠️  ${label} 欄が見つかりません`);
      return false;
    }
    let ok = true;
    for (let i = 0; i < n; i++) ok = (await fillVerified(loc.nth(i), value, `${label}#${i}`)) && ok;
    return ok;
  };
  const hourOk = await fillAll(SEL.hourInputs(page), HH, "時間");
  const minOk = await fillAll(SEL.minuteInputs(page), MM, "分");
  if (!hourOk || !minOk) {
    console.error("🚨 時刻入力を検証できませんでした — 中止（誤時刻での予約を防止）");
    await shot(page, "schedule-time-verify-failed");
    return false;
  }

  await page.waitForTimeout(500);
  await shot(page, "schedule-filled");
  console.log(`🗓  予約日時セット: ${dateStr} ${HH}:${MM}（日付欄 ${dCount} 個）`);
  return true;
}

// ─── カルーセル予約: 「日時を設定」スイッチ ON → 日付/時刻 ──
async function setSchedule(page: Page, when: Date): Promise<boolean> {
  const toggle = await firstVisible(SEL.scheduleToggle(page), 5000);
  if (!toggle) {
    console.error("🚨 予約スイッチ「日時を設定」が見つかりません");
    await shot(page, "schedule-toggle-missing");
    return false;
  }
  const checked = await toggle.getAttribute("aria-checked").catch(() => null);
  if (checked !== "true") {
    await clickResilient(toggle);
    await page.waitForTimeout(1500);
  }
  await shot(page, "schedule-toggle-on");
  return await fillDateTimeFields(page, when);
}

// ─── 投稿実行 ──────────────────────────────────────────
async function publish(page: Page, pack: Pack, when: Date | null, keepFb: boolean): Promise<boolean> {
  console.log(`\n━━━ ${pack.slug}（${pack.images.length} 枚）━━━`);
  console.log(`キャプション先頭: ${pack.caption.slice(0, 60).replace(/\n/g, " ")}...`);
  if (when) {
    console.log(`予約日時: ${when.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`);
  } else {
    console.log("即時公開モード（--now）");
  }

  if (!(await openComposer(page))) return false;
  await setPlacementInstagramOnly(page, keepFb);

  if (!(await uploadImages(page, pack.images))) return false;
  if (!(await fillCaption(page, pack.caption))) return false;

  if (IS_PAUSE) {
    console.log("\n⏸  --pause: Playwright Inspector を起動します。");
    console.log("   予約ウィジェットのセレクタを『Pick locator』で採取し、SELECTORS を更新してください。\n");
    await page.pause();
  }

  // ── 予約モード ──
  if (when) {
    if (!(await setSchedule(page, when))) return false;

    // fail-safe: 最終ボタンが「スケジュール/予約」を示すまで確認（即時公開の誤爆を防ぐ）
    let confirmed = false;
    const start = Date.now();
    while (Date.now() - start < 8000) {
      if (await isScheduledMode(page)) {
        confirmed = true;
        break;
      }
      await page.waitForTimeout(500);
    }
    if (!confirmed) {
      console.error("🚨 予約モード未確認 — 投稿中止（即時公開を回避）");
      console.error("   schedule-filled.png を確認し SELECTORS / setSchedule を更新してください。");
      await shot(page, "schedule-mode-not-confirmed");
      return false;
    }
    console.log("📅 予約モード確認 OK");

    if (IS_DRY_RUN) {
      console.log("🧪 dry-run: 予約確定の手前で停止。スクショを保存して終了。");
      await shot(page, "dry-run-scheduled-ready");
      return true;
    }

    const btn = await firstVisible([SEL.scheduleConfirm(page)], 5000);
    if (!btn) {
      console.error("🚨 予約確定ボタン「日時を指定」が見つかりません");
      await shot(page, "schedule-confirm-missing");
      return false;
    }
    await clickResilient(btn);

    // 成功検証（実測 2026-06-09）: 確定後は予約後モーダルが出る。Meta は文言を複数出し分ける:
    //   ・「投稿の日時が指定されました」＋宣伝アップセル（後で / 宣伝）
    //   ・「今から投稿を日時指定で時間を節約できます」（後で / 別の投稿を日時指定）
    //   いずれも共通で「後で」ボタンを持つ。タイトル文言 or 「後で」ボタン or トースト or 閉鎖で成功判定。
    const successModal = async (): Promise<boolean> => {
      const byTitle = await page
        .getByText(/日時が指定されました|時間を節約|別の投稿を日時指定|予約しました|スケジュール(し|され)|投稿を予約|Scheduled/i)
        .first().isVisible().catch(() => false);
      if (byTitle) return true;
      // 予約後ダイアログ共通の「後で」ボタン
      return await page.getByRole("button", { name: "後で" }).first().isVisible().catch(() => false);
    };

    let done = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(500);
      if (await successModal()) { done = true; console.log("📅 予約成功モーダルを検出"); break; }
      if (!(await firstVisible(SEL.composerReady(page), 300))) { done = true; break; }
    }
    if (!done) {
      console.error("🚨 予約確定の成功を確認できません（モーダル/トースト/閉鎖いずれも未検出）");
      await shot(page, "schedule-not-saved");
      return false;
    }
    // アップセルモーダルが出ていれば「後で」で閉じる
    const later = await firstVisible([
      page.getByRole("button", { name: "後で" }),
      page.getByRole("button", { name: /閉じる|Close/ }),
    ], 2000);
    if (later) {
      await clickResilient(later);
      await page.waitForTimeout(800);
    }

    console.log("✅ 予約投稿 完了（要・実体確認: プランナーで予約キューを目視）");
    await shot(page, "scheduled-done");
    return true;
  }

  // ── 即時公開モード（--now）──
  if (IS_DRY_RUN) {
    console.log("🧪 dry-run: 即時公開の手前で停止。");
    await shot(page, "dry-run-immediate-ready");
    return true;
  }
  const pubBtn = await firstVisible([SEL.publishNow(page)], 5000);
  if (!pubBtn) {
    console.error("🚨 公開ボタン「公開する」が見つかりません");
    await shot(page, "publish-missing");
    return false;
  }
  await clickResilient(pubBtn);
  let done = false;
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(500);
    const stillComposer = await firstVisible(SEL.composerReady(page), 300);
    if (!stillComposer) {
      done = true;
      break;
    }
  }
  if (!done) {
    console.error("🚨 公開の成功を確認できません");
    await shot(page, "publish-not-confirmed");
    return false;
  }
  console.log("✅ 即時公開 完了");
  return true;
}

// ════════════════════════════════════════════════════════
//  リール（2026-06-09 実測フロー）
//   ホーム→「リール動画を作成」→ reels_composer（3ステップ: 作成→編集→シェアする）
//   作成: 投稿先 IG単独化 / 動画アップ＋処理待ち / キャプション
//   シェアする: 「日時を指定」→日付/時刻（共通）→「公開日時を指定」で確定
// ════════════════════════════════════════════════════════
async function openReelComposer(page: Page): Promise<boolean> {
  await page.goto("https://business.facebook.com/latest/home", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const entry = await firstVisible([SEL.reelEntry(page)], 6000);
  if (!entry) {
    console.error("🚨 「リール動画を作成」ボタンが見つかりません");
    await shot(page, "reel-entry-missing");
    return false;
  }
  await clickResilient(entry);
  await page.waitForTimeout(4500);
  const ready = await firstVisible(SEL.reelComposerReady(page), 8000);
  if (!ready) {
    console.error("🚨 リールコンポーザが開けませんでした");
    await shot(page, "reel-composer-not-ready");
    return false;
  }
  console.log("✅ リールコンポーザ表示");
  return true;
}

async function uploadVideo(page: Page, videoPath: string): Promise<boolean> {
  console.log(`🎬 動画アップロード: ${path.basename(videoPath)}`);
  const addBtn = await firstVisible([SEL.reelAddVideo(page)], 5000);
  if (addBtn) {
    try {
      const [chooser] = await Promise.all([
        page.waitForEvent("filechooser", { timeout: 8000 }),
        clickResilient(addBtn),
      ]);
      await chooser.setFiles(videoPath);
    } catch {
      const input = page.locator('input[type="file"]').first();
      if ((await input.count()) === 0) {
        console.error("🚨 動画の filechooser も input も検出できず");
        await shot(page, "reel-upload-failed");
        return false;
      }
      await input.setInputFiles(videoPath);
    }
  } else {
    const input = page.locator('input[type="file"]').first();
    if ((await input.count()) === 0) {
      console.error("🚨 動画追加 UI が見つかりません");
      await shot(page, "reel-upload-ui-missing");
      return false;
    }
    await input.setInputFiles(videoPath);
  }

  // 処理完了待ち（自動生成サムネ or 「公開できます」表示が出るまで最大 ~44s）
  console.log("⏳ 動画処理待ち...");
  let processed = false;
  for (let i = 0; i < 22; i++) {
    await page.waitForTimeout(2000);
    const thumb = await page.getByRole("button", { name: /自動生成サムネイル/ }).first().isVisible().catch(() => false);
    const ok = await page.getByText(/公開できます|安全に公開/).first().isVisible().catch(() => false);
    if (thumb || ok) { processed = true; break; }
  }
  if (!processed) console.log("⚠️  処理完了シグナル未検出（続行）");
  await page.waitForTimeout(1500);
  await shot(page, "reel-after-upload");
  return true;
}

// リールウィザードの現在ステップ（作成/編集/シェアする）
async function currentReelStep(page: Page): Promise<string> {
  return await page.evaluate(() => {
    let s = "";
    document.querySelectorAll("[aria-current]").forEach((el) => {
      const t = (el.textContent || "").trim();
      if (t === "作成" || t === "編集" || t === "シェアする") s = t;
    });
    return s;
  });
}

// 右下（最大 x+y）の visible な「次へ」を座標 click（サムネ送りの「次へ」を誤爆しない）
async function clickBottomRightNext(page: Page): Promise<boolean> {
  const nexts = SEL.reelNext(page);
  const n = await nexts.count();
  let best: { cx: number; cy: number } | null = null;
  let bestScore = -1;
  for (let i = 0; i < n; i++) {
    const b = nexts.nth(i);
    if (!(await b.isVisible().catch(() => false))) continue;
    const bb = await b.boundingBox().catch(() => null);
    if (!bb) continue;
    const score = bb.x + bb.y;
    if (score > bestScore) { bestScore = score; best = { cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2 }; }
  }
  if (!best) return false;
  await page.mouse.click(best.cx, best.cy);
  return true;
}

// 作成→編集→シェアする へ進める
async function advanceToShareStep(page: Page): Promise<boolean> {
  for (let i = 0; i < 4; i++) {
    if ((await currentReelStep(page)) === "シェアする") return true;
    if (!(await clickBottomRightNext(page))) {
      console.error("🚨 「次へ」ボタンが見つかりません");
      await shot(page, "reel-next-missing");
      return false;
    }
    await page.waitForTimeout(4000);
  }
  const step = await currentReelStep(page);
  if (step === "シェアする") return true;
  console.error(`🚨 シェアするステップに到達できず（現在: ${step || "不明"}）`);
  await shot(page, "reel-share-step-not-reached");
  return false;
}

// 「編集」ステップへ遷移する（カバー設定用）。
// このウィザードでは「次へ」送りだと編集が自動完了して飛ばされる（作成→シェアするに直行）。
// そのためステッパーの「編集」タブを直接クリックして編集ステップに入る。
async function advanceToEditStep(page: Page): Promise<boolean> {
  const editTab = page.getByText("編集", { exact: true }).first();
  if (!(await editTab.isVisible().catch(() => false))) {
    // ステッパー未表示なら「次へ」を1回送って出す
    await clickBottomRightNext(page);
    await page.waitForTimeout(3000);
  }
  if (!(await editTab.isVisible().catch(() => false))) return false;
  await editTab.click().catch(() => {});
  await page.waitForTimeout(3000);
  await shot(page, "reel-edit-step");
  return true;
}

// 編集ステップでカバー画像をファイルからアップロードしてサムネを確定する。
// セレクタは候補配列＋fail-soft: 見つからなければ警告のみで投稿フローは止めない
// （初回 --dry-run のスクショ reel-cover-* を見てセレクタを確定する規約）。
async function setReelCover(page: Page, coverPath: string | null): Promise<boolean> {
  if (!coverPath) { console.log("ℹ️  カバー画像が無いためカバー設定をスキップ（Meta 自動サムネ）"); return false; }
  if (!fs.existsSync(coverPath)) { console.log(`⚠️  カバー画像が見つかりません（スキップ）: ${coverPath}`); return false; }
  console.log(`🖼  カバー設定: ${path.basename(coverPath)}`);

  // 「サムネイル」セクションへスクロールして可視化（フォーム下部にあり初期は折り返し外）
  const thumb = SEL.reelThumbSection(page);
  if (!(await thumb.isVisible().catch(() => false))) {
    console.log("⚠️  「サムネイル」セクション未検出 — カバー設定をスキップ（reel-cover-edit-missing 参照）");
    await shot(page, "reel-cover-edit-missing");
    return false;
  }
  await thumb.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);
  // サムネイルピッカー本体は見出しの下にあるため、左フォーム上にマウスを置いて更に下スクロール
  await page.mouse.move(220, 300);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(1000);
  await shot(page, "reel-cover-editor-opened");

  // 「画像をアップロード」は2段階: ①タブを押すとアップロードパネルが開く ②パネル内の
  // アップロードリンク/ドロップゾーンを押すとネイティブ filechooser が開く。
  const tab = await firstVisible(SEL.reelCoverUpload(page), 4000);
  if (!tab) {
    console.log("⚠️  「画像をアップロード」タブ未検出 — カバー設定をスキップ（reel-cover-input-missing 参照）");
    await shot(page, "reel-cover-input-missing");
    return false;
  }
  await clickResilient(tab);
  await page.waitForTimeout(1500);
  await shot(page, "reel-cover-upload-panel");

  // パネル内のアップロード起動（タブと同名のため最後の一致＝パネル側を使う）
  const trigger = page.getByText(/画像をアップロード/).last();
  try {
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 8000 }),
      trigger.click(),
    ]);
    await chooser.setFiles(coverPath);
  } catch {
    // フォールバック: 露出した input[type=file] があれば直接投入
    const input = page.locator('input[type="file"]').last();
    if ((await input.count()) === 0) {
      console.log("⚠️  カバー用 filechooser/input 未検出 — スキップ（reel-cover-input-missing 参照）");
      await shot(page, "reel-cover-input-missing");
      return false;
    }
    await input.setInputFiles(coverPath);
  }
  await page.waitForTimeout(2500);
  await shot(page, "reel-cover-uploaded");

  // アップロード後にトリミング/適用モーダルが出る場合は確定する
  const doneBtn = await firstVisible(SEL.reelCoverDone(page), 4000);
  if (doneBtn) { await clickResilient(doneBtn); await page.waitForTimeout(1500); }
  console.log("✅ カバー設定 完了（要・実体確認: 公開後の投稿サムネを目視）");
  await shot(page, "reel-cover-done");
  return true;
}

// 予約後の成功モーダルを検知して「後で」で閉じる（カルーセルと共通の出し分けに対応）
async function awaitSuccessAndDismiss(page: Page): Promise<boolean> {
  const successModal = async (): Promise<boolean> => {
    const t = await page
      .getByText(/日時が指定されました|時間を節約|別の投稿を日時指定|予約しました|スケジュール(し|され)|投稿を予約|シェアされました|Scheduled/i)
      .first().isVisible().catch(() => false);
    if (t) return true;
    return await page.getByRole("button", { name: "後で" }).first().isVisible().catch(() => false);
  };
  let done = false;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    if (await successModal()) { done = true; console.log("📅 予約成功モーダルを検出"); break; }
  }
  if (!done) return false;
  const later = await firstVisible([
    page.getByRole("button", { name: "後で" }),
    page.getByRole("button", { name: /閉じる|Close/ }),
  ], 2000);
  if (later) { await clickResilient(later); await page.waitForTimeout(800); }
  return true;
}

async function publishReel(page: Page, pack: Pack, when: Date | null, keepFb: boolean): Promise<boolean> {
  console.log(`\n━━━ [リール] ${pack.slug} ━━━`);
  console.log(`動画: ${path.basename(pack.video!)} / caption ${[...pack.caption].length} 文字`);
  console.log(`カバー: ${pack.cover ? path.basename(pack.cover) : "未指定（Meta 自動サムネ）"}`);
  console.log(when ? `予約日時: ${when.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}` : "即時シェアモード（--now）");

  if (!(await openReelComposer(page))) return false;
  if (!(await uploadVideo(page, pack.video!))) return false;
  await setPlacementInstagramOnly(page, keepFb);
  if (!(await fillCaption(page, pack.caption))) return false;

  if (IS_PAUSE) {
    console.log("\n⏸  --pause: Inspector を起動。リール固有セレクタを採取してください。\n");
    await page.pause();
  }

  // 作成 → 編集（カバー設定）→ シェアする
  // カバーが指定されていれば「編集」ステップで明示アップロード。失敗しても投稿は止めない
  // （advanceToShareStep が最終的にシェアするまで進めるため、既存の動く経路は不変）。
  if (pack.cover) {
    if (await advanceToEditStep(page)) {
      await setReelCover(page, pack.cover);
    } else {
      console.log("⚠️  「編集」ステップに到達できずカバー設定をスキップ（フローは続行）");
    }
  }
  if (!(await advanceToShareStep(page))) return false;
  console.log("✅ シェアするステップ到達");

  // ── 予約モード ──
  if (when) {
    const opt = await firstVisible([SEL.reelScheduleOption(page)], 6000);
    if (!opt) {
      console.error("🚨 リール予約オプション「日時を指定」が見つかりません");
      await shot(page, "reel-schedule-option-missing");
      return false;
    }
    await clickResilient(opt);
    await page.waitForTimeout(1500);
    await shot(page, "reel-schedule-opened");
    if (!(await fillDateTimeFields(page, when))) return false;

    // fail-safe: 確定ボタン「公開日時を指定」が出るまで確認（即時シェアの誤爆防止）
    let confirmed = false;
    const start = Date.now();
    while (Date.now() - start < 8000) {
      if (await SEL.reelScheduleConfirm(page).first().isVisible().catch(() => false)) { confirmed = true; break; }
      await page.waitForTimeout(500);
    }
    if (!confirmed) {
      console.error("🚨 予約モード未確認 — 中止（即時シェアを回避）");
      await shot(page, "reel-schedule-mode-not-confirmed");
      return false;
    }
    console.log("📅 予約モード確認 OK");

    if (IS_DRY_RUN) {
      console.log("🧪 dry-run: 「公開日時を指定」の手前で停止。");
      await shot(page, "dry-run-reel-scheduled-ready");
      return true;
    }
    const btn = await firstVisible([SEL.reelScheduleConfirm(page)], 5000);
    if (!btn) {
      console.error("🚨 確定ボタン「公開日時を指定」が見つかりません");
      await shot(page, "reel-confirm-missing");
      return false;
    }
    await clickResilient(btn);
    if (!(await awaitSuccessAndDismiss(page))) {
      console.error("🚨 リール予約の成功を確認できません");
      await shot(page, "reel-schedule-not-saved");
      return false;
    }
    console.log("✅ リール予約 完了（要・実体確認: プランナーで予約キューを目視）");
    await shot(page, "reel-scheduled-done");
    return true;
  }

  // ── 即時シェア（--now）──
  if (IS_DRY_RUN) {
    console.log("🧪 dry-run: 「今すぐシェア」の手前で停止。");
    await shot(page, "dry-run-reel-immediate-ready");
    return true;
  }
  const nowBtn = await firstVisible([SEL.reelPublishNow(page)], 5000);
  if (!nowBtn) {
    console.error("🚨 「今すぐシェア」ボタンが見つかりません");
    await shot(page, "reel-publish-missing");
    return false;
  }
  await clickResilient(nowBtn);
  if (!(await awaitSuccessAndDismiss(page))) {
    // 即時はモーダルが出ない場合もあるため、コンポーザ離脱でも成功とみなす
    const gone = !(await firstVisible(SEL.reelComposerReady(page), 1500));
    if (!gone) {
      console.error("🚨 リール即時シェアの成功を確認できません");
      await shot(page, "reel-publish-not-confirmed");
      return false;
    }
  }
  console.log("✅ リール即時シェア 完了");
  return true;
}

// ─── 引数パース ────────────────────────────────────────
interface Cli {
  mode: "login" | "post";
  packArg?: string;
  when?: Date | null;
  keepFb: boolean;
  reel: boolean;
}

function parseArgs(): Cli {
  const args = process.argv.slice(2);
  const mode = args[0];

  if (mode === "login") return { mode: "login", keepFb: false, reel: false };

  if (mode !== "post") {
    console.error(
      "使い方:\n" +
        "  npx tsx publish-ig-bs.ts login\n" +
        "  npx tsx publish-ig-bs.ts post <pack> --schedule YYYY-MM-DDTHH:MM [--reel] [--dry-run] [--pause] [--keep-fb]\n" +
        "  npx tsx publish-ig-bs.ts post <pack> --now [--reel] [--dry-run]\n" +
        "    --reel : カルーセルでなく reels/video.mp4 をリール予約投稿"
    );
    process.exit(1);
  }

  const packArg = args[1];
  if (!packArg || packArg.startsWith("--")) {
    console.error("🚨 <pack>（パックのパス）を指定してください");
    process.exit(1);
  }

  let when: Date | null = null;
  let now = false;
  let keepFb = false;
  let reel = false;

  for (let i = 2; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") {
      IS_DRY_RUN = true;
    } else if (a === "--pause") {
      IS_PAUSE = true;
    } else if (a === "--keep-fb") {
      keepFb = true;
    } else if (a === "--reel") {
      reel = true;
    } else if (a === "--now") {
      now = true;
    } else if (a === "--schedule") {
      const v = args[++i];
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v || "")) {
        console.error(`🚨 --schedule は YYYY-MM-DDTHH:MM 形式（JST）: ${v}`);
        process.exit(1);
      }
      when = new Date(v + "+09:00");
    }
  }

  if (!now && !when) {
    console.error("🚨 --schedule <日時> か --now のどちらかが必要です");
    process.exit(1);
  }

  // Meta 予約制約: 約20分後〜75日先
  if (when) {
    const diffMin = (when.getTime() - Date.now()) / 60000;
    if (diffMin < 20) {
      console.error(`🚨 予約は最低 20 分後（Meta 制約）。指定は ${Math.round(diffMin)} 分後`);
      process.exit(1);
    }
    if (diffMin > 75 * 24 * 60) {
      console.error("🚨 予約は最大 75 日先（Meta 制約）");
      process.exit(1);
    }
  }

  return { mode: "post", packArg, when, keepFb, reel };
}

// ─── メイン ────────────────────────────────────────────
async function launch(): Promise<{ context: BrowserContext; page: Page }> {
  if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    channel: "chrome",
    viewport: { width: 1366, height: 950 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = context.pages()[0] || (await context.newPage());
  return { context, page };
}

async function main() {
  const cli = parseArgs();

  if (cli.mode === "login") {
    console.log("🔐 ログインモード: ブラウザでログイン（2FA）してください。");
    const { context, page } = await launch();
    try {
      await ensureLogin(page);
      console.log("✅ セッションを保存しました。ブラウザを閉じます。");
    } finally {
      await page.waitForTimeout(2000);
      await context.close();
    }
    return;
  }

  // post モード
  const pack = loadPack(cli.packArg!, cli.reel ? "reel" : "carousel");
  console.log(`🚀 IG ${cli.reel ? "リール" : "カルーセル"}${cli.when ? "予約" : "即時"}投稿`);
  if (IS_DRY_RUN) console.log("🧪 DRY RUN: 確定の手前で停止しスクショ");
  console.log(`   パック: ${pack.dir}`);
  console.log(
    cli.reel
      ? `   動画: ${path.basename(pack.video!)} / caption ${[...pack.caption].length} 文字\n`
      : `   画像: ${pack.images.length} 枚 / caption ${[...pack.caption].length} 文字\n`
  );

  const { context, page } = await launch();
  try {
    await ensureLogin(page);
    const ok = cli.reel
      ? await publishReel(page, pack, cli.when ?? null, cli.keepFb)
      : await publish(page, pack, cli.when ?? null, cli.keepFb);
    if (ok && !IS_DRY_RUN) updateStatus(pack, cli.when ?? null);
    console.log(`\n${ok ? "✅ 完了" : "❌ 失敗"}: ${pack.slug}`);
    if (!ok) console.log(`   → ${path.relative(PROJECT_ROOT, DEBUG_DIR)}/ のスクショを確認`);
    process.exitCode = ok ? 0 : 1;
  } catch (e) {
    console.error("エラー:", e);
    await shot(page, "fatal-error");
    process.exitCode = 1;
  } finally {
    await page.waitForTimeout(IS_DRY_RUN ? 4000 : 3000);
    await context.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
