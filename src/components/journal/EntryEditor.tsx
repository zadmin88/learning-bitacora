"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Send, Plus, X } from "lucide-react";

const MOOD_OPTIONS = [
  { emoji: "\u{1F60A}", label: "Genial" },
  { emoji: "\u{1F914}", label: "Reflexivo" },
  { emoji: "\u{1F624}", label: "Frustrado" },
  { emoji: "\u{1F389}", label: "Emocionado" },
  { emoji: "\u{1F634}", label: "Cansado" },
  { emoji: "\u{1F4AA}", label: "Motivado" },
];

interface ConceptEntry {
  term: string;
  definition: string;
}

export function EntryEditor() {
  const createEntry = useMutation(api.entries.create);
  const router = useRouter();
  const [concepts, setConcepts] = useState<ConceptEntry[]>([
    { term: "", definition: "" },
  ]);
  const [mood, setMood] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const addConcept = () => {
    setConcepts([...concepts, { term: "", definition: "" }]);
  };

  const removeConcept = (index: number) => {
    if (concepts.length === 1) return;
    setConcepts(concepts.filter((_, i) => i !== index));
  };

  const updateConcept = (
    index: number,
    field: keyof ConceptEntry,
    value: string,
  ) => {
    const updated = [...concepts];
    updated[index] = { ...updated[index], [field]: value };
    setConcepts(updated);
  };

  const validConcepts = concepts.filter(
    (c) => c.term.trim() && c.definition.trim(),
  );

  const handleSubmit = async () => {
    if (validConcepts.length === 0) return;
    setLoading(true);
    try {
      for (const c of validConcepts) {
        await createEntry({
          content: `${c.term.trim()}: ${c.definition.trim()}`,
          mood,
          concepts: [{ term: c.term.trim(), definition: c.definition.trim() }],
        });
      }
      router.push("/journal");
    } catch (error) {
      console.error("Error creating entry:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          {concepts.map((concept, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Termino (ej: thoroughly)"
                  value={concept.term}
                  onChange={(e) => updateConcept(index, "term", e.target.value)}
                  className="text-base"
                />
                <Input
                  placeholder="Definicion (ej: make it complete and deep)"
                  value={concept.definition}
                  onChange={(e) =>
                    updateConcept(index, "definition", e.target.value)
                  }
                  className="text-base"
                />
              </div>
              {concepts.length > 1 && (
                <button
                  onClick={() => removeConcept(index)}
                  className="mt-2 text-muted-foreground hover:text-destructive transition-colors"
                  title="Eliminar"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={addConcept}
            className="w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar otro termino
          </Button>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-4">
            {/* Mood selector */}
            <div className="flex items-center gap-1">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.label}
                  onClick={() =>
                    setMood(mood === m.emoji ? undefined : m.emoji)
                  }
                  className={`text-lg p-1 rounded transition-all ${
                    mood === m.emoji
                      ? "bg-primary/10 scale-110"
                      : "opacity-50 hover:opacity-100"
                  }`}
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>

            <span className="text-xs text-muted-foreground">
              {validConcepts.length}{" "}
              {validConcepts.length === 1 ? "termino" : "terminos"}
            </span>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={validConcepts.length === 0 || loading}
            className="bg-primary hover:bg-blue-dark"
          >
            {loading ? (
              "Guardando..."
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Guardar Entrada
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Los terminos que agregues se guardaran directamente como conceptos para
        repasar.
      </p>
    </div>
  );
}
