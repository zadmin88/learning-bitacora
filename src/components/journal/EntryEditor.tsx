"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Send, Plus, X, BookOpen, Blocks } from "lucide-react";

const MOOD_OPTIONS = [
  { emoji: "\u{1F60A}", label: "Genial" },
  { emoji: "\u{1F914}", label: "Reflexivo" },
  { emoji: "\u{1F624}", label: "Frustrado" },
  { emoji: "\u{1F389}", label: "Emocionado" },
  { emoji: "\u{1F634}", label: "Cansado" },
  { emoji: "\u{1F4AA}", label: "Motivado" },
];

type Mode = "vocabulary" | "grammar";

interface ConceptEntry {
  term: string;
  definition: string;
}

interface StructureEntry {
  name: string;
  pattern: string;
  rule: string;
  example: string;
}

export function EntryEditor() {
  const createEntry = useMutation(api.entries.create);
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("vocabulary");
  const [concepts, setConcepts] = useState<ConceptEntry[]>([
    { term: "", definition: "" },
  ]);
  const [structures, setStructures] = useState<StructureEntry[]>([
    { name: "", pattern: "", rule: "", example: "" },
  ]);
  const [mood, setMood] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // ── Vocabulary helpers ──
  const addConcept = () =>
    setConcepts([...concepts, { term: "", definition: "" }]);
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

  // ── Grammar/structure helpers ──
  const addStructure = () =>
    setStructures([
      ...structures,
      { name: "", pattern: "", rule: "", example: "" },
    ]);
  const removeStructure = (index: number) => {
    if (structures.length === 1) return;
    setStructures(structures.filter((_, i) => i !== index));
  };
  const updateStructure = (
    index: number,
    field: keyof StructureEntry,
    value: string,
  ) => {
    const updated = [...structures];
    updated[index] = { ...updated[index], [field]: value };
    setStructures(updated);
  };

  const validConcepts = concepts.filter(
    (c) => c.term.trim() && c.definition.trim(),
  );
  // A structure needs at least a name and a rule; pattern/example are optional.
  const validStructures = structures.filter(
    (s) => s.name.trim() && s.rule.trim(),
  );

  const validCount =
    mode === "vocabulary" ? validConcepts.length : validStructures.length;

  const handleSubmit = async () => {
    if (validCount === 0) return;
    setLoading(true);
    try {
      if (mode === "vocabulary") {
        for (const c of validConcepts) {
          await createEntry({
            content: `${c.term.trim()}: ${c.definition.trim()}`,
            mood,
            concepts: [
              { term: c.term.trim(), definition: c.definition.trim() },
            ],
          });
        }
      } else {
        for (const s of validStructures) {
          await createEntry({
            content: `${s.name.trim()}: ${s.rule.trim()}`,
            mood,
            concepts: [
              {
                term: s.name.trim(),
                definition: s.rule.trim(),
                kind: "grammar",
                pattern: s.pattern.trim() || undefined,
                examples: s.example.trim() ? [s.example.trim()] : undefined,
              },
            ],
          });
        }
      }
      router.push("/journal");
    } catch (error) {
      console.error("Error creating entry:", error);
    } finally {
      setLoading(false);
    }
  };

  const modeButtonClass = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <button
          type="button"
          onClick={() => setMode("vocabulary")}
          className={modeButtonClass(mode === "vocabulary")}
        >
          <BookOpen className="h-4 w-4" />
          Vocabulario
        </button>
        <button
          type="button"
          onClick={() => setMode("grammar")}
          className={modeButtonClass(mode === "grammar")}
        >
          <Blocks className="h-4 w-4" />
          Gramática / Estructura
        </button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {mode === "vocabulary"
            ? concepts.map((concept, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="Termino (ej: thoroughly)"
                      value={concept.term}
                      onChange={(e) =>
                        updateConcept(index, "term", e.target.value)
                      }
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
              ))
            : structures.map((structure, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 border-b last:border-b-0 pb-4 last:pb-0"
                >
                  <div className="flex-1 space-y-3">
                    <Input
                      placeholder="Nombre de la regla (ej: Tercer condicional)"
                      value={structure.name}
                      onChange={(e) =>
                        updateStructure(index, "name", e.target.value)
                      }
                      className="text-base"
                    />
                    <Input
                      placeholder="Estructura (ej: if + past perfect, would have + participio)"
                      value={structure.pattern}
                      onChange={(e) =>
                        updateStructure(index, "pattern", e.target.value)
                      }
                      className="text-base font-mono"
                    />
                    <Input
                      placeholder="Regla / explicacion (cuando y como se usa)"
                      value={structure.rule}
                      onChange={(e) =>
                        updateStructure(index, "rule", e.target.value)
                      }
                      className="text-base"
                    />
                    <Input
                      placeholder="Ejemplo (ej: If I had studied, I would have passed)"
                      value={structure.example}
                      onChange={(e) =>
                        updateStructure(index, "example", e.target.value)
                      }
                      className="text-base"
                    />
                  </div>
                  {structures.length > 1 && (
                    <button
                      onClick={() => removeStructure(index)}
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
            onClick={mode === "vocabulary" ? addConcept : addStructure}
            className="w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            {mode === "vocabulary"
              ? "Agregar otro termino"
              : "Agregar otra estructura"}
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
              {validCount}{" "}
              {mode === "vocabulary"
                ? validCount === 1
                  ? "termino"
                  : "terminos"
                : validCount === 1
                  ? "estructura"
                  : "estructuras"}
            </span>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={validCount === 0 || loading}
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
        {mode === "vocabulary"
          ? "Los terminos que agregues se guardaran directamente como conceptos para repasar."
          : "Las estructuras se guardan como conceptos de gramatica con ejercicios de transformar y elegir la opcion correcta."}
      </p>
    </div>
  );
}
