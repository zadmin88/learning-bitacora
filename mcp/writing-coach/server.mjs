#!/usr/bin/env node
// Writing Coach MCP server.
//
// Exposes a single tool, `submit_writing_sample`, that MCP-capable clients
// (Claude Desktop, Cursor, …) can call to ship a user's text and its English
// correction into the Bitácora Writing Coach. It POSTs to the same Convex
// /coach/ingest endpoint used by the Claude Code Stop hook.
//
// Required env vars:
//   COACH_INGEST_URL = https://<deployment>.convex.site/coach/ingest
//   COACH_API_KEY    = coach_xxxxxxxx  (generate it in the app under Ajustes)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const INGEST_URL = process.env.COACH_INGEST_URL;
const API_KEY = process.env.COACH_API_KEY;

const server = new McpServer({ name: "writing-coach", version: "1.0.0" });

server.registerTool(
  "submit_writing_sample",
  {
    title: "Submit writing sample",
    description:
      "Save a user's original text and its English correction to the Writing " +
      "Coach so error patterns can be analyzed later. Call this right after you " +
      "give the user an English correction of something they wrote.",
    inputSchema: {
      original: z
        .string()
        .describe("The user's original text, verbatim (before correction)."),
      corrected: z
        .string()
        .describe("The corrected, more natural English version."),
      tips: z
        .array(z.string())
        .optional()
        .describe("1-3 short tips for improving the writing."),
      source: z
        .string()
        .optional()
        .describe("Originating app, e.g. 'claude-desktop' or 'cursor'."),
    },
  },
  async ({ original, corrected, tips, source }) => {
    if (!INGEST_URL || !API_KEY) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "Writing Coach is not configured (missing COACH_INGEST_URL or COACH_API_KEY).",
          },
        ],
      };
    }

    try {
      const res = await fetch(INGEST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          source: source ?? "mcp",
          original,
          corrected,
          tips,
        }),
      });

      if (!res.ok) {
        return {
          isError: true,
          content: [
            { type: "text", text: `Ingest failed with status ${res.status}.` },
          ],
        };
      }

      return {
        content: [{ type: "text", text: "Saved to Writing Coach." }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Ingest error: ${String(err)}` }],
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
