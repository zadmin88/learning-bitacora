"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Copy, Check, RefreshCw } from "lucide-react";

function ingestUrl(): string {
  const base = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
  return base.replace(".convex.cloud", ".convex.site") + "/coach/ingest";
}

export function IngestKeyCard() {
  const keyInfo = useQuery(api.coach.getKey);
  const generateKey = useMutation(api.coach.generateKey);

  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState<"key" | "url" | null>(null);
  const [working, setWorking] = useState(false);

  const hasKey = keyInfo !== null && keyInfo !== undefined;
  // The full key value is only returned right after (re)generating it.
  const displayKey = revealed ?? (hasKey ? "coach_••••••••••••••••••••••••" : "");

  async function handleGenerate() {
    setWorking(true);
    try {
      const key = await generateKey();
      setRevealed(key);
    } finally {
      setWorking(false);
    }
  }

  async function copy(value: string, which: "key" | "url") {
    await navigator.clipboard.writeText(value);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Entrenador de Escritura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Genera una clave de ingestión para enviar tus prompts y correcciones
          desde Claude Code o un cliente MCP. Pégala en la variable de entorno{" "}
          <code className="text-xs bg-secondary px-1 py-0.5 rounded">
            COACH_API_KEY
          </code>
          .
        </p>

        {/* Ingest URL */}
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">
            URL de ingestión (COACH_INGEST_URL)
          </label>
          <div className="flex gap-2">
            <Input readOnly value={ingestUrl()} className="font-mono text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copy(ingestUrl(), "url")}
              aria-label="Copiar URL"
            >
              {copied === "url" ? (
                <Check className="h-4 w-4 text-emerald" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Key */}
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Clave (COACH_API_KEY)</label>
          {keyInfo === undefined ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <div className="flex gap-2">
              <Input
                readOnly
                value={displayKey}
                placeholder="Aún no has generado una clave"
                className="font-mono text-xs"
              />
              {revealed && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(revealed, "key")}
                  aria-label="Copiar clave"
                >
                  {copied === "key" ? (
                    <Check className="h-4 w-4 text-emerald" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          )}
          {revealed && (
            <p className="text-xs text-amber-streak">
              Guarda esta clave ahora — por seguridad no se vuelve a mostrar.
            </p>
          )}
        </div>

        <Button
          variant="outline"
          onClick={handleGenerate}
          disabled={working}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${working ? "animate-spin" : ""}`} />
          {hasKey ? "Regenerar clave" : "Generar clave"}
        </Button>
        {hasKey && (
          <p className="text-xs text-muted-foreground">
            Regenerar invalida la clave anterior.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
