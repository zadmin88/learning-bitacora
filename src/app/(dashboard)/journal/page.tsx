"use client";

import { TopBar } from "@/components/layout/TopBar";
import { EntryTimeline } from "@/components/journal/EntryTimeline";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function JournalPage() {
  return (
    <>
      <TopBar title="Diario" />
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Tu Diario</h1>
          <Link href="/journal/new">
            <Button className="bg-primary hover:bg-blue-dark">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Entrada
            </Button>
          </Link>
        </div>
        <EntryTimeline />
      </div>
    </>
  );
}
