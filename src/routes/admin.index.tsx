import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  CheckCircle2,
  FileSpreadsheet,
  Package,
  Scale,
  Timer,
  Truck,
  Upload,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { fmtCurrency, fmtDate, fmtInt, fmtWeight } from "@/lib/format";
import { batchTotals, store, useStore } from "@/services/store";

export const Route = createFileRoute("/admin/")({
  component: OverviewPage,
});

function OverviewPage() {
  const batches = useStore((s) => s.batches);
  const drivers = store.getDrivers();

  const aggregate = batches.reduce(
    (acc, b) => {
      const t = batchTotals(b);
      acc.entregas += t.entregas;
      acc.peso += t.peso;
      acc.valor += t.valor;
      if (b.status === "disponivel" || b.status === "em_edicao")
        acc.aguardando += 1;
      if (b.status === "confirmado" || b.status === "arquivo_gerado")
        acc.confirmadas += 1;
      return acc;
    },
    { entregas: 0, peso: 0, valor: 0, aguardando: 0, confirmadas: 0 },
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Painel administrativo
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Visão geral das rotas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe lotes importados do Fusion e o status de organização das
            cargas.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link to="/admin/import">
            <Upload className="mr-2 h-4 w-4" /> Importar rota
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Lotes importados"
          value={fmtInt(batches.length)}
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <StatCard
          label="Cargas disponíveis"
          value={fmtInt(batches.length)}
          icon={<Truck className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Aguardando organização"
          value={fmtInt(aggregate.aguardando)}
          icon={<Timer className="h-4 w-4" />}
        />
        <StatCard
          label="Rotas confirmadas"
          value={fmtInt(aggregate.confirmadas)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="lime"
        />
        <StatCard
          label="Total de entregas"
          value={fmtInt(aggregate.entregas)}
          icon={<Package className="h-4 w-4" />}
        />
        <StatCard
          label="Peso total"
          value={fmtWeight(aggregate.peso)}
          icon={<Scale className="h-4 w-4" />}
        />
        <StatCard
          label="Valor total"
          value={fmtCurrency(aggregate.valor)}
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Motoristas"
          value={fmtInt(drivers.length)}
          icon={<Truck className="h-4 w-4" />}
        />
      </div>

      <section className="rounded-2xl border bg-card shadow-sm">
        <header className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-base font-semibold">Lotes recentes</h2>
            <p className="text-xs text-muted-foreground">
              Últimas importações do Fusion
            </p>
          </div>
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
        </header>

        <div className="divide-y">
          {batches.map((b) => {
            const t = batchTotals(b);
            const dr = drivers.find((d) => d.id === b.motoristaId);
            const dias = Array.from(new Set(b.squares.map((s) => s.data))).sort();
            const periodo =
              dias.length > 0
                ? `${fmtDate(dias[0])} — ${fmtDate(dias[dias.length - 1])}`
                : "-";
            return (
              <Link
                key={b.id}
                to="/admin/lotes/$batchId"
                params={{ batchId: b.id }}
                className="block p-4 transition-colors hover:bg-muted/40"
              >
                <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-foreground">
                      {b.codigo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Carga {b.carga} · {periodo}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Motorista: <span className="text-foreground">{dr?.nome ?? "-"}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-5">
                    <Fact label="Dias" value={fmtInt(t.dias)} />
                    <Fact label="Praças" value={fmtInt(t.pracas)} />
                    <Fact label="Entregas" value={fmtInt(t.entregas)} />
                    <Fact label="Peso" value={fmtWeight(t.peso)} />
                    <Fact label="Valor" value={fmtCurrency(t.valor)} />
                  </div>

                  <div className="flex md:justify-end">
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              </Link>
            );
          })}

          {batches.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum lote importado ainda.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}