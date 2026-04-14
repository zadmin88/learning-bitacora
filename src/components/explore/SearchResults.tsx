"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface SearchResult {
  answer: string;
  entries: Array<{
    _id: string;
    content: string;
    createdAt: number;
    conceptCount: number;
  }>;
}

export function SearchResults({ result }: { result: SearchResult }) {
  return (
    <div className="space-y-6">
      {/* AI Answer */}
      <Card className="border-terracotta/20 bg-terracotta/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-terracotta mt-0.5" />
            <span className="text-sm font-medium text-terracotta">
              AI Answer
            </span>
          </div>
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
            {result.answer}
          </div>
        </CardContent>
      </Card>

      {/* Source entries */}
      {result.entries.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Related Entries ({result.entries.length})
          </h3>
          <div className="space-y-2">
            {result.entries.map((entry) => (
              <Card key={entry._id} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-3 pb-3">
                  <p className="text-sm line-clamp-2">{entry.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{format(entry.createdAt, "MMM d, yyyy")}</span>
                    {entry.conceptCount > 0 && (
                      <span className="flex items-center gap-1 text-sage">
                        <BookOpen className="h-3 w-3" />
                        {entry.conceptCount} concepts
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
