/**
 * scan.mjs — ギャラリー走査（管理画面 API のデータソース）。
 *
 * 既存ギャラリースクリプトの走査部を移植して JSON を返す:
 *   scanOgp()        … scripts/ogp-gallery.mjs（frontmatter.group 分類）
 *   scanFigures()    … scripts/svg-gallery.mjs collectSite（+ png/webp クロップも含める）
 *   scanNoteImages() … scripts/note-cover-gallery.mjs + svg-gallery collectNote
 *   scanSnsPacks()   … 新規（IG パック単位 + X ドラフト。posted/status バッジ付き）
 *
 * 画像 URL はすべて /media/{posts|sns|note}/... 形式で返し、フロントがロードする。
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".."));
const POSTS = join(ROOT, ".local", "r2", "posts");
const NOTE = join(ROOT, "docs", "note");
const SNS = join(ROOT, "docs", "sns");
const AUDIT_STATE = join(ROOT, ".claude", "state", "svg-audit.json");

const toPosix = (p) => String(p).replace(/\\/g, "/");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

// ─── OGP（ogp-gallery.mjs 移植）──────────────────────────────
const GROUP_LABEL = {
  guide: "ガイド",
  textbook: "テキスト",
  keyword: "キーワード",
  pillar: "まとめ",
  primary: "過去問（一次）",
  secondary: "過去問（二次）",
  "past-exam": "過去問",
  other: "その他",
};

export function scanOgp() {
  const categories = readJson(join(ROOT, "src", "config", "categories.json")) || [];
  const catLabel = Object.fromEntries(categories.map((c) => [c.slug, c.label]));
  const catOrder = Object.fromEntries(categories.map((c) => [c.slug, c.order ?? 999]));

  const rels = readdirSync(POSTS, { recursive: true, withFileTypes: false })
    .map(toPosix)
    .filter((p) => p.endsWith("/ogp.png"));

  const items = rels
    .map((rel) => {
      const slugDir = dirname(rel);
      const category = slugDir.split("/")[0];
      // 記事本体の解決順は ogp-gallery.mjs と同じ（Convention B / A / フラット slug）
      let mdx = join(POSTS, slugDir, "article.mdx");
      if (!existsSync(mdx)) mdx = join(POSTS, slugDir + ".mdx");
      if (!existsSync(mdx)) mdx = join(POSTS, slugDir.replace(/\//g, "-"), "article.mdx");
      let group = "other";
      if (existsSync(mdx)) {
        try {
          const g = matter(readFileSync(mdx, "utf8")).data.group;
          if (g && GROUP_LABEL[g]) group = g;
        } catch {
          /* keep other */
        }
      }
      return { rel, slugDir, category, group, url: `/media/posts/${rel}` };
    })
    .sort((a, b) => a.rel.localeCompare(b.rel));

  return { items, catLabel, catOrder, groupLabel: GROUP_LABEL };
}

// ─── 記事図版（svg-gallery.mjs collectSite 拡張: svg + png/webp クロップ）──
const EXAM_DIR_RE = /\/(h\d+-primary|primary-h\d+[^/]*)\//;

export function scanFigures() {
  // 図テキスト品質監査（答え漏らし/写り込み・npm run audit-figure-text 生成）。無ければ未監査。
  const textAudit = readJson(join(ROOT, ".claude", "state", "figure-text-audit.json"));
  const provenance = readJson(join(ROOT, ".claude", "state", "figure-provenance.json"));
  const figAudit = (rel) => {
    const baseRel = rel.replace(/\.(png|webp|jpg|jpeg)$/i, "");
    return textAudit?.figures?.[baseRel] || null;
  };
  const figProv = (rel) => {
    const baseRel = rel.replace(/\.(png|webp|jpg|jpeg)$/i, "");
    return provenance?.figures?.[baseRel] || null;
  };
  const audit = readJson(AUDIT_STATE);
  const fileSeverity = {};
  for (const f of audit?.findings || []) {
    const path = toPosix(f.file);
    if (!fileSeverity[path]) fileSeverity[path] = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    if (f.severity && fileSeverity[path][f.severity] !== undefined) fileSeverity[path][f.severity]++;
  }
  const sevOf = (auditKey) => {
    const s = fileSeverity[auditKey];
    if (!s) return "clean";
    if (s.HIGH > 0) return "high";
    if (s.MEDIUM > 0) return "medium";
    if (s.LOW > 0) return "low";
    return "clean";
  };

  // 記事（slug = cat/localSlug）ごとに MDX を 1 回だけ読んでキャッシュし、
  // 図が MDX に参照されているか（掲載/孤児）・published・title・MDX 実体パスを解決する。
  const SITE = "https://doboku-note.com";
  const LOCAL = "http://localhost:3020";
  const articleCache = new Map();
  const resolveArticle = (slug) => {
    if (articleCache.has(slug)) return articleCache.get(slug);
    const cands = [
      join(POSTS, slug, "article.mdx"),
      join(POSTS, slug + ".mdx"),
      join(POSTS, slug.replace(/\//g, "-"), "article.mdx"),
    ];
    let info = { found: false, published: false, title: "", content: "", mdxAbs: null };
    for (const p of cands) {
      if (!existsSync(p)) continue;
      try {
        const { data, content } = matter(readFileSync(p, "utf8"));
        info = { found: true, published: data.published === true, title: data.title || "", content, mdxAbs: p };
      } catch {
        /* keep default */
      }
      break;
    }
    articleCache.set(slug, info);
    return info;
  };
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const rels = readdirSync(POSTS, { recursive: true, withFileTypes: false })
    .map(toPosix)
    .filter((p) => /\/img\/[^/]+\.(svg|png|webp|jpg)$/i.test(p));

  const items = rels
    .map((rel) => {
      const parts = dirname(rel).split("/");
      const category = parts[0];
      const slug = parts.slice(0, 2).join("/");
      const name = rel.split("/").pop();
      const ext = name.split(".").pop().toLowerCase();
      const kind = ext === "svg"
        ? (EXAM_DIR_RE.test("/" + rel) ? "exam-svg" : "svg")
        : "raster";
      // 図の実掲載判定: MDX が {basename}.{img拡張子} を参照しているか（png/webp ペアを吸収）
      const art = resolveArticle(slug);
      const base = name.replace(/\.(svg|png|webp|jpg|jpeg)$/i, "");
      const referenced = art.found
        ? new RegExp(escRe(base) + "\\.(webp|png|svg|jpg|jpeg)", "i").test(art.content)
        : false;
      const fa = figAudit(rel);
      const fp = kind === "raster" ? figProv(rel) : null;
      const urlSlug = slug.replace(/\//g, "-");
      return {
        rel,
        category,
        slug,
        name,
        kind,
        severity: kind === "svg" ? sevOf(".local/r2/posts/" + rel) : null,
        // ラスタ図はテキスト監査（leak/prose/maybe/clean/unaudited）＋画質（sharp/soft/blurry）
        textStatus: kind === "raster" ? (fa?.status || "unaudited") : null,
        imgQuality: kind === "raster" ? (fa?.quality || "unknown") : null,
        sharpness: kind === "raster" ? (fa?.sharpness ?? null) : null,
        // provenance: needs=次アクション / sourceDir=再スキャン/再クロップ元 / rescannable
        needs: fp?.needs || null,
        sourceDir: fp?.source_dir || null,
        rescannable: fp?.rescannable || null,
        url: `/media/posts/${rel}`,
        referenced,
        articleFound: art.found,
        published: art.published,
        title: art.title,
        articleUrl: `${SITE}/docs/${urlSlug}`,
        localUrl: `${LOCAL}/docs/${urlSlug}`,
        mdxAbs: art.mdxAbs,
      };
    })
    .sort((a, b) => a.rel.localeCompare(b.rel));

  return { items };
}

// ─── note カバー・図版（note-cover-gallery.mjs + svg-gallery collectNote 移植）──
export function scanNoteImages() {
  const tokens = readJson(join(ROOT, "docs", "design-system", "note-cover-tokens.json"));
  const exams = tokens?.exams || {};
  const examKeys = Object.keys(exams).filter((k) => k !== "comment");

  // dir セグメントから exam キーを解決（note-cover-gallery.mjs と同義・級別を combined より先に）
  const resolveExam = (rel) => {
    const segs = String(rel).split("/");
    for (const key of examKeys) {
      if (key === "civil-1-2") continue;
      if (exams[key]?.dir && segs.includes(exams[key].dir)) return key;
    }
    if (exams["civil-1-2"]?.dir && segs.includes(exams["civil-1-2"].dir)) return "civil-1-2";
    return "pe-comprehensive";
  };

  const items = [];
  const walk = (absDir, rel) => {
    for (const e of readdirSync(absDir, { withFileTypes: true })) {
      if (e.isDirectory() && e.name !== "img") {
        walk(join(absDir, e.name), rel ? `${rel}/${e.name}` : e.name);
      }
    }
    const imgDir = join(absDir, "img");
    if (!existsSync(imgDir)) return;
    for (const f of readdirSync(imgDir)) {
      const isCover = /^cover(-[A-Za-z0-9-]+)?\.png$/.test(f);
      const isFigure = /^figure-[^/]+\.png$/.test(f);
      if (!isCover && !isFigure) continue;
      const item = {
        rel: `${rel}/img/${f}`,
        dir: rel,
        name: f,
        exam: resolveExam(rel),
        kind: isCover ? "cover" : "figure",
        url: `/media/note/${rel}/img/${f}`,
      };
      if (isCover) {
        // cover.png → article.md / cover-II1.png → article-II1.md（種別バッジ用）
        const suffix = f.replace(/^cover/, "").replace(/\.png$/, "");
        const articlePath = join(absDir, `article${suffix}.md`);
        item.pricing = "unknown";
        item.inMagazine = rel.split("/").includes("magazines");
        if (existsSync(articlePath)) {
          try {
            const { data } = matter(readFileSync(articlePath, "utf8"));
            item.pricing = data.notePricing || "unknown";
          } catch {
            /* keep unknown */
          }
        }
      }
      items.push(item);
    }
  };
  walk(NOTE, "");
  items.sort((a, b) => a.rel.localeCompare(b.rel));

  const examMeta = Object.fromEntries(
    examKeys.map((k) => [k, { label: exams[k].label, base: exams[k].base, short: exams[k].short }]),
  );
  return { items, examMeta, examOrder: examKeys };
}

// ─── SNS パック（IG パック + X ドラフト）────────────────────────
const R2_SNS_BASE = "https://storage.doboku-note.com/sns";

/** パック配下のフォーマット別画像・動画を集める（IG: carousel/reels/stories サブディレクトリ）。 */
function collectPackMedia(packDir, packRel) {
  const media = { carousel: [], reels: [], stories: [] };
  for (const fmt of ["carousel", "reels", "stories"]) {
    const fmtDir = join(packDir, fmt);
    if (!existsSync(fmtDir)) continue;
    const files = readdirSync(fmtDir, { recursive: true, withFileTypes: false })
      .map(toPosix)
      .filter((f) => /\.(png|webp|jpg|mp4)$/i.test(f))
      .sort();
    for (const f of files) {
      const relFromSns = `${packRel}/${fmt}/${f}`;
      const isVideo = /\.mp4$/i.test(f);
      media[fmt].push({
        name: f,
        video: isVideo,
        url: `/media/sns/${relFromSns}`,
        r2Url: isVideo ? `${R2_SNS_BASE}/${relFromSns}` : null,
      });
    }
    // reels の mp4 が R2 退避済み（SoT は残るが動画実体なし）の場合はバッジ用フラグ
    if (fmt === "reels" && !files.some((f) => /\.mp4$/i.test(f))) {
      media.reelsOffloaded = true;
    }
  }
  // 直下 img/（キーワードパック等の平置き構成）
  const flatImg = join(packDir, "img");
  if (existsSync(flatImg)) {
    for (const f of readdirSync(flatImg).filter((f) => /\.(png|webp|jpg)$/i.test(f)).sort()) {
      media.carousel.push({ name: `img/${f}`, video: false, url: `/media/sns/${packRel}/img/${f}`, r2Url: null });
    }
  }
  return media;
}

export async function scanSnsPacks() {
  // ig-status.mjs の export 済みヘルパを再利用（ロジック二重化しない）
  const ig = await import(
    new URL("../../../scripts/ig-status.mjs", import.meta.url).href
  );
  const igPacks = ig.walkPacks(ig.IG_DIR).map((dir) => {
    const info = ig.packInfo(dir);
    const packRel = `instagram/${info.rel}`;
    return {
      channel: "instagram",
      rel: packRel,
      exam: info.exam,
      slug: info.slug,
      posted: info.posted, // { carousel, reels, stories } | null
      status: readJson(join(dir, "status.json")),
      media: collectPackMedia(dir, packRel),
    };
  });

  // X ドラフト（docs/sns/x/draft/{NNN}-*/: tweets.md + status.json）
  const xDraftDir = join(SNS, "x", "draft");
  const xDrafts = [];
  if (existsSync(xDraftDir)) {
    for (const name of readdirSync(xDraftDir).sort()) {
      const dir = join(xDraftDir, name);
      if (!statSync(dir).isDirectory()) continue;
      const status = readJson(join(dir, "status.json"));
      const counts = { draft: 0, scheduled: 0, posted: 0, other: 0 };
      for (const t of Object.values(status?.tweets || {})) {
        if (t.status in counts) counts[t.status]++;
        else counts.other++;
      }
      const images = existsSync(join(dir, "img"))
        ? readdirSync(join(dir, "img"))
            .filter((f) => /\.(png|webp|jpg)$/i.test(f))
            .map((f) => ({ name: f, url: `/media/sns/x/draft/${name}/img/${f}` }))
        : [];
      xDrafts.push({
        channel: "x",
        rel: `x/draft/${name}`,
        name,
        counts,
        total: Object.keys(status?.tweets || {}).length,
        updatedAt: status?.updated_at || null,
        images,
      });
    }
  }

  return { igPacks, xDrafts };
}
