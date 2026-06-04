"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { EntryCard } from "./EntryCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PenLine } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";

function getDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  if (isToday(date)) return "Hoy";
  if (isYesterday(date)) return "Ayer";
  return format(date, "EEEE, d 'de' MMMM yyyy", { locale: es });
}

export function EntryTimeline() {
  const entries = useQuery(api.entries.list);

  if (entries === undefined) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <PenLine className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          Aún no hay entradas
        </h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
          Comienza a escribir sobre lo que estás aprendiendo en inglés. Cada entrada
          se convierte en material de repaso personalizado.
        </p>
        <Link href="/journal/new">
          <Button className="bg-primary hover:bg-blue-dark">
            Escribe Tu Primera Entrada
          </Button>
        </Link>
      </div>
    );
  }

  // Group entries by date
  const grouped: Record<string, typeof entries> = {};
  for (const entry of entries) {
    const label = getDateLabel(entry.createdAt);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(entry);
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([dateLabel, dateEntries]) => (
        <div key={dateLabel}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-14 bg-background/80 backdrop-blur-sm py-1 z-10">
            {dateLabel}
          </h3>
          <div className="space-y-3">
            {dateEntries.map((entry) => (
              <EntryCard key={entry._id} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
