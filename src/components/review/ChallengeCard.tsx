"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, CheckCircle, XCircle, Lightbulb, Plus, BookOpen, Globe } from "lucide-react";

interface Challenge {
  question: string;
  hint?: string;
  answer: string;
  explanation: string;
  challengeType: string;
  options?: string[];
  optionsEs?: string[];
  correctIndex?: number;
  questionEs?: string;
  hintEs?: string;
  explanationEs?: string;
}

interface ChallengeCardProps {
  challenge: Challenge;
  conceptTerm: string;
  conceptType: string;
  onAnswer: (wasCorrect: boolean) => void;
  defaultShowSpanish?: boolean;
}

export function ChallengeCard({
  challenge,
  conceptTerm,
  conceptType,
  onAnswer,
  defaultShowSpanish = false,
}: ChallengeCardProps) {
  const [userAnswer, setUserAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showSpanish, setShowSpanish] = useState(defaultShowSpanish);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // A "contrast" grammar drill renders as multiple choice when the AI
  // supplied options; otherwise it degrades to the standard text flow.
  const isMcq =
    challenge.challengeType === "contrast" &&
    Array.isArray(challenge.options) &&
    challenge.options.length > 0;

  // Add concept state
  const [showAddConcept, setShowAddConcept] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [savingConcept, setSavingConcept] = useState(false);
  const [conceptSaved, setConceptSaved] = useState(false);

  const createManual = useMutation(api.concepts.createManual);

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRevealed(true);
  };

  const handleAddConcept = () => {
    const selection = window.getSelection()?.toString().trim() || "";
    setNewTerm(selection);
    setNewDefinition("");
    setConceptSaved(false);
    setShowAddConcept(true);
  };

  const handleSaveConcept = async () => {
    if (!newTerm.trim()) return;
    setSavingConcept(true);
    try {
      await createManual({
        term: newTerm.trim(),
        definition: newDefinition.trim() || undefined,
      });
      setConceptSaved(true);
      setTimeout(() => {
        setShowAddConcept(false);
      }, 800);
    } catch (error) {
      console.error("Error saving concept:", error);
    } finally {
      setSavingConcept(false);
    }
  };

  const handleSelectOption = (index: number) => {
    setSelectedIndex(index);
    setRevealed(true);
  };

  const TYPE_LABELS: Record<string, string> = {
    fill_gap: "Completar el Espacio",
    free_recall: "Recuerdo Libre",
    error_correction: "Corrección de Errores",
    transform: "Transforma la Oración",
    contrast: "Elige la Correcta",
  };
  const typeLabel = TYPE_LABELS[challenge.challengeType] ?? "Reto";

  const hasSpanish = !!(challenge.questionEs || challenge.hintEs || challenge.explanationEs);

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {typeLabel}
            </Badge>
            {hasSpanish && (
              <button
                onClick={() => setShowSpanish(!showSpanish)}
                className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                  showSpanish
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe className="h-3 w-3" />
                {showSpanish ? "Ocultar español" : "Ver en español"}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Question */}
          <p className="text-lg leading-relaxed">{challenge.question}</p>

          {/* Spanish question */}
          {showSpanish && challenge.questionEs && (
            <div className="p-3 bg-muted/60 rounded-md border border-muted animate-fade-in">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {challenge.questionEs}
              </p>
            </div>
          )}

          {/* Add word button */}
          <button
            onClick={handleAddConcept}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Agregar Palabra
          </button>

          {/* Hint */}
          {challenge.hint && !revealed && (
            <div>
              {showHint ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                    {challenge.hint}
                  </p>
                  {showSpanish && challenge.hintEs && (
                    <p className="text-sm text-muted-foreground bg-muted/60 p-2 rounded-md ml-6 animate-fade-in">
                      {challenge.hintEs}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowHint(true)}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Lightbulb className="h-3 w-3" />
                  Mostrar pista
                </button>
              )}
            </div>
          )}

          {/* Multiple-choice (contrast grammar drill) */}
          {isMcq && (
            <div className="space-y-2">
              {challenge.options!.map((option, i) => {
                const isCorrect = i === challenge.correctIndex;
                const isSelected = i === selectedIndex;
                let stateClasses =
                  "border-input hover:bg-muted hover:border-primary/40";
                if (revealed) {
                  if (isCorrect) {
                    stateClasses =
                      "bg-emerald/10 border-emerald/40 text-emerald-dark";
                  } else if (isSelected) {
                    stateClasses = "bg-red-50 border-red-300 text-red-700";
                  } else {
                    stateClasses = "border-input opacity-60";
                  }
                }
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectOption(i)}
                    disabled={revealed}
                    className={`w-full text-left p-3 rounded-md border transition-colors disabled:cursor-default ${stateClasses}`}
                  >
                    <span className="font-medium mr-2">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {option}
                    {showSpanish && challenge.optionsEs?.[i] && (
                      <span className="block text-xs text-muted-foreground mt-1 ml-6">
                        {challenge.optionsEs[i]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Multiple-choice result */}
          {isMcq && revealed && (
            <div className="space-y-3 animate-fade-in">
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Explicación:</p>
                <p className="text-sm">{challenge.explanation}</p>
                {showSpanish && challenge.explanationEs && (
                  <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-muted-foreground/10 animate-fade-in">
                    {challenge.explanationEs}
                  </p>
                )}
              </div>
              <Button
                onClick={() => onAnswer(selectedIndex === challenge.correctIndex)}
                className="w-full bg-primary hover:bg-blue-dark"
              >
                Continuar
              </Button>
            </div>
          )}

          {/* Answer input */}
          {!isMcq && !revealed && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Escribe tu respuesta..."
                className="text-base"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-primary hover:bg-blue-dark flex-1"
                  disabled={!userAnswer.trim()}
                >
                  Verificar Respuesta
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReveal}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Revelar
                </Button>
              </div>
            </form>
          )}

          {/* Revealed answer */}
          {!isMcq && revealed && (
            <div className="space-y-3 animate-fade-in">
              {userAnswer && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">Tu respuesta:</p>
                  <p className="font-medium">{userAnswer}</p>
                </div>
              )}
              <div className="p-3 bg-emerald/10 rounded-md border border-emerald/20">
                <p className="text-sm text-muted-foreground">Respuesta correcta:</p>
                <p className="font-medium text-emerald-dark">{challenge.answer}</p>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Explicación:</p>
                <p className="text-sm">{challenge.explanation}</p>
                {showSpanish && challenge.explanationEs && (
                  <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-muted-foreground/10 animate-fade-in">
                    {challenge.explanationEs}
                  </p>
                )}
              </div>

              {/* Self-assessment */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => onAnswer(true)}
                  className="flex-1 bg-emerald hover:bg-emerald-dark"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Lo sabía
                </Button>
                <Button
                  onClick={() => onAnswer(false)}
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  No lo sabía
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add concept dialog */}
      <Dialog open={showAddConcept} onOpenChange={setShowAddConcept}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Agregar Concepto
            </DialogTitle>
          </DialogHeader>
          {conceptSaved ? (
            <div className="flex items-center gap-2 text-emerald-dark py-4 justify-center">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Concepto guardado</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="concept-term">Palabra</Label>
                <Input
                  id="concept-term"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="Escribe la palabra..."
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="concept-definition">
                  Definición <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="concept-definition"
                  value={newDefinition}
                  onChange={(e) => setNewDefinition(e.target.value)}
                  placeholder="¿Qué significa?"
                />
              </div>
            </div>
          )}
          {!conceptSaved && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAddConcept(false)}
                disabled={savingConcept}
              >
                Cancelar
              </Button>
              <Button
                className="bg-primary hover:bg-blue-dark"
                onClick={handleSaveConcept}
                disabled={!newTerm.trim() || savingConcept}
              >
                {savingConcept ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
