"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenLine } from "lucide-react";

interface Suggestion {
  term: string;
  translation: string;
  definition: string;
  exampleSentence: string;
  type: string;
  difficulty: number;
}

const TYPE_COLORS: Record<string, string> = {
  vocabulary: "bg-blue-100 text-blue-700",
  phrase: "bg-green-100 text-green-700",
  idiom: "bg-purple-100 text-purple-700",
};

export function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const router = useRouter();

  const handleWriteAbout = () => {
    const content = `${suggestion.term}: ${suggestion.definition}\n\n"${suggestion.exampleSentence}"`;
    const params = new URLSearchParams({
      term: suggestion.term,
      definition: suggestion.definition,
      example: suggestion.exampleSentence,
      content,
    });
    router.push(`/journal/new?${params.toString()}`);
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {suggestion.term}
            </h3>
            <p className="text-sm text-muted-foreground">
              {suggestion.translation}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="secondary"
              className={TYPE_COLORS[suggestion.type] || "bg-gray-100 text-gray-700"}
            >
              {suggestion.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {"●".repeat(suggestion.difficulty)}
              {"○".repeat(5 - suggestion.difficulty)}
            </span>
          </div>
        </div>

        <p className="text-sm text-foreground mb-2">{suggestion.definition}</p>
        <p className="text-sm text-muted-foreground italic mb-4">
          &ldquo;{suggestion.exampleSentence}&rdquo;
        </p>

        <Button
          onClick={handleWriteAbout}
          variant="outline"
          size="sm"
          className="gap-2 border-terracotta/30 text-terracotta hover:bg-terracotta/5"
        >
          <PenLine className="h-3.5 w-3.5" />
          Escribir sobre esta palabra
        </Button>
      </CardContent>
    </Card>
  );
}
