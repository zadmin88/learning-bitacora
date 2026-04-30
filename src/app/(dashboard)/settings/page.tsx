"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, GraduationCap, Languages } from "lucide-react";

const LEVELS = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
];

export default function SettingsPage() {
  const { signOut } = useAuthActions();
  const { user } = useCurrentUser();
  const updatePreferences = useMutation(api.users.updatePreferences);

  const currentLevel = user?.profile?.challengeLevel ?? "intermediate";
  const showSpanish = user?.profile?.showSpanish ?? false;

  return (
    <>
      <TopBar title="Ajustes" />
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="font-display text-2xl font-bold">Ajustes</h1>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Nombre</label>
              <p className="font-medium">{user?.name || "No establecido"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Correo electrónico</label>
              <p className="font-medium">{user?.email || "No establecido"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Preferencias de Repaso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Challenge Level */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Nivel de dificultad de los retos
              </label>
              <div className="flex gap-2">
                {LEVELS.map((level) => (
                  <Badge
                    key={level.value}
                    variant={currentLevel === level.value ? "default" : "outline"}
                    className={`cursor-pointer px-3 py-1.5 text-sm ${
                      currentLevel === level.value
                        ? "bg-terracotta hover:bg-terracotta-dark text-white"
                        : "hover:bg-secondary"
                    }`}
                    onClick={() =>
                      updatePreferences({ challengeLevel: level.value })
                    }
                  >
                    {level.label}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentLevel === "beginner" &&
                  "Oraciones cortas y vocabulario sencillo."}
                {currentLevel === "intermediate" &&
                  "Oraciones naturales con complejidad moderada."}
                {currentLevel === "advanced" &&
                  "Oraciones complejas y vocabulario avanzado."}
              </p>
            </div>

            {/* Spanish Toggle */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Languages className="h-4 w-4" />
                Traducciones en español
              </label>
              <div className="flex gap-2">
                <Badge
                  variant={showSpanish ? "default" : "outline"}
                  className={`cursor-pointer px-3 py-1.5 text-sm ${
                    showSpanish
                      ? "bg-terracotta hover:bg-terracotta-dark text-white"
                      : "hover:bg-secondary"
                  }`}
                  onClick={() => updatePreferences({ showSpanish: true })}
                >
                  Mostrar por defecto
                </Badge>
                <Badge
                  variant={!showSpanish ? "default" : "outline"}
                  className={`cursor-pointer px-3 py-1.5 text-sm ${
                    !showSpanish
                      ? "bg-terracotta hover:bg-terracotta-dark text-white"
                      : "hover:bg-secondary"
                  }`}
                  onClick={() => updatePreferences({ showSpanish: false })}
                >
                  Ocultar por defecto
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Muestra la traducción al español de las preguntas, pistas y
                explicaciones durante el repaso.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button
              variant="destructive"
              onClick={() => signOut()}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
