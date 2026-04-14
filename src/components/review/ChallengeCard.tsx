"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Eye, CheckCircle, XCircle, Lightbulb } from "lucide-react";

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

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRevealed(true);
  };

  const typeLabel =
    challenge.challengeType === "fill_gap"
      ? "Fill in the Gap"
      : challenge.challengeType === "free_recall"
        ? "Free Recall"
        : "Error Correction";

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {typeLabel}
          </Badge>
          <Badge variant="secondary" className="text-xs capitalize">
            {conceptType}: {conceptTerm}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question */}
        <p className="text-lg leading-relaxed">{challenge.question}</p>

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
                Show hint
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
              placeholder="Type your answer..."
              className="text-base"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                className="bg-terracotta hover:bg-terracotta-dark flex-1"
                disabled={!userAnswer.trim()}
              >
                Check Answer
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReveal}
              >
                <Eye className="h-4 w-4 mr-1" />
                Reveal
              </Button>
            </div>
          </form>
        )}

        {/* Revealed answer */}
        {revealed && (
          <div className="space-y-3 animate-fade-in">
            {userAnswer && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Your answer:</p>
                <p className="font-medium">{userAnswer}</p>
              </div>
            )}
            <div className="p-3 bg-sage/10 rounded-md border border-sage/20">
              <p className="text-sm text-muted-foreground">Correct answer:</p>
              <p className="font-medium text-sage-dark">{challenge.answer}</p>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Explanation:</p>
              <p className="text-sm">{challenge.explanation}</p>
            </div>

            {/* Self-assessment */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => onAnswer(true)}
                className="flex-1 bg-sage hover:bg-sage-dark"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                I got it right
              </Button>
              <Button
                onClick={() => onAnswer(false)}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                I got it wrong
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
