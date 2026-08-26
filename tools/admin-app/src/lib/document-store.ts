import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import matter from 'gray-matter';
import { renderDocument, type DocumentHeading } from './markdown';

/**
 * document-store.ts — リポジトリ内 Markdown/JSON を安全に列挙・検索・読込する共通実装。
 *
 * `.claude/knowledge`（knowledge.ts）と `docs/`（project.ts）が同じ経路を通る。
 * **パストラバーサル防止をここ 1 箇所に集約する**のが主目的で、各画面が独自の弱い
 * prefix 検査を書き直さないための土台（仕様 §7.3）。
 *
 * HTML はリクエスト時に生成し、生成物をファイルへ保存しない（Markdown が常に SSOT）。
 */

export interface DocumentSource {
  /** 走査ルートの絶対パス */
  root: string;
  /** 画面表示・VS Code リンク用のリポジトリ相対プレフィックス（例 `docs`） */
  filePrefix: string;
  allowedExtensions: ReadonlySet<string>;
  /**
   * root 直下で走査から外すディレクトリ名。
   *
   * 移行期間の `docs/` は「恒久文書」と「これから content/ へ出ていくチャネル素材」が
   * 同居している。除外しないと /docs に note/sns の 8,000 ファイルが流れ込み、
   * かつ /content の fallback と**同じファイルを二重に数える**。Phase 5〜9 で
   * 実際に移動し終えたら、この集合から 1 つずつ消える（＝移行の進捗メーター）。
   */
  exclude?: ReadonlySet<string>;
}

export interface DocumentEntry {
  slug: string;
  file: string;
  title: string;
  category: string;
  summary: string;
  modifiedAt: string;
  size: number;
  searchText: string;
  /** gray-matter が読んだ frontmatter の生データ（.md のみ。.json は空オブジェクト）。 */
  frontmatter: Readonly<Record<string, unknown>>;
}

export interface LoadedDocument {
  title: string;
  file: string;
  html: string;
  headings: DocumentHeading[];
  json: string | null;
  /** 詳細画面の追加解析（ID 抽出・警告など）に使う本文。frontmatter は除く。 */
  content: string;
  modifiedAt: string;
  absolute: string;
  /** gray-matter が読んだ frontmatter の生データ（.md のみ。.json は空オブジェクト）。 */
  frontmatter: Readonly<Record<string, unknown>>;
}

export type { DocumentHeading };

const toPosix = (value: string) => value.split(sep).join('/');

function walk(
  dir: string,
  allowed: ReadonlySet<string>,
  out: string[] = [],
  excludeTop?: ReadonlySet<string>,
): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue; // symlink 経由で root 外へ出ない
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludeTop?.has(entry.name)) continue; // 除外は root 直下の名前でだけ判定する
      walk(path, allowed, out);
    } else if (allowed.has(extname(entry.name))) out.push(path);
  }
  return out;
}

export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const stripExt = (rel: string) => rel.replace(/\.(md|json)$/, '');

/** 走査ルート配下の全文書。category は先頭ディレクトリ（無ければ 'other'）。 */
export function listDocuments(source: DocumentSource): DocumentEntry[] {
  return walk(source.root, source.allowedExtensions, [], source.exclude)
    .map((absolute) => {
      const rel = toPosix(relative(source.root, absolute));
      const raw = readFileSync(absolute, 'utf8');
      const parsed: { data: Record<string, unknown>; content: string } =
        extname(rel) === '.md' ? matter(raw) : { data: {}, content: raw };
      const heading = parsed.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
      const title = String(parsed.data.title ?? heading ?? stripExt(rel));
      const text = plainText(parsed.content);
      const stats = statSync(absolute);
      const segments = rel.split('/');
      return {
        slug: stripExt(rel),
        file: `${source.filePrefix}/${rel}`,
        title,
        category: segments.length > 1 ? segments[0]! : 'other',
        summary: text.slice(0, 180),
        modifiedAt: stats.mtime.toISOString(),
        size: stats.size,
        searchText: `${title} ${rel} ${text}`.toLocaleLowerCase('ja'),
        frontmatter: parsed.data,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'ja'));
}

/**
 * catch-all のパス片から実ファイルを解決する。
 *
 * 1. `join('/')` で slug 化 2. 許可拡張子を付けた候補だけ作る
 * 3. `resolve(root)` を prefix として root 配下を確認
 * 4. **realpath でも再確認**（symlink 経由の root 外参照を許可しない）
 * 解決できなければ null（呼び出し側が notFound() する）。
 */
export function resolveDocumentPath(source: DocumentSource, slugParts: string[]): string | null {
  // catch-all のセグメントは**エンコードされたまま**届くことがある（`04_%E9%81%8B%E5%96%B6`）。
  // ASCII 名では encoded === decoded なので気づかず、日本語ディレクトリだけが 404 になる
  // （2026-08-18 実測: 当時の docs/project は日本語ディレクトリのため全滅、.claude/knowledge は
  //  全て ASCII 名のため露見していなかった）。復号は 1 箇所でだけ行う。
  const decoded = slugParts.map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part; // 不正な %エスケープはそのまま扱い、下の存在検査で落とす
    }
  });
  if (decoded.some((part) => !part || part === '.' || part === '..' || part.includes('\0'))) {
    return null;
  }
  const slug = decoded.join('/');
  const rootReal = realpathSync(resolve(source.root));
  const rootPrefix = `${rootReal}${sep}`;
  for (const ext of source.allowedExtensions) {
    const candidate = resolve(source.root, `${slug}${ext}`);
    if (!candidate.startsWith(`${resolve(source.root)}${sep}`)) continue;
    if (!existsSync(candidate)) continue;
    const real = realpathSync(candidate);
    if (!real.startsWith(rootPrefix)) continue; // symlink で外へ出ている
    return real;
  }
  return null;
}

export function loadDocument(source: DocumentSource, slugParts: string[]): LoadedDocument | null {
  const absolute = resolveDocumentPath(source, slugParts);
  if (!absolute) return null;

  const raw = readFileSync(absolute, 'utf8');
  const rel = toPosix(relative(realpathSync(resolve(source.root)), absolute));
  const file = `${source.filePrefix}/${rel}`;
  const modifiedAt = statSync(absolute).mtime.toISOString();

  if (extname(absolute) === '.json') {
    let formatted = raw;
    try {
      formatted = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      // 壊れた JSON も Admin で確認できるよう原文を表示する。
    }
    return { title: rel, file, html: '', headings: [], json: formatted, content: raw, modifiedAt, absolute, frontmatter: {} };
  }

  const parsed = matter(raw);
  const heading = parsed.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  // 本文先頭の `# タイトル` は落とす。詳細画面がページ見出し（h1）としてタイトルを出すので、
  // そのまま描くと **1 ページに h1 が 2 つ**並んで見出し階層が壊れる（2026-08-18 に admin e2e が検出）。
  const body = parsed.content.replace(/^\s*#\s+.+\r?\n/, '');
  const { html, headings } = renderDocument(body);
  return {
    title: String(parsed.data.title ?? heading ?? stripExt(rel)),
    file,
    html,
    headings,
    json: null,
    content: parsed.content,  // 解析用は元のまま（ID 抽出・未チェック件数は本文全体で数える）
    modifiedAt,
    absolute,
    frontmatter: parsed.data,
  };
}

/**
 * 巨大ルート用: チャネル単位の件数と容量だけを数える（content の初期表示）。
 *
 * **本文もバイナリも読まない**（size は statSync のみ）。content は 1 万ファイル規模なので、
 * 一覧で本文を開いた瞬間に初期表示が数秒単位で止まり、admin が使い物にならなくなる。
 *
 * 新ルートは直下のディレクトリが 1 チャネル。旧ルートは **root 自体が 1 チャネル**
 * （content/note 全体が移行後の content/note）で、`mountAt` を segment として並べる。
 * 同じ mountAt が新旧の両方にあれば `duplicate` を立てる＝移行が途中で二重化している。
 */
export interface ChannelSummary {
  segment: string;
  files: number;
  bytes: number;
  filePrefix: string;
  /** ドリルダウンの起点となる root 相対ディレクトリ */
  relDir: string;
}

/** ディレクトリ配下のファイル数と bytes。statSync だけを使い、中身は開かない。 */
function countTree(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  const walkCount = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isSymbolicLink()) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walkCount(p);
      else if (e.isFile()) { files += 1; bytes += statSync(p).size; }
    }
  };
  if (existsSync(dir)) walkCount(dir);
  return { files, bytes };
}

export function summarizeChannels(primary: DocumentSource): ChannelSummary[] {
  const out: ChannelSummary[] = [];
  if (existsSync(primary.root)) {
    for (const entry of readdirSync(primary.root, { withFileTypes: true })) {
      if (!entry.isDirectory() || primary.exclude?.has(entry.name)) continue;
      out.push({
        segment: entry.name,
        ...countTree(join(primary.root, entry.name)),
        filePrefix: primary.filePrefix,
        relDir: entry.name,
      });
    }
  }
  return out.sort((a, b) => a.segment.localeCompare(b.segment, 'ja'));
}

/** 指定ディレクトリ直下だけを列挙する（段階的ドリルダウン用・本文は読まない）。 */
export function listDirectory(src: DocumentSource, relDir: string) {
  const base = relDir ? resolveDocumentPathDir(src, relDir) : realpathSync(resolve(src.root));
  if (!base) return null;
  const dirs: string[] = [];
  const files: { name: string; size: number; isDoc: boolean }[] = [];
  for (const e of readdirSync(base, { withFileTypes: true })) {
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) dirs.push(e.name);
    else if (e.isFile()) {
      files.push({
        name: e.name,
        size: statSync(join(base, e.name)).size,
        isDoc: src.allowedExtensions.has(extname(e.name)),
      });
    }
  }
  return { dirs: dirs.sort(), files: files.sort((a, b) => a.name.localeCompare(b.name, 'ja')) };
}

/** ディレクトリ版の安全解決（ファイルと同じ prefix + realpath 検査を通す）。 */
function resolveDocumentPathDir(source: DocumentSource, relDir: string): string | null {
  const parts = relDir.split('/').filter(Boolean).map((part) => {
    try { return decodeURIComponent(part); } catch { return part; }
  });
  if (parts.some((p) => !p || p === '.' || p === '..' || p.includes('\0'))) return null;
  const candidate = resolve(source.root, parts.join('/'));
  if (!candidate.startsWith(`${resolve(source.root)}${sep}`)) return null;
  if (!existsSync(candidate)) return null;
  const real = realpathSync(candidate);
  if (!real.startsWith(`${realpathSync(resolve(source.root))}${sep}`)) return null;
  return real;
}

