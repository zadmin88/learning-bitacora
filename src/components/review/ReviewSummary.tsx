"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ReviewSummaryProps {
  totalReviewed: number;
  correctCount: number;
  incorrectCount: number;
  startTime: number;
}

export function ReviewSummary({
  totalReviewed,
  correctCount,
  incorrectCount,
  startTime,
}: ReviewSummaryProps) {
  const accuracy =
    totalReviewed > 0 ? Math.round((correctCount / totalReviewed) * 100) : 0;
  const duration = Math.round((Date.now() - startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <Trophy className="h-12 w-12 text-primary mx-auto mb-2" />
        <CardTitle className="text-2xl">¡Repaso Completado!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-emerald">
              <CheckCircle className="h-4 w-4" />
              <span className="text-2xl font-bold">{correctCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Correctas</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-red-500">
              <XCircle className="h-4 w-4" />
              <span className="text-2xl font-bold">{incorrectCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Incorrectas</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-2xl font-bold">
                {minutes > 0 ? `${minutes}m` : `${seconds}s`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Tiempo</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{accuracy}%</p>
          <p className="text-sm text-muted-foreground">Precisión</p>
        </div>

        <p className="text-sm text-center text-muted-foreground">
          {accuracy >= 80
            ? "¡Excelente trabajo! Tu memoria se está fortaleciendo."
            : accuracy >= 50
              ? "¡Buen esfuerzo! Sigue repasando para fortalecer estos conceptos."
              : "No te preocupes — la repetición espaciada hará que los veas pronto de nuevo."}
        </p>

        <div className="flex gap-2 pt-2">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              Inicio
            </Button>
          </Link>
          <Link href="/journal/new" className="flex-1">
            <Button className="w-full bg-primary hover:bg-blue-dark">
              Escribir Entrada
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
