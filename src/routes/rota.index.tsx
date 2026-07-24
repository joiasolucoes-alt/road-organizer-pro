import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, Truck } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { driverSession, store, useStore } from "@/services/store";

export const Route = createFileRoute("/rota/")({
  // `r` = código da rota pré-preenchido pelo link enviado ao motorista.
  validateSearch: (search: Record<string, unknown>): { r?: string } =>
    typeof search.r === "string" ? { r: search.r } : {},
  head: () => ({
    meta: [
      { title: "Acesso do motorista — Master Rotas" },
      {
        name: "description",
        content: "Digite o código da rota e o código de acesso para começar.",
      },
      { property: "og:title", content: "Acesso do motorista — Master Rotas" },
      {
        property: "og:description",
        content: "Portal do motorista da Master Distribuidora.",
      },
    ],
  }),
  component: DriverLoginPage,
});

function DriverLoginPage() {
  const navigate = useNavigate();
  const { r: routeFromLink } = Route.useSearch();
  const [routeCode, setRouteCode] = useState((routeFromLink ?? "").toUpperCase());
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [existingSession, setExistingSession] = useState<string | null>(null);
  const batches = useStore((s) => s.batches);

  useEffect(() => {
    const s = driverSession.get();
    if (s && store.getBatchByRoute(s.routeCode)) {
      setExistingSession(s.routeCode);
    }
  }, []);

  // Se o link mudar (navegação interna), reflete no campo.
  useEffect(() => {
    if (routeFromLink) setRouteCode(routeFromLink.toUpperCase());
  }, [routeFromLink]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const session = driverSession.login(routeCode, accessCode);
    if (!session) {
      setError("Código da rota ou código de acesso inválido.");
      return;
    }
    toast.success("Acesso liberado");
    void navigate({
      to: "/rota/$routeCode",
      params: { routeCode: session.routeCode },
    });
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-[color:var(--brand-lime)]/40 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -left-32 bottom-0 -z-10 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
      />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-primary p-3 shadow">
            <AppLogo variant="mark" className="h-8 w-8" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Portal do motorista
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Acessar rota</h1>
          </div>
        </div>

        {existingSession && (
          <div className="mb-4 rounded-xl border bg-[color:var(--brand-lime)]/15 p-3 text-sm">
            <p className="font-semibold">
              Você tem uma rota em andamento: {existingSession}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  navigate({
                    to: "/rota/$routeCode",
                    params: { routeCode: existingSession },
                  })
                }
              >
                Continuar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  driverSession.logout();
                  setExistingSession(null);
                }}
              >
                Sair
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div>
            <Label htmlFor="routeCode">Código da rota</Label>
            <Input
              id="routeCode"
              placeholder="RT00000"
              autoCapitalize="characters"
              value={routeCode}
              onChange={(e) => setRouteCode(e.target.value.toUpperCase())}
              className="mt-1 font-mono"
              required
            />
          </div>
          <div>
            <Label htmlFor="accessCode">Código de acesso</Label>
            <Input
              id="accessCode"
              placeholder="XXXX-XX"
              autoCapitalize="characters"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              className="mt-1 font-mono tracking-widest"
              required
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full">
            <KeyRound className="mr-2 h-4 w-4" /> Entrar na rota
          </Button>
        </form>

        <p className="mt-5 flex items-start gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Os códigos são enviados pelo operador logístico junto com o link da
            rota. Pelo link, o acesso é automático.
          </span>
        </p>
      </main>
    </div>
  );
}