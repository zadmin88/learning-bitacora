export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-charcoal">
            Bitácora
          </h1>
          <p className="text-charcoal-light mt-2">
            Tu Diario de Aprendizaje de Inglés
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
