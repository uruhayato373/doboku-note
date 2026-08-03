// Kindle 本を「配置 → 下書き → プロファイル掃除 → 出版 → catalog 更新」で連続処理する driver。
// scripts/kdp-batch.sh の cross-platform 版（あちらは zsh + pgrep 依存で Windows では動かない）。
//
// 使い方:
//   node scripts/kdp-batch.mjs f-10 f-11 f-12        # 下書き→出版まで（不可逆）
//   node scripts/kdp-batch.mjs --draft-only f-10     # 下書きまで
//
// 異常時は即停止する。特に「本の作成数制限」に当たったら、それ以降の id には触れない
// （制限時は本が作成されないので状態は汚れない。回復してから残りを渡し直す）。
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, copyFileSync, existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

const REPO = resolve(import.meta.dirname, '..')
const DIST = resolve(REPO, 'scripts/kindle-dist')
const DL = resolve(homedir(), 'Downloads')
const PROFILE = resolve(REPO, '.local/playwright-kdp-profile')
const CATALOG = resolve(REPO, 'scripts/kindle-published/catalog.json')
const TODAY = new Date().toISOString().slice(0, 10)

const args = process.argv.slice(2)
const draftOnly = args.includes('--draft-only')
const ids = args.filter((a) => !a.startsWith('--'))
if (!ids.length) { console.error('id を1つ以上指定する（例: node scripts/kdp-batch.mjs f-10 f-11）'); process.exit(1) }

// 「作成数制限」を示す痕跡。ここに当たったら残り全部を諦めて止める。
const LIMIT_MARKS = [/ページ2へ遷移できず/, /作成数制限/, /提出可能な本の数/]

const cleanProfile = () => {
  // 永続プロファイルを掴んだままのプロセスが残ると Chrome 起動が無言で落ちる。
  spawnSync('powershell', ['-NoProfile', '-Command',
    `Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='node.exe'" |` +
    ` Where-Object { $_.CommandLine -like '*playwright-kdp-profile*' } |` +
    ` ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }`,
  ], { stdio: 'ignore' })
  // kill 後は exit_type=Crashed が残り、次回起動時の復元ダイアログでハングする。
  const prefs = resolve(PROFILE, 'Default/Preferences')
  try {
    const d = JSON.parse(readFileSync(prefs, 'utf8'))
    d.profile = { ...(d.profile || {}), exit_type: 'Normal', exited_cleanly: true }
    writeFileSync(prefs, JSON.stringify(d))
  } catch {}
  for (const f of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    try { rmSync(resolve(PROFILE, f), { force: true }) } catch {}
  }
}

const readCatalog = () => JSON.parse(readFileSync(CATALOG, 'utf8'))
const markInReview = (id, draftAsin) => {
  const raw = readFileSync(CATALOG, 'utf8')
  const crlf = raw.includes('\r\n')
  const c = JSON.parse(raw)
  const b = c.books.find((x) => x.id === id)
  if (!b) return
  b.status = 'in_review'
  b.versionHistory = b.versionHistory || []
  b.versionHistory.push({ version: b.version || '1.0', date: TODAY, change: `KDP出版申請（審査中）・draft ${draftAsin}` })
  let out = JSON.stringify(c, null, 2) + '\n'
  if (crlf) out = out.replace(/\n/g, '\r\n')
  writeFileSync(CATALOG, out)
}

// kdp-publish.mjs を実行し、ログ全文と exit code を返す（出力は都度ファイルにも残す）。
const runStep = (id, extra, logName) => {
  const logPath = resolve(REPO, `.tmp/kdp-${id}-${logName}.log`)
  const r = spawnSync(process.execPath, [resolve(REPO, 'scripts/kdp-publish.mjs'), '--id', id, ...extra], {
    cwd: REPO, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  })
  const log = (r.stdout || '') + (r.stderr || '')
  writeFileSync(logPath, log)
  return { code: r.status, log, logPath }
}

let done = 0
for (const id of ids) {
  const book = readCatalog().books.find((b) => b.id === id)
  if (!book) { console.error(`STOP: ${id} が catalog に無い`); process.exit(1) }
  if (book.status === 'live' || book.status === 'in_review') {
    console.log(`SKIP ${id}: status=${book.status}（提出済み）`); continue
  }
  const epub = resolve(DIST, `${id}.epub`)
  const cover = resolve(DIST, `${id}.jpg`)
  if (!existsSync(epub) || !existsSync(cover)) { console.error(`STOP: ${id} の EPUB/表紙が ${DIST} に無い`); process.exit(1) }
  copyFileSync(epub, resolve(DL, `kindle-${id}.epub`))
  copyFileSync(cover, resolve(DL, `kindle-cover-${id}.jpg`))

  console.log(`\n=== ${id} 下書き ===`)
  cleanProfile()
  const d = runStep(id, [], 'draft')
  if (LIMIT_MARKS.some((re) => re.test(d.log))) {
    console.error(`STOP: ${id} で本の作成数制限に到達（本は作成されていない）。残り ${ids.slice(ids.indexOf(id)).join(' ')} は回復後に再投入する`)
    process.exit(2)
  }
  if (d.code !== 0 || !/\[done\] DRAFT 完了/.test(d.log)) {
    console.error(`STOP: ${id} 下書き失敗（exit=${d.code}）→ ${d.logPath}`)
    console.error(d.log.split('\n').slice(-6).join('\n'))
    process.exit(3)
  }
  console.log(`${id} 下書き OK`)
  if (draftOnly) { done++; continue }

  console.log(`=== ${id} 出版（不可逆）===`)
  cleanProfile()
  const p = runStep(id, ['--publish-only', '--commit-publish'], 'publish')
  if (p.code !== 0 || !/出版リクエスト送信/.test(p.log)) {
    console.error(`STOP: ${id} 出版失敗（exit=${p.code}）→ ${p.logPath}`)
    console.error(p.log.split('\n').slice(-6).join('\n'))
    process.exit(4)
  }
  const draftAsin = readCatalog().books.find((b) => b.id === id)?.draftAsin || '?'
  markInReview(id, draftAsin)
  console.log(`${id} 出版 OK（審査へ）／catalog=in_review`)
  done++
}
console.log(`\n完了: ${done}/${ids.length} 冊`)
