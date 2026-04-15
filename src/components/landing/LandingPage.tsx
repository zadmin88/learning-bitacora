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
            Tu diario de aprendizaje de inglés potenciado por IA
          </p>
          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-8">
            Escribe sobre lo que aprendes. La IA extrae conceptos, corrige tu
            escritura y crea desafíos de repaso personalizados que combaten la
            curva del olvido.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-terracotta hover:bg-terracotta-dark text-lg px-8"
              >
                Comenzar a Aprender
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-charcoal mb-12">
            Cómo funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BookOpen className="h-8 w-8 text-terracotta" />}
              title="Escribe"
              description="Escribe en tu diario sobre lo que estás aprendiendo en inglés. Escribe libremente — no hay respuesta incorrecta."
            />
            <FeatureCard
              icon={<Sparkles className="h-8 w-8 text-sage" />}
              title="Extrae"
              description="La IA analiza tu escritura, extrae vocabulario, gramática y modismos, y corrige cualquier error."
            />
            <FeatureCard
              icon={<Brain className="h-8 w-8 text-terracotta" />}
              title="Repasa"
              description="Desafíos de repetición espaciada basados en tus propias entradas. Repasa en el momento perfecto para recordar para siempre."
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center text-charcoal mb-12">
            ¿Por qué Bitácora?
          </h2>
          <div className="space-y-4">
            {[
              "Base de conocimiento personal que recuerda todo entre sesiones",
              "Programación proactiva de repasos — te dice cuándo repasar",
              "Desafíos basados en tu propia escritura, no tarjetas genéricas",
              "Escribir mejora la retención (respaldado por investigación)",
              "Búsqueda semántica sobre todo tu historial de aprendizaje",
              "Experiencia de escritura hermosa y sin distracciones",
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
            Empieza a construir tu memoria del inglés hoy
          </h2>
          <p className="text-cream-dark text-lg mb-8">
            El 70% de lo que aprendes se olvida en 24 horas. Bitácora cambia
            eso.
          </p>
          <Link href="/register">
            <Button
              size="lg"
              className="bg-terracotta hover:bg-terracotta-dark text-lg px-8"
            >
              Crear Cuenta Gratis
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
          <p>Tu Diario de Aprendizaje de Inglés — Potenciado por IA</p>
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
