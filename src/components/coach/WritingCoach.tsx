"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewPanel } from "./ReviewPanel";
import { SampleList } from "./SampleList";
import { GraduationCap, Sparkles, Loader2, FileText, Inbox } from "lucide-react";

type RunStatus =
  | { status: "no_samples" }
  | { status: "no_provider" }
  | { status: "error" }
  | { status: "done"; reviewId: string; sampleCount: number };

const STATUS_MESSAGE: Record<RunStatus["status"], string> = {
  no_samples: "No hay textos nuevos para analizar todavía.",
  no_provider: "No hay un proveedor de IA configurado en el servidor.",
  error: "No se pudo completar el análisis. Inténtalo de nuevo más tarde.",
  done: "",
};

export function WritingCoach() {
  const stats = useQuery(api.coach.getSampleStats);
  const latestReview = useQuery(api.coach.getLatestReview);
  const samples = useQuery(api.coach.listSamples);
  const runReview = useAction(api.ai.coachAnalysis.runReview);

  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const unanalyzed = stats?.unanalyzed ?? 0;

  async function handleRun() {
    setRunning(true);
    setMessage(null);
    try {
      const result = (await runReview()) as RunStatus;
      if (result.status === "done") {
        setMessage(
          `Análisis completo: ${result.sampleCount} ${
            result.sampleCount === 1 ? "texto analizado" : "textos analizados"
          }.`,
        );
      } else {
        setMessage(STATUS_MESSAGE[result.status]);
      }
    } catch {
      setMessage(STATUS_MESSAGE.error);
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <TopBar title="Escritura" />
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              Entrenador de Escritura
            </h1>
            <p className="text-sm text-muted-foreground">
              Analiza tus correcciones para descubrir patrones de error y temas
              que estudiar.
            </p>
          </div>
          <Button
            onClick={handleRun}
            disabled={running || unanalyzed === 0}
            className="bg-primary hover:bg-blue-dark text-white"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {running ? "Analizando…" : "Analizar escritura"}
          </Button>
        </div>

        {/* Stat chips */}
        {stats === undefined ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xl font-bold leading-none">
                    {stats.total}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Textos capturados
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <Inbox className="h-5 w-5 text-highlight" />
                <div>
                  <p className="text-xl font-bold leading-none">
                    {stats.unanalyzed}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sin analizar
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {message && (
          <p className="text-sm text-muted-foreground rounded-lg bg-secondary px-3 py-2">
            {message}
          </p>
        )}

        {/* Latest review */}
        {latestReview === undefined ? (
          <Skeleton className="h-48 w-full" />
        ) : latestReview === null ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aún no has hecho ninguna revisión. Captura algunos textos y pulsa
              <span className="font-medium text-foreground">
                {" "}
                «Analizar escritura»
              </span>{" "}
              para ver tus patrones de error.
            </CardContent>
          </Card>
        ) : (
          <ReviewPanel review={latestReview} />
        )}

        {/* Recent captures */}
        {samples === undefined ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <SampleList samples={samples} />
        )}
      </div>
    </>
  );
}
