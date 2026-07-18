import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Truck, ShieldCheck } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(var(--brand-blue) 1px, transparent 1px), linear-gradient(90deg, var(--brand-blue) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden
        className="absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-[color:var(--brand-lime)]/40 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -left-32 bottom-0 -z-10 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
      />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <div className="rounded-2xl bg-primary p-4 shadow-lg">
          <AppLogo variant="mark" className="mx-auto h-16 w-auto" />
        </div>

        <h1 className="mt-8 text-4xl font-black tracking-tight text-foreground sm:text-6xl">
          Master{" "}
          <span className="text-primary">
            Rotas
          </span>
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
          Organização inteligente das rotas de entrega.
        </p>

        <div className="mt-10 grid w-full gap-3 sm:grid-cols-2">
          <Button
            asChild
            size="lg"
            className="h-16 justify-between text-base font-semibold shadow-md"
          >
            <Link to="/admin">
              <span className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5" />
                Acessar como administrador
              </span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-16 justify-between border-2 text-base font-semibold hover:bg-[color:var(--brand-lime)]/20 hover:border-[color:var(--brand-lime)]"
          >
            <Link to="/rota/$routeCode" params={{ routeCode: "RT28860" }}>
              <span className="flex items-center gap-3">
                <Truck className="h-5 w-5" />
                Acessar como motorista
              </span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Versão 0 · Ambiente de validação com dados mockados
        </p>
      </main>

      <footer className="border-t bg-card/60 py-4 text-center text-xs text-muted-foreground backdrop-blur">
        <p className="font-semibold text-foreground">Master Distribuidora</p>
        <p className="mt-0.5">masterrotas.app@gmail.com</p>
      </footer>
    </div>
  );
}
