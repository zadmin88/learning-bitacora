"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ChallengeCard } from "./ChallengeCard";
import { RatingButtons } from "./RatingButtons";
import { ReviewSummary } from "./ReviewSummary";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ChallengeData {
  question: string;
  hint?: string;
  answer: string;
  explanation: string;
  challengeType: string;
  conceptId?: any;
}

export function ReviewSession() {
  const queue = useQuery(api.review.getQueue);
  const submitReview = useMutation(api.review.submitReview);
  const generateChallenge = useAction(api.ai.challenge.generateChallenge);

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

  const currentConcept = queue?.[currentIndex];

  const loadChallenge = useCallback(
    async (conceptId: any) => {
      setLoadingChallenge(true);
      setChallenge(null);
      setWasCorrect(null);
      try {
        const result = await generateChallenge({ conceptId });
        setChallenge(result as ChallengeData);
      } catch (error) {
        console.error("Error generating challenge:", error);
        const concept = queue?.find((c) => c._id === conceptId);
        if (concept) {
          setChallenge({
            question: `¿Qué significa "${concept.term}"?`,
            answer: concept.definition || concept.term,
            explanation: `Este concepto fue encontrado en tu entrada de diario: "${concept.context}"`,
            challengeType: "free_recall",
          });
        }
      } finally {
        setLoadingChallenge(false);
      }
    },
    [generateChallenge, queue]
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
    if (queue && nextIndex >= queue.length) {
      setSessionComplete(true);
    } else {
      setCurrentIndex(nextIndex);
      setWasCorrect(null);
      setChallenge(null);
      if (queue?.[nextIndex]) {
        loadChallenge(queue[nextIndex]._id);
      }
    }
  };

  // Loading queue
  if (queue === undefined) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Empty queue
  if (queue.length === 0) {
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
          value={((currentIndex + 1) / queue.length) * 100}
          className="flex-1"
        />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {currentIndex + 1} / {queue.length}
        </span>
      </div>

      {/* Challenge */}
      {loadingChallenge ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : challenge ? (
        <ChallengeCard
          challenge={challenge}
          conceptTerm={currentConcept?.term ?? ""}
          conceptType={currentConcept?.type ?? ""}
          onAnswer={handleAnswer}
        />
      ) : null}

      {/* Rating buttons (show after answer) */}
      {wasCorrect !== null && (
        <div className="animate-fade-in">
          <p className="text-sm text-muted-foreground mb-2 text-center">
            ¿Qué tan bien lo recordaste?
          </p>
          <RatingButtons onRate={handleRate} />
        </div>
      )}
    </div>
  );
}
