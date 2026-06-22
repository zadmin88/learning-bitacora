import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

// Writing Coach ingestion endpoint. Called from outside the browser session
// (Claude Code Stop hook, MCP clients) so it authenticates with a per-user
// ingest key sent as `Authorization: Bearer <key>` rather than an auth cookie.
http.route({
  path: "/coach/ingest",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const key = (req.headers.get("Authorization") ?? "").replace(
      /^Bearer\s+/i,
      "",
    );

    let body: {
      source?: string;
      original?: string;
      corrected?: string;
      tips?: string[];
    };
    try {
      body = await req.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (!key || !body?.original) {
      return new Response("Missing key or original text", { status: 400 });
    }

    const ok: boolean = await ctx.runMutation(internal.coach.resolveKeyAndAdd, {
      key,
      source: body.source ?? "unknown",
      original: body.original,
      corrected: body.corrected,
      tips: Array.isArray(body.tips) ? body.tips : undefined,
    });

    return new Response(JSON.stringify({ ok }), {
      status: ok ? 200 : 401,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
