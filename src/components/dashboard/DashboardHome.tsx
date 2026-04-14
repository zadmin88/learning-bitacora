"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Brain, PenLine, Flame, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function DashboardHome() {
  const { user } = useCurrentUser();
  const entries = useQuery(api.entries.list);
  const reviewCount = useQuery(api.review.getQueueCount);
  const concepts = useQuery(api.concepts.listByUser, {});

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-16 md:pb-0">
        <TopBar title="Dashboard" />
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
          {/* Welcome section */}
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Welcome back
              {user?.name ? `, ${user.name}` : ""}
            </h1>
            <p className="text-muted-foreground mt-1">
              Keep writing, keep learning. Every entry strengthens your English.
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-terracotta" />
                  <span className="text-sm text-muted-foreground">
                    Entries
                  </span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {entries === undefined ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    entries.length
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-sage" />
                  <span className="text-sm text-muted-foreground">
                    Concepts
                  </span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {concepts === undefined ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    concepts.length
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-terracotta" />
                  <span className="text-sm text-muted-foreground">Due</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {reviewCount === undefined ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    reviewCount
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-terracotta" />
                  <span className="text-sm text-muted-foreground">Streak</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {user?.profile?.streak ?? 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Action cards */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-terracotta/20">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <PenLine className="h-5 w-5 text-terracotta" />
                  Write Today&apos;s Entry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Write about what you learned today. AI will extract concepts
                  and check your writing.
                </p>
                <Link href="/journal/new">
                  <Button className="bg-terracotta hover:bg-terracotta-dark">
                    Start Writing
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-sage/20">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Brain className="h-5 w-5 text-sage" />
                  Review Concepts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {reviewCount === undefined
                    ? "Loading..."
                    : reviewCount > 0
                      ? `You have ${reviewCount} concept${reviewCount !== 1 ? "s" : ""} due for review.`
                      : "No concepts due right now. Great job!"}
                </p>
                <Link href="/review">
                  <Button
                    variant="outline"
                    className="border-sage text-sage hover:bg-sage/10"
                    disabled={reviewCount === 0}
                  >
                    Start Review
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Recent entries */}
          {entries && entries.length > 0 && (
            <div>
              <h2 className="font-display text-xl font-semibold mb-3">
                Recent Entries
              </h2>
              <div className="space-y-3">
                {entries.slice(0, 3).map((entry) => (
                  <Link key={entry._id} href="/journal">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground line-clamp-2">
                              {entry.content}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span>
                                {formatDistanceToNow(entry.createdAt, {
                                  addSuffix: true,
                                })}
                              </span>
                              {entry.conceptCount > 0 && (
                                <span className="text-sage">
                                  {entry.conceptCount} concepts
                                </span>
                              )}
                              {entry.mood && <span>{entry.mood}</span>}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              {entries.length > 3 && (
                <Link
                  href="/journal"
                  className="text-sm text-terracotta hover:underline mt-2 inline-block"
                >
                  View all entries →
                </Link>
              )}
            </div>
          )}

          {/* Empty state */}
          {entries && entries.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <PenLine className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold mb-2">
                  Start Your Journey
                </h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
                  Write your first journal entry about what you&apos;re learning
                  in English. Our AI will analyze it and create personalized
                  review challenges.
                </p>
                <Link href="/journal/new">
                  <Button className="bg-terracotta hover:bg-terracotta-dark">
                    Write Your First Entry
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
