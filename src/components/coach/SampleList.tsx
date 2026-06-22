"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Doc } from "../../../convex/_generated/dataModel";
import { History, ArrowRight } from "lucide-react";

const SOURCE_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  "claude-desktop": "Claude Desktop",
  cursor: "Cursor",
  mcp: "MCP",
};

function timeAgo(ts: number): string {
  return new Date(ts).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SampleList({ samples }: { samples: Doc<"writingSamples">[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          Textos recientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {samples.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Todavía no se ha capturado ningún texto. Configura el hook de Claude
            Code o el servidor MCP desde <span className="font-medium">Ajustes</span>.
          </p>
        ) : (
          <ul className="space-y-3">
            {samples.map((s) => (
              <li
                key={s._id}
                className="rounded-lg border border-border p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-xs">
                    {SOURCE_LABELS[s.source] ?? s.source}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(s.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {s.original}
                </p>
                {s.corrected && s.corrected !== s.original && (
                  <p className="text-sm flex items-start gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald" />
                    <span className="line-clamp-3">{s.corrected}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
