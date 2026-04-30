"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Brain, Search, BarChart3, PenLine, Lightbulb } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Inicio", icon: BookOpen },
  { href: "/journal", label: "Diario", icon: PenLine },
  { href: "/review", label: "Repasar", icon: Brain },
  { href: "/explore", label: "Explorar", icon: Search },
  { href: "/discover", label: "Descubrir", icon: Lightbulb },
  { href: "/progress", label: "Progreso", icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();
  const reviewCount = useQuery(api.review.getQueueCount);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-border">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-xs relative",
                isActive ? "text-terracotta" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.label === "Repasar" &&
                reviewCount !== undefined &&
                reviewCount > 0 && (
                  <span className="absolute -top-1 right-0 bg-terracotta text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                    {reviewCount}
                  </span>
                )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
