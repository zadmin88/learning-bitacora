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
import { Eye, CheckCircle, XCircle, Lightbulb, Plus, BookOpen } from "lucide-react";

interface Challenge {
  question: string;
  hint?: string;
  answer: string;
  explanation: string;
  challengeType: string;
}

interface ChallengeCardProps {
  challenge: Challenge;
  conceptTerm: string;
  conceptType: string;
  onAnswer: (wasCorrect: boolean) => void;
}

export function ChallengeCard({
  challenge,
  conceptTerm,
  conceptType,
  onAnswer,
}: ChallengeCardProps) {
  const [userAnswer, setUserAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [revealed, setRevealed] = useState(false);

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

  const typeLabel =
    challenge.challengeType === "fill_gap"
      ? "Completar el Espacio"
      : challenge.challengeType === "free_recall"
        ? "Recuerdo Libre"
        : "Corrección de Errores";

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <Badge variant="outline" className="text-xs">
            {typeLabel}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Question */}
          <p className="text-lg leading-relaxed">{challenge.question}</p>

          {/* Add word button */}
          <button
            onClick={handleAddConcept}
            className="text-sm text-terracotta hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Agregar Palabra
          </button>

          {/* Hint */}
          {challenge.hint && !revealed && (
            <div>
              {showHint ? (
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                  {challenge.hint}
                </p>
              ) : (
                <button
                  onClick={() => setShowHint(true)}
                  className="text-sm text-terracotta hover:underline flex items-center gap-1"
                >
                  <Lightbulb className="h-3 w-3" />
                  Mostrar pista
                </button>
              )}
            </div>
          )}

          {/* Answer input */}
          {!revealed && (
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
                  className="bg-terracotta hover:bg-terracotta-dark flex-1"
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
          {revealed && (
            <div className="space-y-3 animate-fade-in">
              {userAnswer && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">Tu respuesta:</p>
                  <p className="font-medium">{userAnswer}</p>
                </div>
              )}
              <div className="p-3 bg-sage/10 rounded-md border border-sage/20">
                <p className="text-sm text-muted-foreground">Respuesta correcta:</p>
                <p className="font-medium text-sage-dark">{challenge.answer}</p>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Explicación:</p>
                <p className="text-sm">{challenge.explanation}</p>
              </div>

              {/* Self-assessment */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => onAnswer(true)}
                  className="flex-1 bg-sage hover:bg-sage-dark"
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
            <div className="flex items-center gap-2 text-sage-dark py-4 justify-center">
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
                className="bg-terracotta hover:bg-terracotta-dark"
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
