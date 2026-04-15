import type { Metadata } from "next";
import { Lora, Source_Sans_3 } from "next/font/google";
import { ConvexProvider } from "@/components/providers/ConvexProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const lora = Lora({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
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
      className={`${lora.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ConvexProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ConvexProvider>
      </body>
    </html>
  );
}
