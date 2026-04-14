"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  severity: "minor" | "moderate" | "important";
}

const severityColors = {
  minor: "bg-yellow-100 border-yellow-300 text-yellow-800",
  moderate: "bg-orange-100 border-orange-300 text-orange-800",
  important: "bg-red-100 border-red-300 text-red-800",
};

export function CorrectionHighlight({
  corrections,
}: {
  corrections: Correction[];
}) {
  if (!corrections || corrections.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">
        Writing Feedback
      </h4>
      {corrections.map((correction, i) => (
        <div
          key={i}
          className={cn(
            "text-sm p-2 rounded-md border",
            severityColors[correction.severity] || severityColors.minor
          )}
        >
          <div className="flex items-start gap-2">
            <span className="line-through opacity-60">
              {correction.original}
            </span>
            <span>→</span>
            <span className="font-medium">{correction.corrected}</span>
          </div>
          <p className="text-xs mt-1 opacity-80">{correction.explanation}</p>
        </div>
      ))}
    </div>
  );
}
