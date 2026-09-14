$ErrorActionPreference = 'Stop'
$resourceRows = @(Get-CimInstance Win32_Process | ForEach-Object {
  $resourceCommand = $_.CommandLine
  $resourceRuntime = $_.Name -match '^(node|python|ffmpeg|next)(\.exe|[0-9.]*\.exe)$'
  $resourceKind = if ($_.Name -match '^(chrome|msedge|firefox)\.exe$') { 'browser' }
    elseif ($_.Name -match '^(ChatGPT|claude|codex)\.exe$') { 'agent:' + ($_.Name -replace '\.exe$', '').ToLower() }
    elseif ($_.Name -match '^msedgewebview2\.exe$') { 'webview' }
    elseif ($resourceRuntime -and $resourceCommand -match 'server-filesystem[\\/]dist[\\/]index') { 'mcp:filesystem' }
    elseif ($resourceRuntime -and $resourceCommand -match 'server-github[\\/]dist[\\/]index') { 'mcp:github' }
    elseif ($resourceRuntime -and $resourceCommand -match 'chrome-devtools-mcp[\\/]build[\\/]src[\\/]bin') { 'mcp:chrome-devtools' }
    elseif ($resourceRuntime -and $resourceCommand -match 'search-growth[\\/]mcp[\\/]server') { 'mcp:search-growth' }
    elseif ($resourceRuntime -and $resourceCommand -match 'static-server\.mjs|local-media-server\.mjs|playwright.*test') { 'preview' }
    elseif ($resourceRuntime -and $resourceCommand -match 'node_modules[\\/]next[\\/]|next-server|(?:^|\s)next (dev|build|start)') { 'next' }
    elseif ($resourceRuntime -and -not $resourceCommand) { 'unknown-runtime' }
    elseif ($_.Name -match '^(ffmpeg|python|node).*') { 'runtime' }
    else { 'other' }
  if ($resourceKind -ne 'other') {
    [pscustomobject]@{ pid = [int]$_.ProcessId; parentPid = [int]$_.ParentProcessId; kind = $resourceKind; bytes = [long]$_.WorkingSetSize }
  }
})
ConvertTo-Json -InputObject $resourceRows -Compress
