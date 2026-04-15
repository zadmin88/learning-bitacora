"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Brain,
  Target,
  Trophy,
  Flame,
  CheckCircle,
} from "lucide-react";

interface StatsOverviewProps {
  stats: {
    totalEntries: number;
    totalConcepts: number;
    masteredConcepts: number;
    totalReviews: number;
    accuracy: number;
    streak: number;
  };
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const items = [
    {
      label: "Entradas de Diario",
      value: stats.totalEntries,
      icon: BookOpen,
      color: "text-terracotta",
    },
    {
      label: "Conceptos Aprendidos",
      value: stats.totalConcepts,
      icon: Brain,
      color: "text-sage",
    },
    {
      label: "Dominados",
      value: stats.masteredConcepts,
      icon: Trophy,
      color: "text-amber-500",
    },
    {
      label: "Repasos Totales",
      value: stats.totalReviews,
      icon: Target,
      color: "text-blue-500",
    },
    {
      label: "Precisión",
      value: `${stats.accuracy}%`,
      icon: CheckCircle,
      color: "text-sage",
    },
    {
      label: "Días de Racha",
      value: stats.streak,
      icon: Flame,
      color: "text-terracotta",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <span className="text-xs text-muted-foreground">
                {item.label}
              </span>
            </div>
            <p className="text-3xl font-bold">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
