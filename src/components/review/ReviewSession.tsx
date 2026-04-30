"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ChallengeCard } from "./ChallengeCard";
import { RatingButtons } from "./RatingButtons";
import { ReviewSummary } from "./ReviewSummary";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Brain, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ChallengeData {
  question: string;
  hint?: string;
  answer: string;
  explanation: string;
  challengeType: string;
  conceptId?: any;
  questionEs?: string;
  hintEs?: string;
  explanationEs?: string;
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function ReviewSession() {
  const { user } = useCurrentUser();
  const queue = useQuery(api.review.getQueue);
  const submitReview = useMutation(api.review.submitReview);
  const generateChallenge = useAction(api.ai.challenge.generateChallenge);
  const regenerateChallenge = useAction(api.ai.challenge.regenerateChallenge);

  const challengeLevel = user?.profile?.challengeLevel ?? "intermediate";
  const showSpanish = user?.profile?.showSpanish ?? false;

  // Snapshot the queue so reactive updates don't shift indices mid-session
  const sessionQueue = useRef<NonNullable<typeof queue> | null>(null);
  if (queue && queue.length > 0 && !sessionQueue.current) {
    sessionQueue.current = shuffleArray([...queue]);
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    startTime: Date.now(),
  });
  const [sessionComplete, setSessionComplete] = useState(false);

  const items = sessionQueue.current;
  const currentConcept = items?.[currentIndex];

  const loadChallenge = useCallback(
    async (conceptId: any) => {
      setLoadingChallenge(true);
      setChallenge(null);
      setWasCorrect(null);
      try {
        const result = await generateChallenge({ conceptId, challengeLevel });
        setChallenge(result as ChallengeData);
      } catch (error) {
        console.error("Error generating challenge:", error);
        const concept = items?.find((c) => c._id === conceptId);
        if (concept) {
          setChallenge({
            question: `What does "${concept.term}" mean?`,
            answer: concept.definition || concept.term,
            explanation: `This concept was found in your journal entry: "${concept.context}"`,
            challengeType: "free_recall",
            questionEs: `¿Qué significa "${concept.term}"?`,
            explanationEs: `Este concepto fue encontrado en tu entrada de diario: "${concept.context}"`,
          });
        }
      } finally {
        setLoadingChallenge(false);
      }
    },
    [generateChallenge, items, challengeLevel]
  );

  // Load first challenge
  const [initialized, setInitialized] = useState(false);
  if (currentConcept && !initialized && !challenge && !loadingChallenge) {
    setInitialized(true);
    loadChallenge(currentConcept._id);
  }

  const handleAnswer = (correct: boolean) => {
    setWasCorrect(correct);
    setSessionStats((prev) => ({
      ...prev,
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
    }));
  };

  const handleRate = async (rating: number) => {
    if (!currentConcept || !challenge) return;

    await submitReview({
      conceptId: currentConcept._id,
      rating,
      challengeType: challenge.challengeType,
      wasCorrect: wasCorrect ?? false,
    });

    const nextIndex = currentIndex + 1;
    if (items && nextIndex >= items.length) {
      setSessionComplete(true);
    } else {
      setCurrentIndex(nextIndex);
      setWasCorrect(null);
      setChallenge(null);
      if (items?.[nextIndex]) {
        loadChallenge(items[nextIndex]._id);
      }
    }
  };

  const handleNewChallenge = useCallback(async () => {
    if (!currentConcept) return;
    setLoadingChallenge(true);
    setChallenge(null);
    setWasCorrect(null);
    try {
      const result = await regenerateChallenge({ conceptId: currentConcept._id, challengeLevel });
      setChallenge(result as ChallengeData);
    } catch (error) {
      console.error("Error regenerating challenge:", error);
    } finally {
      setLoadingChallenge(false);
    }
  }, [regenerateChallenge, currentConcept, challengeLevel]);

  // Loading queue
  if (queue === undefined) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Empty queue (use live queue for this check, not snapshot)
  if (queue.length === 0 && !sessionQueue.current) {
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <Brain className="h-12 w-12 text-sage mx-auto mb-4" />
        <h3 className="font-display text-lg font-semibold mb-2">
          ¡Todo al día!
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          No hay conceptos pendientes de repaso. Escribe más entradas en tu diario para
          crear nuevos conceptos que repasar.
        </p>
        <Link href="/journal/new">
          <Button className="bg-terracotta hover:bg-terracotta-dark">
            Escribir una Entrada
          </Button>
        </Link>
      </div>
    );
  }

  // Session complete
  if (sessionComplete) {
    return (
      <ReviewSummary
        totalReviewed={sessionStats.correct + sessionStats.incorrect}
        correctCount={sessionStats.correct}
        incorrectCount={sessionStats.incorrect}
        startTime={sessionStats.startTime}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <Progress
          value={items ? ((currentIndex + 1) / items.length) * 100 : 0}
          className="flex-1"
        />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {currentIndex + 1} / {items?.length ?? 0}
        </span>
      </div>

      {/* Challenge */}
      {loadingChallenge ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : challenge ? (
        <>
          <ChallengeCard
            challenge={challenge}
            conceptTerm={currentConcept?.term ?? ""}
            conceptType={currentConcept?.type ?? ""}
            onAnswer={handleAnswer}
            defaultShowSpanish={showSpanish}
          />
          {wasCorrect === null && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChallenge}
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Nuevo Reto
              </Button>
            </div>
          )}
        </>
      ) : null}

      {/* Rating buttons (show after answer) */}
      {wasCorrect !== null && (
        <div className="animate-fade-in">
          <p className="text-sm text-muted-foreground mb-2 text-center">
            ¿Qué tan bien lo recordaste?
          </p>
          <RatingButtons
            onRate={handleRate}
            cardState={currentConcept ? {
              due: currentConcept.nextReview,
              stability: currentConcept.stability,
              difficulty: currentConcept.fsrsDifficulty,
              elapsed_days: currentConcept.elapsedDays,
              scheduled_days: currentConcept.scheduledDays,
              reps: currentConcept.reps,
              lapses: currentConcept.lapses,
              state: currentConcept.state,
              lastReview: currentConcept.lastReview,
            } : undefined}
          />
        </div>
      )}
    </div>
  );
}
