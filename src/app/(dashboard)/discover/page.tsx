"use client";

import { TopBar } from "@/components/layout/TopBar";
import { WordDiscovery } from "@/components/discover/WordDiscovery";

export default function DiscoverPage() {
  return (
    <>
      <TopBar title="Descubrir" />
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <WordDiscovery />
      </div>
    </>
  );
}
