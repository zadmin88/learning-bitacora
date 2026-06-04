"use client";

import { useConvexAuth } from "convex/react";
import LandingPage from "@/components/landing/LandingPage";
import DashboardHome from "@/components/dashboard/DashboardHome";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-2xl text-foreground">
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
