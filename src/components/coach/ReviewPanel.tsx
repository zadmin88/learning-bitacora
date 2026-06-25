"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Doc } from "../../../convex/_generated/dataModel";
import { Sparkles, TrendingUp, BookMarked } from "lucide-react";

export function ReviewPanel({ review }: { review: Doc<"writingReviews"> }) {
  const patterns = [...review.patterns].sort(
    (a, b) => b.frequency - a.frequency,
  );
  const chartData = patterns.map((p) => ({
    label: p.category,
    count: p.frequency,
  }));
  const reviewDate = new Date(review.createdAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Resumen de tu escritura
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {review.sampleCount} textos · {reviewDate}
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{review.summary}</p>
        </CardContent>
      </Card>

      {/* Error patterns */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-highlight" />
              Patrones de error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 44)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-3">
              {patterns.map((p, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{p.category}</span>
                    <Badge variant="secondary" className="text-xs">
                      {p.frequency}×
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                  {p.examples.length > 0 && (
                    <ul className="space-y-1">
                      {p.examples.map((ex, j) => (
                        <li
                          key={j}
                          className="text-xs font-mono text-foreground/80 bg-secondary rounded px-2 py-1"
                        >
                          {ex}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Study topics */}
      {review.studyTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-emerald" />
              Temas para estudiar
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Añadidos a tu cola de repaso — aparecerán en la pestaña{" "}
              <span className="font-medium">Escritura</span> de Repasar.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {review.studyTopics.map((t, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <p className="font-medium text-sm">{t.topic}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t.why}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
