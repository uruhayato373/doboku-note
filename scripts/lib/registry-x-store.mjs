/**
 * registry-x-store.mjs — X の書き手（publish-x・x-sync-status）がコンテンツ台帳を読み書きする唯一の入口（DN-0612）。
 * 正本は台帳（content/registry/publications/x/{exam}.json）。下書きフォルダの status.json は文面と運用の記録（予約の履歴など）を持つ
 * 旧い写しで、P7 で文面を tweets.md へ寄せてから消す。移行のあいだ書き手は status.json も今までどおり書いてよいが、
 * 「投稿してよいか・投稿したか」の判断は台帳を読み、状態が変わったら台帳にも書く。
 */
import { canTransition, loadRegistry, loadRegistryConfig, resolveCopy } from './content-registry.mjs';
import { X_ROOT } from './registry-x-state.mjs';
import { X_HANDLE } from './site-identity.mjs';

/** 台帳の X の公開を、下書きフォルダの相対パス（content/sns/x/ の下）と鍵（"1"…）で引く Map */
export function xPublicationIndex(root, reg = loadRegistry(root)) {
  const out = new Map();
  for (const p of reg.publications) {
    if (p.channel !== 'x' || !p.legacyKey) continue;
    out.set(p.legacyKey, p); // legacyKey は "draft/{フォルダ}#{鍵}"
  }
  return out;
}

/** 下書きフォルダ（content/sns/x/draft/{name} か draft/{name} か {name}）と鍵 → 台帳の行。無ければ null */
export function readXPublication(root, folder, key, index = xPublicationIndex(root)) {
  const rel = String(folder).replace(/\\/g, '/').replace(new RegExp(`^(?:\\./)?${X_ROOT}/`), '').replace(/\/$/, '');
  const withBase = /^(draft|published)\//.test(rel) ? rel : `draft/${rel}`;
  return index.get(`${withBase}#${key}`) ?? null;
}

/** 台帳の状態 → X の運用の段階（読み手の判定を 1 か所に集める） */
export function xPhase(pub) {
  switch (pub.status) {
    case 'draft': return 'draft';
    case 'approved': return 'planned'; // 承認済み・X の予約には未投入
    case 'scheduled': return pub.times?.queueVerified ? 'queued' : 'submitted'; // 予約に入れた（キューで確かめたか）
    case 'published': return 'posted';
    case 'stopped': return 'retired';
    default: return pub.status;
  }
}

/**
 * 台帳の X の投稿を、読み手が使う形で全部返す（X の状態の正本は台帳・DN-0612 P7）。
 * 文面は copy（tweets.md#tweet/N）から解決する。文面を持たない行（投稿した事実だけ残した行）は text が null。
 * @returns {{ id, exam, work, folder, key, title, text, thread, status, stopReason, phase, publishAt, queuedAt, publishedAt, platform, planSlot, approval, row }[]}
 */
export function loadXPosts(root, { reg = loadRegistry(root) } = {}) {
  const out = [];
  for (const p of reg.publications) {
    if (p.channel !== 'x') continue;
    const m = /^(?:draft|published)\/(?:_[^/]+\/)?([^#/]+)#(\d+)$/.exec(p.legacyKey ?? '');
    const copy = resolveCopy(root, p.copy);
    out.push({
      id: p.id, exam: p.exam, work: p.work, folder: m?.[1] ?? null, key: m?.[2] ?? null,
      text: copy?.text ?? null, thread: copy?.thread ?? [],
      status: p.status, stopReason: p.stopReason ?? null, phase: xPhase(p),
      publishAt: p.publishAt ?? null, queuedAt: p.times?.queueVerified ?? null,
      publishedAt: p.platform?.publishedAt ?? null, platform: p.platform ?? null,
      planSlot: p.planSlot ?? null, approval: p.approval ?? null, row: p,
    });
  }
  return out;
}

/** 台帳の状態 → 投稿の候補にしてよいか（approved・scheduled だけ。stopped・published・draft は候補にしない） */
export function isQueueable(pub) {
  return Boolean(pub && ['approved', 'scheduled'].includes(pub.status));
}

/**
 * 状態を書く。event: 'published' { id（tweet ID）, url?, evidence: {kind, ref} } / 'scheduled' { publishAt }。
 * 遷移は config（transitionsByChannel.x を含む）に従う。stopped(unverified-legacy)→published は証拠つきで可。
 */
export async function recordX(root, folder, key, event, data = {}) {
  const cur = readXPublication(root, folder, key);
  if (!cur) throw new Error(`台帳に無い X の投稿: ${folder}#${key}（先に npm run registry -- import-x --folder <下書きフォルダ> --commit）`);
  const cfg = loadRegistryConfig(root);
  const row = Object.fromEntries(Object.entries(cur).filter(([k]) => !['file', 'exam', 'channel'].includes(k)));
  const can = (to) => row.status === to || canTransition(cfg, row.status, to, 'x');
  const grand = row.approval ?? { by: 'user', contentSha256: null, grandfathered: true };
  if (event === 'published') {
    if (!data.id || !data.evidence) throw new Error('published には id と evidence が要る');
    const fromUnverified = row.status === 'stopped' && row.stopReason === 'unverified-legacy';
    if (!fromUnverified && !can('published')) throw new Error(`${row.status} → published は遷移に無い（${row.id}）`);
    Object.assign(row, { status: 'published', approval: grand, platform: { id: String(data.id), url: data.url ?? `https://x.com/${X_HANDLE}/status/${data.id}`, privacy: 'public', evidence: data.evidence } });
    delete row.stopReason; delete row.reason;
  } else if (event === 'scheduled') {
    if (!data.publishAt) throw new Error('scheduled には publishAt が要る');
    if (!can('scheduled')) throw new Error(`${row.status} → scheduled は遷移に無い（${row.id}）`);
    Object.assign(row, { status: 'scheduled', publishAt: data.publishAt, approval: grand });
  } else {
    throw new Error(`知らない event: ${event}`);
  }
  const { upsertPublications } = await import('./content-registry-write.mjs');
  upsertPublications(root, 'x', cur.exam, [row]);
  return row;
}
