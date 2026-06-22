# capture-writing.ps1 — Claude Code "Stop" hook for the Writing Coach feature.
#
# On each completed turn it reads the session transcript, extracts the latest
# user prompt and the "English coaching" correction produced by the
# UserPromptSubmit standing instruction, and POSTs them to the Convex
# /coach/ingest endpoint. It fails silently so it can never block the session.
#
# Transcript shape notes (Claude Code JSONL):
#   * one assistant *turn* is stored as MANY entries (each text/tool block is
#     its own entry; tool calls are text-less assistant entries). So we collect
#     ALL assistant text that comes AFTER the triggering user prompt.
#   * tool results are stored as type="user" entries containing a tool_result
#     block — those are NOT real prompts and must be skipped.
#
# Config (real env vars or a gitignored .claude/.coach-env file):
#   COACH_INGEST_URL = https://<deployment>.convex.site/coach/ingest
#   COACH_API_KEY    = coach_xxxxxxxx   (generate it in the app under Ajustes)
#
# Set COACH_DEBUG=1 to print diagnostics instead of failing silently.

param()

$debug = $env:COACH_DEBUG -eq '1'
if (-not $debug) { $ErrorActionPreference = 'SilentlyContinue' }
function Dbg($m) { if ($debug) { Write-Host "[coach] $m" } }

try {
  $raw = [Console]::In.ReadToEnd()
  if (-not $raw) { Dbg 'no stdin'; exit 0 }
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
  if (-not $url -or -not $key) { Dbg 'missing url/key'; exit 0 }

  $transcript = $hook.transcript_path
  if (-not $transcript -or -not (Test-Path $transcript)) { Dbg 'no transcript'; exit 0 }

  # ── Parse the JSONL transcript ─────────────────────────────────
  # -Encoding UTF8 is REQUIRED: the transcript is UTF-8, but Windows PowerShell
  # 5.1's Get-Content defaults to the ANSI codepage and would corrupt em dashes,
  # accents, arrows, etc. (mojibake) before they ever reach the JSON parser.
  $entries = @()
  foreach ($line in Get-Content -LiteralPath $transcript -Encoding UTF8) {
    if (-not $line.Trim()) { continue }
    try { $entries += ($line | ConvertFrom-Json) } catch { }
  }
  if ($entries.Count -eq 0) { Dbg 'no entries'; exit 0 }

  function Get-Text($content) {
    if ($null -eq $content) { return '' }
    if ($content -is [string]) { return $content }
    $parts = @()
    foreach ($block in $content) {
      if ($block.type -eq 'text' -and $block.text) { $parts += $block.text }
    }
    return ($parts -join "`n")
  }

  function Test-Block($content, $type) {
    if ($content -is [string] -or $null -eq $content) { return $false }
    foreach ($block in $content) { if ($block.type -eq $type) { return $true } }
    return $false
  }

  # ── Find the latest REAL user prompt (text, not a tool result) ──
  $userIdx = -1
  $userText = ''
  for ($i = $entries.Count - 1; $i -ge 0; $i--) {
    $e = $entries[$i]
    if ($e.type -ne 'user' -or -not $e.message) { continue }
    $c = $e.message.content
    if (Test-Block $c 'tool_result') { continue }
    if (Test-Block $c 'tool_use') { continue }
    $t = (Get-Text $c)
    # drop injected standing-instruction / reminder lines from the prompt
    $clean = ($t -split "`r?`n" | Where-Object {
      $_ -notmatch '^\s*Standing instruction:' -and $_ -notmatch '^\s*<'
    }) -join "`n"
    if ($clean.Trim()) { $userText = $clean.Trim(); $userIdx = $i; break }
  }
  if ($userIdx -lt 0) { Dbg 'no user prompt'; exit 0 }

  # ── Dedupe on the prompt's uuid (one capture per turn) ─────────
  $uuid = $entries[$userIdx].uuid
  $stateFile = Join-Path $PSScriptRoot '..\.coach-last'
  if ($uuid -and (Test-Path $stateFile)) {
    $lastUuid = (Get-Content -LiteralPath $stateFile -Raw).Trim()
    if ($lastUuid -eq $uuid) { Dbg 'already sent this turn'; exit 0 }
  }

  # ── Gather ALL assistant text after the prompt = full response ─
  $sb = New-Object System.Text.StringBuilder
  for ($i = $userIdx + 1; $i -lt $entries.Count; $i++) {
    $e = $entries[$i]
    if ($e.type -eq 'assistant' -and $e.message) {
      $t = Get-Text $e.message.content
      if ($t.Trim()) { [void]$sb.AppendLine($t) }
    }
  }
  $assistantText = $sb.ToString()
  if (-not $assistantText.Trim()) { Dbg 'no assistant text'; exit 0 }

  # ── Extract the bounded "English coaching" block ───────────────
  $lines = $assistantText -split "`r?`n"
  $inBlock = $false
  $blockLines = @()
  foreach ($l in $lines) {
    if (-not $inBlock) {
      if ($l -match '(?i)english coaching') { $inBlock = $true }
      continue
    }
    if ($l -match '^\s*---\s*$') { break }                 # end of coaching block
    if ($l -match '^\s*#{1,3}\s+' -and $l -notmatch '(?i)coach') { break }
    $blockLines += $l
  }
  if ($blockLines.Count -eq 0) { Dbg 'no coaching block'; exit 0 }

  # corrected = blockquote lines if present, else the whole block
  $quote = @()
  foreach ($l in $blockLines) { if ($l -match '^\s*>\s?(.*)$') { $quote += $matches[1] } }
  if ($quote.Count -gt 0) { $corrected = ($quote -join "`n").Trim() }
  else { $corrected = (($blockLines -join "`n").Trim()) }

  # tips = list items inside the bounded block only
  $tips = @()
  foreach ($l in $blockLines) {
    if ($l -match '^\s*(?:\d+\.|[-*])\s+(.*)$') {
      $tip = ($matches[1] -replace '\*\*', '').Trim()
      if ($tip) { $tips += $tip }
    }
  }

  Dbg ("original: " + $userText.Substring(0, [Math]::Min(60, $userText.Length)))
  Dbg ("corrected: " + $corrected.Substring(0, [Math]::Min(60, $corrected.Length)))
  Dbg ("tips: " + $tips.Count)
  if ($debug -and $env:COACH_DRYRUN -eq '1') { Dbg 'dry run — not posting'; exit 0 }

  # ── POST to Convex ─────────────────────────────────────────────
  $body = @{
    source    = 'claude-code'
    original  = $userText
    corrected = $corrected
    tips      = @($tips)
  } | ConvertTo-Json -Compress -Depth 5

  # Encode as UTF-8 bytes explicitly. Windows PowerShell 5.1 otherwise sends the
  # body as Windows-1252, which corrupts non-ASCII chars (em dashes, accents)
  # and makes the server's UTF-8 JSON parse fail with a 400.
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  Invoke-RestMethod -Method Post -Uri $url `
    -Headers @{ Authorization = "Bearer $key" } `
    -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 8 | Out-Null

  if ($uuid) { Set-Content -LiteralPath $stateFile -Value $uuid -NoNewline }
  Dbg 'posted ok'
} catch {
  Dbg ("error: " + $_.Exception.Message)
}

exit 0
