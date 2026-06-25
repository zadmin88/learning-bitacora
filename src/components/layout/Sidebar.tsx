"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Brain,
  Search,
  BarChart3,
  Settings,
  PenLine,
  LogOut,
  Flame,
  Lightbulb,
  GraduationCap,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Inicio", icon: BookOpen },
  { href: "/journal", label: "Diario", icon: PenLine },
  { href: "/review", label: "Repasar", icon: Brain },
  { href: "/explore", label: "Explorar", icon: Search },
  { href: "/discover", label: "Descubrir", icon: Lightbulb },
  { href: "/coach", label: "Escritura", icon: GraduationCap },
  { href: "/progress", label: "Progreso", icon: BarChart3 },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const { user } = useCurrentUser();
  const reviewCount = useQuery(api.review.getQueueCount, {});

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-sidebar min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/">
          <h1 className="text-2xl font-bold text-foreground">
            Bitácora
          </h1>
        </Link>
      </div>

      {/* User info */}
      {user && (
        <div className="px-6 py-4 border-b border-border">
          <p className="font-medium text-sm text-foreground truncate">
            {user.name || user.email || "Estudiante"}
          </p>
          {user.profile && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Flame className="h-3 w-3 text-amber-streak" />
              <span>{user.profile.streak} días de racha</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.label === "Repasar" &&
                reviewCount !== undefined &&
                reviewCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-auto bg-primary text-white text-xs px-1.5 py-0"
                  >
                    {reviewCount}
                  </Badge>
                )}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
