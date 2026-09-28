# タスクスケジューラから毎日呼ばれるラッパー（doboku-note\auth-session-refresh）。Windows 版の auth-session-refresh.sh。
# 切れたログインを資格情報マネージャーの ID/PW で 1 回だけ取り直す（理由は scripts/auth-session-refresh.mjs の冒頭）。
# Windows からは CI へ state を書き出さない（CI へは Mac から一方向。DN-0362）ので --export / --dispatch-due は付けない。
# 導入・状態確認・即実行・解除: npm run auth-refresh:install [-- --status|--run-now|--uninstall]
#
# 人が作業する checkout には触らない。専用の worktree（.claude/worktrees/auth-session-refresh・detached・lock 済み）を
# 毎回 origin/develop に合わせて、その中で動かす（Mac の auth-session-refresh.sh と同じ）。

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
# 会社 PC は日中の空きメモリが 2GB を切るので、手動運用と同じ 500MB にそろえる（memory: playwright memory guard）。
if (-not $env:DOBOKU_PW_MIN_FREE_MB) { $env:DOBOKU_PW_MIN_FREE_MB = '500' }

$Repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Wt = Join-Path $Repo '.claude\worktrees\auth-session-refresh'
$LogDir = Join-Path $env:USERPROFILE '.local\state\doboku-note\logs'
$LogFile = Join-Path $LogDir 'auth-session-refresh.log'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Log([string]$line) { Add-Content -Path $LogFile -Value $line -Encoding UTF8 }

Log ''
Log "=== $(Get-Date -Format o) [auth-session-refresh] start ==="
$rc = 0
try {
  git -C $Repo fetch -q origin develop 2>&1 | ForEach-Object { Log "$_" }
  $listed = git -C $Repo worktree list --porcelain | Where-Object { $_ -eq "worktree $($Wt -replace '\\','/')" }
  if (-not $listed) {
    git -C $Repo worktree prune 2>&1 | ForEach-Object { Log "$_" }
    git -C $Repo worktree add -q --detach $Wt origin/develop 2>&1 | ForEach-Object { Log "$_" }
    # disk-hygiene の「マージ済み・clean・放置」判定で消されないよう lock する（ルーチン専用の印）。
    git -C $Repo worktree lock --reason 'auth-session-refresh scheduled task' $Wt 2>&1 | ForEach-Object { Log "$_" }
  }
  git -C $Wt reset -q --hard origin/develop 2>&1 | ForEach-Object { Log "$_" }
  # node_modules は本体を junction で共有する（削除するときは rmdir で junction だけ外す）。
  $nm = Join-Path $Wt 'node_modules'
  if (-not (Test-Path $nm)) { cmd /c mklink /J "$nm" "$(Join-Path $Repo 'node_modules')" | Out-Null }
  Push-Location $Wt
  try {
    node scripts/auth-session-refresh.mjs 2>&1 | ForEach-Object { Log "$_" }
    $rc = $LASTEXITCODE
  } finally { Pop-Location }
} catch {
  Log "ERROR: $($_.Exception.Message)"
  $rc = 1
}

if ($rc -eq 0) { Log "=== $(Get-Date -Format o) [auth-session-refresh] ok ===" }
else { Log "=== $(Get-Date -Format o) [auth-session-refresh] FAILED rc=$rc ===" }
exit $rc
