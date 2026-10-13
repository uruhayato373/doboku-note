/**
 * production-deploys.mjs — 本番デプロイ（main で成功した cloudflare-deploy.yml の run）と、ある commit が本番に入った日（唯一の実装）。
 * ---------------------------------------------------------------------------
 * 読み手: 検索キーワード戦略の改善（search-improvement.mjs の sync・本番反映の日を計測の境目にする）・SEO Rank Watch（seo-rank-watch.mjs の deploy）。
 * 取得は gh api（手元は gh のログイン・CI は GH_TOKEN と permissions: actions: read）。祖先の判定は手元の git を先に使い、
 * 浅い clone で commit が無いときだけ GitHub の compare API に聞く。
 * ---------------------------------------------------------------------------
 */
import { execFileSync } from 'node:child_process';

export const DEPLOY_WORKFLOW = 'cloudflare-deploy.yml';
export const DEPLOY_WORKFLOW_PATH = `.github/workflows/${DEPLOY_WORKFLOW}`;
export const DEPLOY_BRANCH = 'main';

const run = (root, cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 });

/** 本番デプロイの run として受け付けるか（成功・main・本番のワークフロー・完全な SHA）。 */
export const isProductionDeploy = (r) =>
  r?.conclusion === 'success' && r.status === 'completed' && r.head_branch === DEPLOY_BRANCH && r.path === DEPLOY_WORKFLOW_PATH && /^[a-f0-9]{40}$/.test(r.head_sha ?? '') && Number.isFinite(Date.parse(r.updated_at));

/** 成功した本番デプロイ（古い順・全ページ）。since（YYYY-MM-DD）を渡すとその日以降に作られた run だけ。 */
export function listProductionDeploys(root, { since } = {}) {
  const query = [`branch=${DEPLOY_BRANCH}`, 'status=success', 'per_page=100', since ? `created=${encodeURIComponent(`>=${since}`)}` : null].filter(Boolean).join('&');
  const out = run(root, 'gh', ['api', '--paginate', `repos/{owner}/{repo}/actions/workflows/${DEPLOY_WORKFLOW}/runs?${query}`, '--jq', '.workflow_runs[] | {id, conclusion, status, head_branch, path, head_sha, updated_at, html_url}']);
  return out
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l))
    .filter(isProductionDeploy)
    .map((r) => ({ id: r.id, sha: r.head_sha, at: r.updated_at, url: r.html_url }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

/** ancestor が descendant の祖先（同じ commit を含む）か。手元に commit が無ければ GitHub の compare API で判定する。 */
export function isAncestor(root, ancestor, descendant) {
  try {
    run(root, 'git', ['merge-base', '--is-ancestor', ancestor, descendant]);
    return true;
  } catch (e) {
    if (e.status === 1) return false; // 両方あって祖先でない
  }
  let status;
  try {
    status = run(root, 'gh', ['api', `repos/{owner}/{repo}/compare/${ancestor}...${descendant}`, '--jq', '.status']).trim();
  } catch (e) {
    // GitHub が知らない commit（push されていない・消えたブランチ）は本番に入りようがない。通信の失敗などは投げる
    if (/HTTP 404/.test(String(e.stderr ?? ''))) return false;
    throw e;
  }
  return status === 'ahead' || status === 'identical';
}

/**
 * commit を含む最初の本番デプロイ（無ければ null）。deploys は古い順。main は前にしか進まないので、
 * 一度含まれたら以後のデプロイもすべて含む＝二分探索で祖先の判定を減らす。contains は (sha) => boolean。
 */
export function firstDeployContaining(deploys, contains) {
  let lo = 0, hi = deploys.length - 1, hit = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (contains(deploys[mid].sha)) { hit = deploys[mid]; hi = mid - 1; } else lo = mid + 1;
  }
  return hit;
}
