"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User } from "lucide-react";

export default function SettingsPage() {
  const { signOut } = useAuthActions();
  const { user } = useCurrentUser();

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
