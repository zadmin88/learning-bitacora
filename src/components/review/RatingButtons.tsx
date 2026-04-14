"use client";

import { Button } from "@/components/ui/button";

interface RatingButtonsProps {
  onRate: (rating: number) => void;
  disabled?: boolean;
}

const ratings = [
  { value: 1, label: "Again", color: "bg-red-500 hover:bg-red-600", desc: "Forgot completely" },
  { value: 2, label: "Hard", color: "bg-orange-500 hover:bg-orange-600", desc: "Recalled with difficulty" },
  { value: 3, label: "Good", color: "bg-sage hover:bg-sage-dark", desc: "Recalled correctly" },
  { value: 4, label: "Easy", color: "bg-blue-500 hover:bg-blue-600", desc: "Too easy" },
];

export function RatingButtons({ onRate, disabled }: RatingButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {ratings.map((r) => (
        <button
          key={r.value}
          onClick={() => onRate(r.value)}
          disabled={disabled}
          className={`${r.color} text-white rounded-lg p-3 text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="block text-sm font-semibold">{r.label}</span>
          <span className="block text-xs opacity-80 mt-0.5">{r.desc}</span>
        </button>
      ))}
    </div>
  );
}
