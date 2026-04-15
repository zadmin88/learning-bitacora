"use client";

import { TopBar } from "@/components/layout/TopBar";
import { EntryEditor } from "@/components/journal/EntryEditor";

export default function NewEntryPage() {
  return (
    <>
      <TopBar title="Nueva Entrada" />
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <EntryEditor />
      </div>
    </>
  );
}
