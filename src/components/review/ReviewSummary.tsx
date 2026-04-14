"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ReviewSummaryProps {
  totalReviewed: number;
  correctCount: number;
  incorrectCount: number;
  startTime: number;
}

export function ReviewSummary({
  totalReviewed,
  correctCount,
  incorrectCount,
  startTime,
}: ReviewSummaryProps) {
  const accuracy =
    totalReviewed > 0 ? Math.round((correctCount / totalReviewed) * 100) : 0;
  const duration = Math.round((Date.now() - startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <Trophy className="h-12 w-12 text-terracotta mx-auto mb-2" />
        <CardTitle className="font-display text-2xl">Review Complete!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-sage">
              <CheckCircle className="h-4 w-4" />
              <span className="text-2xl font-bold">{correctCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Correct</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-red-500">
              <XCircle className="h-4 w-4" />
              <span className="text-2xl font-bold">{incorrectCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Incorrect</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-2xl font-bold">
                {minutes > 0 ? `${minutes}m` : `${seconds}s`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Time</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-3xl font-bold text-terracotta">{accuracy}%</p>
          <p className="text-sm text-muted-foreground">Accuracy</p>
        </div>

        <p className="text-sm text-center text-muted-foreground">
          {accuracy >= 80
            ? "Excellent work! Your memory is getting stronger."
            : accuracy >= 50
              ? "Good effort! Keep reviewing to strengthen these concepts."
              : "Don't worry — spaced repetition means you'll see these again soon."}
        </p>

        <div className="flex gap-2 pt-2">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              Dashboard
            </Button>
          </Link>
          <Link href="/journal/new" className="flex-1">
            <Button className="w-full bg-terracotta hover:bg-terracotta-dark">
              Write Entry
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
