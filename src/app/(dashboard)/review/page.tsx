"use client";

import { TopBar } from "@/components/layout/TopBar";
import { ReviewSession } from "@/components/review/ReviewSession";

export default function ReviewPage() {
  return (
    <>
      <TopBar title="Repasar" />
      <div className="p-4 md:p-6">
        <ReviewSession />
      </div>
    </>
  );
}
