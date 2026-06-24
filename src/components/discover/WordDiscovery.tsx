"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Loader2 } from "lucide-react";
import { SuggestionCard } from "./SuggestionCard";

interface Suggestion {
  term: string;
  translation: string;
  definition: string;
  exampleSentence: string;
  type: string;
  difficulty: number;
}

const TOPICS = [
  { value: "travel", label: "Viajes" },
  { value: "work", label: "Trabajo" },
  { value: "food", label: "Comida" },
  { value: "technology", label: "Tecnologia" },
  { value: "emotions", label: "Emociones" },
  { value: "health", label: "Salud" },
  { value: "entertainment", label: "Entretenimiento" },
  { value: "business", label: "Negocios" },
  { value: "nature", label: "Naturaleza" },
  { value: "general", label: "General" },
];

const DIFFICULTIES = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
];

export function WordDiscovery() {
  const generateSuggestions = useAction(api.ai.suggest.generateSuggestions);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState("intermediate");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleGenerate = async () => {
    if (!selectedTopic) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const result = await generateSuggestions({
        topic: selectedTopic,
        difficulty: selectedDifficulty,
      });
      setSuggestions(result);
    } catch (error) {
      console.error("Error generating suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Topic selector */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Tema</h3>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((topic) => (
            <Badge
              key={topic.value}
              variant={selectedTopic === topic.value ? "default" : "outline"}
              className={`cursor-pointer text-sm px-3 py-1.5 transition-colors ${
                selectedTopic === topic.value
                  ? "bg-primary hover:bg-blue-dark text-white"
                  : "hover:bg-secondary"
              }`}
              onClick={() => setSelectedTopic(topic.value)}
            >
              {topic.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Difficulty selector */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Nivel</h3>
        <div className="flex gap-2">
          {DIFFICULTIES.map((diff) => (
            <Button
              key={diff.value}
              variant={
                selectedDifficulty === diff.value ? "default" : "outline"
              }
              size="sm"
              className={
                selectedDifficulty === diff.value
                  ? "bg-primary hover:bg-blue-dark"
                  : ""
              }
              onClick={() => setSelectedDifficulty(diff.value)}
            >
              {diff.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={!selectedTopic || loading}
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
          <p className="text-sm">Buscando palabras interesantes para ti...</p>
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {suggestions.length} sugerencias encontradas. Haz clic para escribir
            una entrada con la palabra.
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
            No se encontraron sugerencias nuevas. Prueba con otro tema o nivel.
          </p>
        </div>
      )}

      {!hasSearched && (
        <div className="text-center py-12 text-muted-foreground">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">
            Selecciona un tema y nivel para descubrir nuevas palabras en ingles.
          </p>
          <p className="text-xs mt-1">
            Las palabras que ya conoces seran excluidas automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}
