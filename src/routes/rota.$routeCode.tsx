import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Loader2, LogOut, Package, RouteIcon, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppLogo } from "@/components/AppLogo";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate } from "@/lib/format";
import {
  batchTotals,
  driverSession,
  store,
  useStore,
  useSyncStatus,
} from "@/services/store";

export const Route = createFileRoute("/rota/$routeCode")({
  // O link do motorista NÃO carrega o código de acesso — segurança acima
  // de conveniência (link pode ser encaminhado/vazar). Quando não há sessão
  // ativa, mandamos para /rota com o código da rota pré-preenchido; o
  // motorista digita apenas o código de acesso (segundo fator).
  component: DriverLayout,
});

function DriverLayout() {
  const { routeCode } = useParams({ from: "/rota/$routeCode" });
  const navigate = useNavigate();
  const batch = useStore((s) => s.batches.find((b) => b.routeCode === routeCode));
  const syncStatus = useSyncStatus();
  const [authorized, setAuthorized] = useState(false);

  // Enquanto o Supabase não respondeu, ainda não dá para afirmar que a rota
  // não existe nem que o acesso é inválido.
  const loading = syncStatus === "syncing";

  useEffect(() => {
    if (loading) return;
    const s = driverSession.get();
    if (s && s.routeCode === routeCode) {
      setAuthorized(true);
      return;
    }
    // Sem sessão: manda para a tela de acesso com o código da rota
    // pré-preenchido — o motorista informa só o código de acesso.
    void navigate({ to: "/rota", search: { r: routeCode } });
  }, [routeCode, navigate, loading]);

  // Registra a abertura uma vez por sessão do navegador: o admin precisa saber
  // se o link chegou, mas navegar entre telas não é uma nova abertura.
  useEffect(() => {
    if (!authorized || !batch) return;
    const chave = `master-rotas:aberto:${batch.routeCode}`;
    if (sessionStorage.getItem(chave)) return;
    sessionStorage.setItem(chave, "1");
    store.registerAccess(batch.id);
  }, [authorized, batch]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando sua rota…</p>
      </div>
    );
  }

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
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:px-6 sm:py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
          {/* Linha 1 no mobile: identidade + status + sair, tudo lado a lado. */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="rounded-lg bg-primary/10 p-1 ring-1 ring-primary/15 sm:rounded-xl sm:p-1.5">
              <AppLogo variant="mark" className="h-7 w-7 sm:h-9 sm:w-9" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
                Master Rotas
              </p>
              <p className="truncate text-sm font-bold text-foreground sm:text-base">
                {driver?.nome ?? "Motorista"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              <StatusBadge status={batch.status} />
              <button
                type="button"
                onClick={logout}
                aria-label="Sair da rota"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Os três fatos cabem numa linha só — empilhar comia 1/3 da tela. */}
          <div className="grid grid-cols-3 gap-1.5 text-xs text-muted-foreground sm:gap-2 lg:min-w-[520px]">
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

          <div className="hidden items-center justify-end gap-3 lg:flex">
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
    <div className="flex min-w-0 items-center gap-1.5 rounded-lg bg-muted/45 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
      <span className="hidden shrink-0 text-primary sm:block">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[9px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[10px]">
          {label}
        </span>
        <span className="block truncate text-[11px] font-semibold text-foreground sm:text-xs">
          {value}
        </span>
      </span>
    </div>
  );
}
