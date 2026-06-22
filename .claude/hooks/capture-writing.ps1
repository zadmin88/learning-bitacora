# capture-writing.ps1 — Claude Code "Stop" hook for the Writing Coach feature.
#
# On each completed turn it reads the session transcript, extracts the latest
# user prompt and the "English coaching" correction produced by the
# UserPromptSubmit standing instruction, and POSTs them to the Convex
# /coach/ingest endpoint. It fails silently so it can never block the session.
#
# Config (either real env vars or a gitignored .claude/.coach-env file):
#   COACH_INGEST_URL = https://<deployment>.convex.site/coach/ingest
#   COACH_API_KEY    = coach_xxxxxxxx   (generate it in the app under Ajustes)

$ErrorActionPreference = 'SilentlyContinue'

try {
  $raw = [Console]::In.ReadToEnd()
  if (-not $raw) { exit 0 }
  $hook = $raw | ConvertFrom-Json

  # ── Load config ────────────────────────────────────────────────
  $url = $env:COACH_INGEST_URL
  $key = $env:COACH_API_KEY
  $envFile = Join-Path $PSScriptRoot '..\.coach-env'
  if ((-not $url -or -not $key) -and (Test-Path $envFile)) {
    foreach ($line in Get-Content -LiteralPath $envFile) {
      if ($line -match '^\s*([A-Z_]+)\s*=\s*(.+?)\s*$') {
        if ($matches[1] -eq 'COACH_INGEST_URL' -and -not $url) { $url = $matches[2] }
        if ($matches[1] -eq 'COACH_API_KEY' -and -not $key) { $key = $matches[2] }
      }
    }
  }
  if (-not $url -or -not $key) { exit 0 }

  $transcript = $hook.transcript_path
  if (-not $transcript -or -not (Test-Path $transcript)) { exit 0 }

  # ── Parse the JSONL transcript ─────────────────────────────────
  $entries = @()
  foreach ($line in Get-Content -LiteralPath $transcript) {
    if (-not $line.Trim()) { continue }
    try { $entries += ($line | ConvertFrom-Json) } catch { }
  }
  if ($entries.Count -eq 0) { exit 0 }

  function Get-Text($content) {
    if ($null -eq $content) { return '' }
    if ($content -is [string]) { return $content }
    $parts = @()
    foreach ($block in $content) {
      if ($block.type -eq 'text' -and $block.text) { $parts += $block.text }
    }
    return ($parts -join "`n")
  }

  # ── Latest assistant text message ──────────────────────────────
  $assistant = $null
  $assistantText = ''
  for ($i = $entries.Count - 1; $i -ge 0; $i--) {
    if ($entries[$i].type -eq 'assistant' -and $entries[$i].message) {
      $t = Get-Text $entries[$i].message.content
      if ($t.Trim()) { $assistant = $entries[$i]; $assistantText = $t; break }
    }
  }
  if (-not $assistant) { exit 0 }

  # ── Dedupe: skip if we already sent this assistant message ─────
  $stateFile = Join-Path $PSScriptRoot '..\.coach-last'
  if (Test-Path $stateFile) {
    $lastUuid = (Get-Content -LiteralPath $stateFile -Raw).Trim()
    if ($lastUuid -and $lastUuid -eq $assistant.uuid) { exit 0 }
  }

  # ── Latest real user prompt (string content, not a tool result) ─
  $userText = ''
  for ($i = $entries.Count - 1; $i -ge 0; $i--) {
    $e = $entries[$i]
    if ($e.type -eq 'user' -and $e.message) {
      if ($e.message.content -is [string]) { $userText = $e.message.content; break }
      $hasToolResult = $false
      foreach ($b in $e.message.content) { if ($b.type -eq 'tool_result') { $hasToolResult = $true } }
      if (-not $hasToolResult) {
        $t = Get-Text $e.message.content
        if ($t.Trim()) { $userText = $t; break }
      }
    }
  }
  if (-not $userText.Trim()) { exit 0 }

  # ── Extract the "English coaching" block ───────────────────────
  $lines = $assistantText -split "`r?`n"
  $inBlock = $false
  $blockLines = @()
  foreach ($l in $lines) {
    if (-not $inBlock) {
      if ($l -match '(?i)english coaching') { $inBlock = $true }
      continue
    }
    if ($l -match '^\s*---\s*$') { break }
    if ($l -match '^\s*#{1,3}\s+' -and $l -notmatch '(?i)coach') { break }
    $blockLines += $l
  }
  if ($blockLines.Count -eq 0) { exit 0 }  # not a coached turn — skip

  # corrected = blockquote lines if present, else the whole block
  $quote = @()
  foreach ($l in $blockLines) { if ($l -match '^\s*>\s?(.*)$') { $quote += $matches[1] } }
  if ($quote.Count -gt 0) { $corrected = ($quote -join "`n").Trim() }
  else { $corrected = (($blockLines -join "`n").Trim()) }

  # tips = list items (numbered or bulleted)
  $tips = @()
  foreach ($l in $blockLines) {
    if ($l -match '^\s*(?:\d+\.|[-*])\s+(.*)$') {
      $tip = ($matches[1] -replace '\*\*', '').Trim()
      if ($tip) { $tips += $tip }
    }
  }

  # ── POST to Convex ─────────────────────────────────────────────
  $body = @{
    source    = 'claude-code'
    original  = $userText.Trim()
    corrected = $corrected
    tips      = @($tips)
  } | ConvertTo-Json -Compress -Depth 5

  Invoke-RestMethod -Method Post -Uri $url `
    -Headers @{ Authorization = "Bearer $key" } `
    -ContentType 'application/json' -Body $body -TimeoutSec 8 | Out-Null

  Set-Content -LiteralPath $stateFile -Value $assistant.uuid -NoNewline
} catch { }

exit 0
