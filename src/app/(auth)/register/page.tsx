"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      no register for now
    </div>
  );
  // const { signIn } = useAuthActions();
  // const router = useRouter();
  // const [name, setName] = useState("");
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");
  // const [confirmPassword, setConfirmPassword] = useState("");
  // const [showPassword, setShowPassword] = useState(false);
  // const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // const [error, setError] = useState("");
  // const [loading, setLoading] = useState(false);

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setError("");
  //   if (password !== confirmPassword) {
  //     setError("Las contraseñas no coinciden.");
  //     return;
  //   }
  //   setLoading(true);
  //   try {
  //     await signIn("password", { email, password, name, flow: "signUp" });
  //     router.push("/");
  //   } catch {
  //     setError("No se pudo crear la cuenta. Es posible que el correo ya esté en uso.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // return (
  //   <Card className="border-cream-dark">
  //     <CardHeader>
  //       <CardTitle className="font-display text-2xl">Crear cuenta</CardTitle>
  //       <CardDescription>
  //         Comienza a construir tu diario personal de aprendizaje
  //       </CardDescription>
  //     </CardHeader>
  //     <form onSubmit={handleSubmit}>
  //       <CardContent className="space-y-4">
  //         {error && (
  //           <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">
  //             {error}
  //           </div>
  //         )}
  //         <div className="space-y-2">
  //           <Label htmlFor="name">Nombre</Label>
  //           <Input
  //             id="name"
  //             type="text"
  //             placeholder="Tu nombre"
  //             value={name}
  //             onChange={(e) => setName(e.target.value)}
  //             required
  //           />
  //         </div>
  //         <div className="space-y-2">
  //           <Label htmlFor="email">Correo electrónico</Label>
  //           <Input
  //             id="email"
  //             type="email"
  //             placeholder="tu@ejemplo.com"
  //             value={email}
  //             onChange={(e) => setEmail(e.target.value)}
  //             required
  //           />
  //         </div>
  //         <div className="space-y-2">
  //           <Label htmlFor="password">Contraseña</Label>
  //           <div className="relative">
  //             <Input
  //               id="password"
  //               type={showPassword ? "text" : "password"}
  //               placeholder="••••••••"
  //               value={password}
  //               onChange={(e) => setPassword(e.target.value)}
  //               required
  //               minLength={8}
  //             />
  //             <button
  //               type="button"
  //               className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
  //               onClick={() => setShowPassword(!showPassword)}
  //               tabIndex={-1}
  //             >
  //               {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  //             </button>
  //           </div>
  //         </div>
  //         <div className="space-y-2">
  //           <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
  //           <div className="relative">
  //             <Input
  //               id="confirmPassword"
  //               type={showConfirmPassword ? "text" : "password"}
  //               placeholder="••••••••"
  //               value={confirmPassword}
  //               onChange={(e) => setConfirmPassword(e.target.value)}
  //               required
  //               minLength={8}
  //             />
  //             <button
  //               type="button"
  //               className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
  //               onClick={() => setShowConfirmPassword(!showConfirmPassword)}
  //               tabIndex={-1}
  //             >
  //               {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  //             </button>
  //           </div>
  //         </div>
  //       </CardContent>
  //       <CardFooter className="flex flex-col gap-4">
  //         <Button
  //           type="submit"
  //           className="w-full bg-terracotta hover:bg-terracotta-dark"
  //           disabled={loading}
  //         >
  //           {loading ? "Creando cuenta..." : "Crear cuenta"}
  //         </Button>
  //         <p className="text-sm text-muted-foreground">
  //           ¿Ya tienes una cuenta?{" "}
  //           <Link
  //             href="/login"
  //             className="text-terracotta hover:underline font-medium"
  //           >
  //             Iniciar sesión
  //           </Link>
  //         </p>
  //       </CardFooter>
  //     </form>
  //   </Card>
  // );
}
