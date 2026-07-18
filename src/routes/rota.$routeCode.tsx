import {
  createFileRoute,
  Link,
  Outlet,
  useParams,
} from "@tanstack/react-router";
import { ArrowLeft, Truck } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { store, useStore } from "@/services/store";

export const Route = createFileRoute("/rota/$routeCode")({
  component: DriverLayout,
});

function DriverLayout() {
  const { routeCode } = useParams({ from: "/rota/$routeCode" });
  const batch = useStore((s) => s.batches.find((b) => b.routeCode === routeCode));
  const driver = batch
    ? store.getDrivers().find((d) => d.id === batch.motoristaId)
    : null;

  if (!batch) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-sm">
          <Truck className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-semibold">Rota não encontrada</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifique o código de acesso com o operador logístico.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="rounded-lg bg-white/10 p-1.5">
            <AppLogo variant="mark" className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs uppercase tracking-wider text-primary-foreground/70">
              Master Rotas · {driver?.nome ?? "Motorista"}
            </p>
            <p className="truncate text-sm font-bold">
              Carga {batch.carga} · {batch.routeCode}
            </p>
          </div>
          <Link
            to="/"
            className="rounded-md bg-white/10 px-2 py-1 text-xs font-medium hover:bg-white/20"
          >
            Sair
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-4 sm:py-6">
        <Outlet />
      </div>
    </div>
  );
}