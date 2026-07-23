import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, LogOut, Package, RouteIcon, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppLogo } from "@/components/AppLogo";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate } from "@/lib/format";
import { batchTotals, driverSession, store, useStore } from "@/services/store";

export const Route = createFileRoute("/rota/$routeCode")({
  component: DriverLayout,
});

function DriverLayout() {
  const { routeCode } = useParams({ from: "/rota/$routeCode" });
  const navigate = useNavigate();
  const batch = useStore((s) => s.batches.find((b) => b.routeCode === routeCode));
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const s = driverSession.get();
    if (!s || s.routeCode !== routeCode) {
      void navigate({ to: "/rota" });
      return;
    }
    setAuthorized(true);
  }, [routeCode, navigate]);

  const driver = batch
    ? store.getDrivers().find((d) => d.id === batch.motoristaId)
    : null;
  const totals = batch ? batchTotals(batch) : null;
  const dias = batch
    ? Array.from(new Set(batch.squares.map((s) => s.data))).sort()
    : [];
  const periodo =
    dias.length > 0
      ? `${fmtDate(dias[0])} - ${fmtDate(dias[dias.length - 1])}`
      : "-";

  function logout() {
    driverSession.logout();
    toast.success("Você saiu da rota");
    void navigate({ to: "/" });
  }

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
            to="/rota"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Tentar outro código
          </Link>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-1.5 ring-1 ring-primary/15">
              <AppLogo variant="mark" className="h-9 w-9" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Master Rotas
              </p>
              <p className="truncate text-base font-bold text-foreground">
                {driver?.nome ?? "Motorista"}
              </p>
            </div>
          </div>

          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3 lg:min-w-[520px]">
            <HeaderFact
              icon={<RouteIcon className="h-4 w-4" />}
              label="Carga"
              value={`${batch.carga} · ${batch.routeCode}`}
            />
            <HeaderFact
              icon={<CalendarDays className="h-4 w-4" />}
              label="Período"
              value={periodo}
            />
            <HeaderFact
              icon={<Package className="h-4 w-4" />}
              label="Entregas"
              value={`${totals?.entregas ?? 0} entregas`}
            />
          </div>

          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <StatusBadge status={batch.status} />
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-9 items-center gap-1 rounded-md border bg-background px-3 text-xs font-semibold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <Outlet />
      </div>
    </div>
  );
}

function HeaderFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/45 px-3 py-2">
      <span className="shrink-0 text-primary">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="block truncate font-semibold text-foreground">
          {value}
        </span>
      </span>
    </div>
  );
}
