"use client";

import { useMemo } from "react";
import { fsrs, Rating } from "ts-fsrs";

interface RatingButtonsProps {
  onRate: (rating: number) => void;
  disabled?: boolean;
  cardState?: {
    due: number;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    state: number;
    lastReview?: number;
  };
}

function formatInterval(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

const ratingConfig = [
  { value: 1, label: "Otra vez", color: "bg-red-500 hover:bg-red-600", grade: Rating.Again },
  { value: 2, label: "Difícil", color: "bg-orange-500 hover:bg-orange-600", grade: Rating.Hard },
  { value: 3, label: "Bien", color: "bg-emerald hover:bg-emerald-dark", grade: Rating.Good },
  { value: 4, label: "Fácil", color: "bg-blue-500 hover:bg-blue-600", grade: Rating.Easy },
];

export function RatingButtons({ onRate, disabled, cardState }: RatingButtonsProps) {
  const intervals = useMemo(() => {
    if (!cardState) return null;
    const f = fsrs({ request_retention: 0.95 });
    const now = new Date();
    const card = {
      due: new Date(cardState.due),
      stability: cardState.stability,
      difficulty: cardState.difficulty,
      elapsed_days: cardState.elapsed_days,
      scheduled_days: cardState.scheduled_days,
      reps: cardState.reps,
      lapses: cardState.lapses,
      state: cardState.state as 0 | 1 | 2 | 3,
      last_review: cardState.lastReview ? new Date(cardState.lastReview) : undefined,
    };

    return ratingConfig.map((r) => {
      const result = f.next(card as any, now, r.grade as unknown as 1 | 2 | 3 | 4);
      return result.card.due.getTime() - now.getTime();
    });
  }, [cardState]);

  const isNewCard = cardState?.reps === 0;
  const visibleRatings = isNewCard
    ? ratingConfig.filter((r) => r.grade !== Rating.Easy)
    : ratingConfig;

  return (
    <div className={`grid gap-2 ${isNewCard ? "grid-cols-3" : "grid-cols-4"}`}>
      {visibleRatings.map((r) => {
        const intervalIndex = ratingConfig.indexOf(r);
        return (
          <button
            key={r.value}
            onClick={() => onRate(r.value)}
            disabled={disabled}
            className={`${r.color} text-white rounded-lg p-3 text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="block text-sm font-semibold">{r.label}</span>
            {intervals && (
              <span className="block text-xs opacity-90 font-medium mt-0.5">
                {formatInterval(intervals[intervalIndex])}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
