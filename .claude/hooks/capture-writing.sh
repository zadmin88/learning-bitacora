#!/usr/bin/env bash
# capture-writing.sh — Claude Code "Stop" hook for the Writing Coach (macOS/Linux).
#
# POSIX/Bash port of capture-writing.ps1. On each completed turn it reads the
# session transcript, extracts the latest user prompt and the "English coaching"
# correction produced by the UserPromptSubmit standing instruction, and POSTs
# them to the Convex /coach/ingest endpoint. It fails silently so it can never
# block the session.
#
# Requirements: jq and curl (curl ships with macOS; install jq via `brew install
# jq` or your package manager).
#
# Config (real env vars or a gitignored .claude/.coach-env file):
#   COACH_INGEST_URL = https://<deployment>.convex.site/coach/ingest
#   COACH_API_KEY    = coach_xxxxxxxx   (generate it in the app under Ajustes)
#
# Set COACH_DEBUG=1 to print diagnostics instead of failing silently, and
# COACH_DRYRUN=1 (with COACH_DEBUG=1) to parse without POSTing.
#
# Register it in .claude/settings(.local).json:
#   "Stop": [{ "hooks": [{ "type": "command",
#     "command": "bash", "args": [".claude/hooks/capture-writing.sh"],
#     "timeout": 15 }] }]
# (Also run `chmod +x .claude/hooks/capture-writing.sh`.)

set -u

DEBUG="${COACH_DEBUG:-0}"
dbg() { [ "$DEBUG" = "1" ] && printf '[coach] %s\n' "$1" >&2 || true; }

# Never break the session: always exit 0, and stay quiet unless debugging.
trap 'exit 0' EXIT
[ "$DEBUG" = "1" ] || exec 2>/dev/null

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v jq   >/dev/null 2>&1 || { dbg "jq not found";   exit 0; }
command -v curl >/dev/null 2>&1 || { dbg "curl not found"; exit 0; }

# ── Read the hook payload from stdin ───────────────────────────────
raw="$(cat)"
[ -n "$raw" ] || { dbg "no stdin"; exit 0; }

transcript="$(printf '%s' "$raw" | jq -r '.transcript_path // empty' 2>/dev/null)"
[ -n "${transcript:-}" ] && [ -f "$transcript" ] || { dbg "no transcript"; exit 0; }

# ── Load config (env first, then .claude/.coach-env) ───────────────
url="${COACH_INGEST_URL:-}"
key="${COACH_API_KEY:-}"
envfile="$SCRIPT_DIR/../.coach-env"
geti() { sed -n -E "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*(.+)$/\1/p" "$envfile" | head -n1; }
if { [ -z "$url" ] || [ -z "$key" ]; } && [ -f "$envfile" ]; then
  [ -z "$url" ] && url="$(geti COACH_INGEST_URL)"
  [ -z "$key" ] && key="$(geti COACH_API_KEY)"
fi
trim() { printf '%s' "$1" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }
url="$(trim "$url")"
key="$(trim "$key")"
[ -n "$url" ] && [ -n "$key" ] || { dbg "missing url/key"; exit 0; }

# ── Parse the transcript + extract the coaching block (all in jq) ──
# Input is the JSONL transcript slurped (-s) into an array of entries.
# Output is a compact JSON object {source,original,corrected,tips,uuid}, or
# nothing when there is no real prompt or no "English coaching" block.
JQ_PROG="$(cat <<'JQ'
def text_of($c):
  if ($c|type)=="string" then $c
  else ([ $c[]? | select(.type=="text") | .text ] | join("\n")) end;
def has_block($c; $t): ($c|type)=="array" and (any($c[]?; .type==$t));
def trim: gsub("^\\s+";"") | gsub("\\s+$";"");

. as $e
# Latest REAL user prompt (text, not a tool_result / tool_use entry).
| [ range(0; ($e|length)) as $i
    | $e[$i] as $row
    | select($row.type=="user" and $row.message != null)
    | select((has_block($row.message.content; "tool_result")|not)
             and (has_block($row.message.content; "tool_use")|not))
    | { i: $i,
        clean: ( text_of($row.message.content)
                 | split("\n")
                 # drop injected standing-instruction / reminder lines
                 | map(select((test("^\\s*Standing instruction:")|not)
                              and (test("^\\s*<")|not)))
                 | join("\n") | trim ),
        uuid: ($row.uuid // "") }
    | select(.clean != "")
  ] | last as $u
| if $u == null then empty
  else
    # All assistant text after the prompt = the full response.
    ( [ range($u.i + 1; ($e|length)) as $j
        | $e[$j] as $row
        | select($row.type=="assistant" and $row.message != null)
        | text_of($row.message.content) ]
      | map(select(. != "")) | join("\n") ) as $assistant
    # Bounded "English coaching" block: start at the heading, stop at a `---`
    # rule or the next non-coach heading.
    | ( ($assistant | split("\n"))
        | reduce .[] as $l ({inBlock:false, done:false, acc:[]};
            if .done then .
            elif (.inBlock|not) then
              (if ($l|test("english coaching"; "i")) then .inBlock=true else . end)
            else
              if ($l|test("^\\s*---\\s*$")) then .done=true
              elif (($l|test("^\\s*#{1,3}\\s+")) and (($l|test("coach"; "i"))|not)) then .done=true
              else .acc += [$l] end
            end)
        | .acc ) as $block
    | if ($block|length) == 0 then empty
      else
        # corrected = blockquote lines if present, else the whole block
        ( [ $block[] | select(test("^\\s*>\\s?")) | capture("^\\s*>\\s?(?<q>.*)$") | .q ] ) as $quotes
        | ( if ($quotes|length) > 0 then ($quotes|join("\n")) else ($block|join("\n")) end | trim ) as $corrected
        # tips = list items inside the bounded block, with **bold** stripped
        | ( [ $block[]
              | select(test("^\\s*(?:[0-9]+\\.|[-*])\\s+"))
              | capture("^\\s*(?:[0-9]+\\.|[-*])\\s+(?<t>.*)$")
              | (.t | gsub("\\*\\*"; "")) | trim
              | select(. != "") ] ) as $tips
        | { source: "claude-code", original: $u.clean,
            corrected: $corrected, tips: $tips, uuid: $u.uuid }
      end
  end
JQ
)"

result="$(jq -s -c "$JQ_PROG" "$transcript" 2>/dev/null || true)"
[ -n "${result:-}" ] || { dbg "no prompt / no coaching block"; exit 0; }

uuid="$(printf '%s' "$result" | jq -r '.uuid // ""')"
body="$(printf '%s' "$result" | jq -c 'del(.uuid)')"

# ── Dedupe on the prompt's uuid (one capture per turn) ─────────────
statefile="$SCRIPT_DIR/../.coach-last"
if [ -n "$uuid" ] && [ -f "$statefile" ]; then
  last="$(tr -d '[:space:]' < "$statefile")"
  [ "$last" = "$uuid" ] && { dbg "already sent this turn"; exit 0; }
fi

if [ "$DEBUG" = "1" ]; then
  dbg "original: $(printf '%s' "$result" | jq -r '.original' | cut -c1-60)"
  dbg "corrected: $(printf '%s' "$result" | jq -r '.corrected' | cut -c1-60)"
  dbg "tips: $(printf '%s' "$result" | jq -r '.tips | length')"
  [ "${COACH_DRYRUN:-0}" = "1" ] && { dbg "dry run — not posting"; exit 0; }
fi

# ── POST to Convex (UTF-8 is preserved as-is by curl) ──────────────
http="$(curl -sS -m 8 -o /dev/null -w '%{http_code}' \
  -X POST "$url" \
  -H "Authorization: Bearer $key" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary "$body" 2>/dev/null)" || { dbg "curl failed"; exit 0; }

dbg "http $http"
if [ "$http" = "200" ] && [ -n "$uuid" ]; then
  printf '%s' "$uuid" > "$statefile"
  dbg "posted ok"
fi

exit 0
