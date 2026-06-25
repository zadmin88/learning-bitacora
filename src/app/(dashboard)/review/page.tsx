"use client";

import { TopBar } from "@/components/layout/TopBar";
import { ReviewTabs } from "@/components/review/ReviewTabs";

export default function ReviewPage() {
  return (
    <>
      <TopBar title="Repasar" />
      <div className="p-4 md:p-6">
        <ReviewTabs />
      </div>
    </>
  );
}
