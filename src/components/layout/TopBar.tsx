"use client";

import { Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";

export function TopBar({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border px-4 md:px-6 h-14 flex items-center gap-4">
      {/* Mobile menu trigger */}
      <Sheet>
        <SheetTrigger className={cn("md:hidden", buttonVariants({ variant: "ghost", size: "icon" }))}>
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      {title && (
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      )}
    </header>
  );
}
