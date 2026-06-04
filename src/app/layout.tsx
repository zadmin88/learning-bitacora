import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ConvexProvider } from "@/components/providers/ConvexProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bitácora — Tu Diario de Aprendizaje de Inglés",
  description:
    "Un diario de aprendizaje potenciado por IA que combate la curva del olvido con repetición espaciada, recuerdo activo y búsqueda semántica.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ConvexProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ConvexProvider>
      </body>
    </html>
  );
}
