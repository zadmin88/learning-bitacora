"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { EntryCard } from "./EntryCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PenLine } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format, isToday, isYesterday } from "date-fns";

function getDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d, yyyy");
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
        <h3 className="font-display text-lg font-semibold mb-2">
          No entries yet
        </h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
          Start writing about what you&apos;re learning in English. Each entry
          becomes a source of personalized review material.
        </p>
        <Link href="/journal/new">
          <Button className="bg-terracotta hover:bg-terracotta-dark">
            Write Your First Entry
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
          <h3 className="font-display text-sm font-semibold text-muted-foreground mb-3 sticky top-14 bg-background/80 backdrop-blur-sm py-1 z-10">
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
