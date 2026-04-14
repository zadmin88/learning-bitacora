"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConceptBadge } from "./ConceptBadge";
import { CorrectionHighlight } from "./CorrectionHighlight";
import { formatDistanceToNow, format } from "date-fns";
import { ChevronDown, ChevronUp, BookOpen, CheckCircle } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface Entry {
  _id: Id<"entries">;
  content: string;
  mood?: string;
  praise?: string;
  overallLevel?: string;
  corrections?: any;
  conceptCount: number;
  createdAt: number;
}

export function EntryCard({ entry }: { entry: Entry }) {
  const [expanded, setExpanded] = useState(false);
  const concepts = useQuery(
    api.concepts.listByEntry,
    expanded ? { entryId: entry._id } : "skip"
  );

  const corrections = entry.corrections as
    | Array<{
        original: string;
        corrected: string;
        explanation: string;
        severity: "minor" | "moderate" | "important";
      }>
    | undefined;

  return (
    <Card className="animate-fade-in transition-all hover:shadow-md">
      <CardContent className="pt-4 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{format(entry.createdAt, "MMM d, yyyy")}</span>
            <span>•</span>
            <span>
              {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
            </span>
            {entry.mood && <span>{entry.mood}</span>}
          </div>
          <div className="flex items-center gap-2">
            {entry.overallLevel && (
              <Badge variant="outline" className="text-xs capitalize">
                {entry.overallLevel}
              </Badge>
            )}
            {entry.conceptCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                {entry.conceptCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <p
          className={`text-sm leading-relaxed whitespace-pre-wrap ${
            expanded ? "" : "line-clamp-3"
          }`}
        >
          {entry.content}
        </p>

        {/* Praise */}
        {entry.praise && expanded && (
          <div className="mt-3 p-2 bg-sage/10 rounded-md text-sm text-sage-dark flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{entry.praise}</span>
          </div>
        )}

        {/* Corrections */}
        {expanded && corrections && corrections.length > 0 && (
          <div className="mt-3">
            <CorrectionHighlight corrections={corrections} />
          </div>
        )}

        {/* Concepts */}
        {expanded && concepts && concepts.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Extracted Concepts
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {concepts.map((concept) => (
                <ConceptBadge
                  key={concept._id}
                  type={concept.type}
                  term={concept.term}
                />
              ))}
            </div>
          </div>
        )}

        {/* Expand/collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-terracotta hover:underline flex items-center gap-1"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show more <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      </CardContent>
    </Card>
  );
}
