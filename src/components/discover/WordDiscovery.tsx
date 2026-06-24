"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";
import { SuggestionCard } from "./SuggestionCard";

interface Suggestion {
  term: string;
  translation: string;
  definition: string;
  exampleSentence: string;
  type: string;
  difficulty: number;
  connection?: string;
}

export function WordDiscovery() {
  const generateSuggestions = useAction(api.ai.suggest.generateSuggestions);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const result = await generateSuggestions({});
      setSuggestions(result);
    } catch (error) {
      console.error("Error generating suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="rounded-lg border border-primary/15 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">
            Sugerencias personalizadas
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          La IA analiza tus últimos conceptos aprendidos y te propone palabras
          nuevas conectadas con ellos, al nivel adecuado para ti.
        </p>
      </div>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-primary hover:bg-blue-dark gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generando...
          </>
        ) : (
          <>
            <Lightbulb className="h-4 w-4" />
            Sugerir Palabras
          </>
        )}
      </Button>

      {/* Results */}
      {loading && (
        <div className="text-center py-8 text-muted-foreground">
          <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin opacity-50" />
          <p className="text-sm">Buscando palabras conectadas con tu progreso...</p>
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {suggestions.length} sugerencias basadas en lo que has aprendido. Haz
            clic para escribir una entrada con la palabra.
          </p>
          {suggestions.map((suggestion) => (
            <SuggestionCard key={suggestion.term} suggestion={suggestion} />
          ))}

          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full gap-2"
          >
            <Lightbulb className="h-4 w-4" />
            Sugerir Mas Palabras
          </Button>
        </div>
      )}

      {!loading && hasSearched && suggestions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">
            Aún no hay sugerencias. Escribe algunas entradas para que la IA
            aprenda de ti y pueda recomendarte palabras conectadas con lo que
            estudias.
          </p>
        </div>
      )}

      {!hasSearched && (
        <div className="text-center py-12 text-muted-foreground">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">
            Pulsa el botón para descubrir palabras nuevas basadas en tus últimos
            conceptos.
          </p>
          <p className="text-xs mt-1">
            Las palabras que ya conoces seran excluidas automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}
