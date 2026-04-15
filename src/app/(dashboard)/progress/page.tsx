"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { TopBar } from "@/components/layout/TopBar";
import { StatsOverview } from "@/components/progress/StatsOverview";
import { ReviewChart } from "@/components/progress/ReviewChart";
import { KnowledgeGarden } from "@/components/progress/KnowledgeGarden";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProgressPage() {
  const stats = useQuery(api.stats.getOverview);
  const reviewHistory = useQuery(api.stats.getReviewHistory);
  const conceptBreakdown = useQuery(api.stats.getConceptBreakdown);

  return (
    <>
      <TopBar title="Progreso" />
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="font-display text-2xl font-bold">Tu Progreso</h1>

        {stats === undefined ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <StatsOverview stats={stats} />
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {reviewHistory === undefined ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ReviewChart data={reviewHistory} />
          )}

          {conceptBreakdown === undefined ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <KnowledgeGarden breakdown={conceptBreakdown} />
          )}
        </div>
      </div>
    </>
  );
}
