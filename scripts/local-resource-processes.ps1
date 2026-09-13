$ErrorActionPreference = 'Stop'
$resourceRows = @(Get-CimInstance Win32_Process | ForEach-Object {
  $resourceCommand = $_.CommandLine
  $resourceKind = if ($_.Name -match '^(chrome|msedge|firefox)\.exe$') { 'browser' }
    elseif ($resourceCommand -match 'server-filesystem[\\/]dist[\\/]index') { 'mcp:filesystem' }
    elseif ($resourceCommand -match 'server-github[\\/]dist[\\/]index') { 'mcp:github' }
    elseif ($resourceCommand -match 'chrome-devtools-mcp[\\/]build[\\/]src[\\/]bin') { 'mcp:chrome-devtools' }
    elseif ($resourceCommand -match 'search-growth[\\/]mcp[\\/]server') { 'mcp:search-growth' }
    elseif ($resourceCommand -match 'static-server\.mjs|local-media-server\.mjs|playwright.*test') { 'preview' }
    elseif ($resourceCommand -match 'next[\\/]|next-server|next dev|next build') { 'next' }
    elseif ($_.Name -match '^(ffmpeg|python|node).*') { 'runtime' }
    else { 'other' }
  if ($resourceKind -ne 'other') {
    [pscustomobject]@{ pid = [int]$_.ProcessId; parentPid = [int]$_.ParentProcessId; kind = $resourceKind; bytes = [long]$_.WorkingSetSize }
  }
})
ConvertTo-Json -InputObject $resourceRows -Compress
