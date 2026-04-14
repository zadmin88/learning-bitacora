"use client";

import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Brain,
  Sparkles,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-32 text-center">
          <h1 className="font-display text-5xl md:text-7xl font-bold text-charcoal mb-6">
            Bitácora
          </h1>
          <p className="text-xl md:text-2xl text-charcoal-light max-w-2xl mx-auto mb-4">
            Your AI-powered English learning journal
          </p>
          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-8">
            Write about what you learn. AI extracts concepts, corrects your
            writing, and creates personalized review challenges that fight the
            forgetting curve.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-terracotta hover:bg-terracotta-dark text-lg px-8"
              >
                Start Learning
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-charcoal mb-12">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BookOpen className="h-8 w-8 text-terracotta" />}
              title="Write"
              description="Journal about what you're learning in English. Write freely — there's no wrong answer."
            />
            <FeatureCard
              icon={<Sparkles className="h-8 w-8 text-sage" />}
              title="Extract"
              description="AI analyzes your writing, extracts vocabulary, grammar, and idioms, and corrects any errors."
            />
            <FeatureCard
              icon={<Brain className="h-8 w-8 text-terracotta" />}
              title="Review"
              description="Spaced repetition challenges from your own entries. Review at the perfect moment to remember forever."
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center text-charcoal mb-12">
            Why Bitácora?
          </h2>
          <div className="space-y-4">
            {[
              "Personal knowledge base that remembers everything across sessions",
              "Proactive review scheduling — it tells you when to review",
              "Challenges from your own writing, not generic flashcards",
              "Writing itself improves retention (research-backed)",
              "Semantic search over your entire learning history",
              "Beautiful, distraction-free writing experience",
            ].map((benefit, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 bg-white rounded-lg shadow-sm"
              >
                <CheckCircle className="h-5 w-5 text-sage shrink-0 mt-0.5" />
                <span className="text-charcoal">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-charcoal text-cream">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Start building your English memory today
          </h2>
          <p className="text-cream-dark text-lg mb-8">
            70% of what you learn is forgotten within 24 hours. Bitácora changes
            that.
          </p>
          <Link href="/register">
            <Button
              size="lg"
              className="bg-terracotta hover:bg-terracotta-dark text-lg px-8"
            >
              Create Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="font-display text-charcoal font-semibold mb-1">
            Bitácora
          </p>
          <p>Your English Learning Journal — Powered by AI</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center p-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cream mb-4">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold text-charcoal mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
