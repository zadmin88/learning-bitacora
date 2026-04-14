"use client";

import { TopBar } from "@/components/layout/TopBar";
import { EntryTimeline } from "@/components/journal/EntryTimeline";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function JournalPage() {
  return (
    <>
      <TopBar title="Journal" />
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold">Your Journal</h1>
          <Link href="/journal/new">
            <Button className="bg-terracotta hover:bg-terracotta-dark">
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          </Link>
        </div>
        <EntryTimeline />
      </div>
    </>
  );
}
