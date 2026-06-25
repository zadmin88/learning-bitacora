# Writing Coach MCP server

A tiny [MCP](https://modelcontextprotocol.io) server that lets MCP-capable
clients (Claude Desktop, Cursor, …) push a user's text + its English correction
into the Bitácora **Writing Coach**. It exposes one tool,
`submit_writing_sample`, which POSTs to the app's Convex `/coach/ingest`
endpoint.

> In **Claude Code**, capture is handled automatically by the
> `Stop` hook (`.claude/hooks/capture-writing.ps1`) — you don't need this
> server there. Use this for **other** apps.

## 1. Install

```sh
cd mcp/writing-coach
npm install
```

## 2. Get your credentials

In the Bitácora app: **Ajustes → Entrenador de Escritura**. Copy the
**ingestion URL** and generate a **key**. You'll set them as env vars:

- `COACH_INGEST_URL` → `https://<deployment>.convex.site/coach/ingest`
- `COACH_API_KEY` → `coach_…`

## 3. Register the server

### Claude Code (this repo)

Already wired via [`.mcp.json`](../../.mcp.json). It reads `COACH_INGEST_URL`
and `COACH_API_KEY` from your environment, so export them before launching
Claude Code (no secrets are committed).

### Claude Desktop

Add to `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "writing-coach": {
      "command": "node",
      "args": ["/absolute/path/to/learning-bitacora/mcp/writing-coach/server.mjs"],
      "env": {
        "COACH_INGEST_URL": "https://YOUR-DEPLOYMENT.convex.site/coach/ingest",
        "COACH_API_KEY": "coach_xxxxxxxx"
      }
    }
  }
}
```

Cursor uses the same shape in its MCP settings.

## 4. Make the model actually call it

Unlike the Claude Code hook (deterministic), MCP capture relies on the model
choosing to call the tool. Add a project/style instruction in the client, e.g.:

> When you correct the user's English, after giving the correction call the
> `submit_writing_sample` tool with their original text, the corrected version,
> and your tips.

## Test it

With the env vars set:

```sh
COACH_INGEST_URL=… COACH_API_KEY=… node server.mjs
```

Then call `submit_writing_sample` from your MCP client and confirm a new row
appears in the app's **Escritura** page.
