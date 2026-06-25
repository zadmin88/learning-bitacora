"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReviewSession } from "./ReviewSession";
import { BookOpen, PenLine } from "lucide-react";

// Small "due" count rendered inside a tab. Hidden while loading or at zero so
// the tab label stays clean when there is nothing to study in that track.
function DueCount({ track }: { track: "vocab" | "writing" }) {
  const count = useQuery(api.review.getQueueCount, { track });
  if (!count) return null;
  return (
    <span className="rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
      {count}
    </span>
  );
}

export function ReviewTabs() {
  return (
    <Tabs defaultValue="vocab" className="max-w-lg mx-auto">
      <TabsList className="w-full">
        <TabsTrigger value="vocab">
          <BookOpen className="size-4" />
          Vocabulario
          <DueCount track="vocab" />
        </TabsTrigger>
        <TabsTrigger value="writing">
          <PenLine className="size-4" />
          Escritura
          <DueCount track="writing" />
        </TabsTrigger>
      </TabsList>

      {/* Base UI only mounts the active panel, so each track starts a fresh
          session when selected — no cross-track index/state bleed. */}
      <TabsContent value="vocab" className="mt-4">
        <ReviewSession track="vocab" />
      </TabsContent>
      <TabsContent value="writing" className="mt-4">
        <ReviewSession track="writing" />
      </TabsContent>
    </Tabs>
  );
}
