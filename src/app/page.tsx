"use client";

import { useConvexAuth } from "convex/react";
import LandingPage from "@/components/landing/LandingPage";
import DashboardHome from "@/components/dashboard/DashboardHome";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="animate-pulse font-display text-2xl text-charcoal">
          Bitácora
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <DashboardHome />;
  }

  return <LandingPage />;
}
