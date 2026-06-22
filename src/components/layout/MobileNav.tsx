"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Brain,
  PenLine,
  MoreHorizontal,
  Search,
  Lightbulb,
  BarChart3,
  Settings,
  GraduationCap,
  X,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

const mainItems = [
  { href: "/", label: "Inicio", icon: BookOpen },
  { href: "/journal", label: "Diario", icon: PenLine },
  { href: "/review", label: "Repasar", icon: Brain },
];

const moreItems = [
  { href: "/explore", label: "Explorar", icon: Search },
  { href: "/discover", label: "Descubrir", icon: Lightbulb },
  { href: "/coach", label: "Escritura", icon: GraduationCap },
  { href: "/progress", label: "Progreso", icon: BarChart3 },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const reviewCount = useQuery(api.review.getQueueCount);
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreItems.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href))
  );

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More menu panel */}
      {moreOpen && (
        <div className="md:hidden fixed bottom-16 left-4 right-4 z-50 bg-card rounded-2xl shadow-lg border border-border p-2 animate-slide-up">
          <div className="flex items-center justify-between px-3 py-2 mb-1">
            <span className="text-sm font-medium text-muted-foreground">
              Más opciones
            </span>
            <button
              onClick={() => setMoreOpen(false)}
              className="p-1 rounded-lg hover:bg-muted"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {moreItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-t border-border">
        <div className="flex items-center justify-around py-2 px-2">
          {mainItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 min-w-12 min-h-12 justify-center px-3 py-1 text-xs relative rounded-xl transition-colors",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
                {item.label === "Repasar" &&
                  reviewCount !== undefined &&
                  reviewCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 bg-primary text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-medium">
                      {reviewCount}
                    </span>
                  )}
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "flex flex-col items-center gap-0.5 min-w-12 min-h-12 justify-center px-3 py-1 text-xs rounded-xl transition-colors",
              moreOpen || isMoreActive
                ? "text-primary bg-primary/10"
                : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="font-medium">Más</span>
          </button>
        </div>
      </nav>
    </>
  );
}
