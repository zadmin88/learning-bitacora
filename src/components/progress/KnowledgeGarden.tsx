"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KnowledgeGardenProps {
  breakdown: {
    byState: Record<string, number>;
  };
}

const stateConfig = [
  { key: "new", label: "Seeds", emoji: "🌱", color: "bg-amber-100 text-amber-700" },
  { key: "learning", label: "Sprouts", emoji: "🌿", color: "bg-green-100 text-green-700" },
  { key: "review", label: "Flowers", emoji: "🌸", color: "bg-pink-100 text-pink-700" },
  { key: "relearning", label: "Replanting", emoji: "🔄", color: "bg-orange-100 text-orange-700" },
];

export function KnowledgeGarden({ breakdown }: KnowledgeGardenProps) {
  const total = Object.values(breakdown.byState).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">
          Knowledge Garden
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Plant your first seeds by writing journal entries!
          </p>
        ) : (
          <div className="space-y-4">
            {/* Visual garden */}
            <div className="flex flex-wrap gap-1 p-4 bg-muted/50 rounded-lg min-h-[80px]">
              {stateConfig.map(({ key, emoji }) =>
                Array(breakdown.byState[key] || 0)
                  .fill(0)
                  .map((_, i) => (
                    <span
                      key={`${key}-${i}`}
                      className="text-lg transition-transform hover:scale-125"
                      title={`${key} concept`}
                    >
                      {emoji}
                    </span>
                  ))
              )}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2">
              {stateConfig.map(({ key, label, emoji, color }) => (
                <div
                  key={key}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${color}`}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{label}</span>
                  <span className="ml-auto font-bold">
                    {breakdown.byState[key] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
