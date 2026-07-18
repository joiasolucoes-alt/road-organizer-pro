import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Info,
  MapPin,
  Package,
  Scale,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { fmtCurrency, fmtDate, fmtInt, fmtWeight } from "@/lib/format";
import { batchTotals, useStore } from "@/services/store";

export const Route = createFileRoute("/rota/$routeCode/")({
  component: DriverSummary,
});

function DriverSummary() {
  const { routeCode } = useParams({ from: "/rota/$routeCode/" });
  const batch = useStore((s) => s.batches.find((b) => b.routeCode === routeCode))!;
  const t = batchTotals(batch);
  const dias = Array.from(new Set(batch.squares.map((s) => s.data))).sort();

  return (
    <div className="space-y-5">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Resumo da sua rota
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {dias.length} dias · {t.pracas} praças
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Período: {fmtDate(dias[0])} — {fmtDate(dias[dias.length - 1])}
        </p>
        <div className="mt-2">
          <StatusBadge status={batch.status} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Praças"
          value={fmtInt(t.pracas)}
          icon={<MapPin className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Entregas"
          value={fmtInt(t.entregas)}
          icon={<Package className="h-4 w-4" />}
        />
        <StatCard
          label="Peso total"
          value={fmtWeight(t.peso)}
          icon={<Scale className="h-4 w-4" />}
        />
        <StatCard
          label="Valor total"
          value={fmtCurrency(t.valor)}
          icon={<Wallet className="h-4 w-4" />}
        />
      </div>

      <div className="rounded-xl border-l-4 border-[color:var(--brand-warn)] bg-[color:var(--brand-warn-bg)] p-3 text-sm text-[color:var(--brand-warn-fg)]">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Todas as praças e entregas desta carga são obrigatórias.</strong>{" "}
            Você pode apenas alterar a ordem de visita das praças e a sequência
            das entregas.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-1 shadow-sm">
        <header className="px-3 pt-3 pb-1">
          <h2 className="text-sm font-semibold">Dias planejados</h2>
        </header>
        <ul className="divide-y">
          {batch.squares.map((sq) => (
            <li key={sq.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{sq.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtDate(sq.data)} · {sq.deliveryIds.length} entregas
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {(batch.status === "confirmado" || batch.status === "arquivo_gerado") && (
        <Button asChild size="lg" className="w-full">
          <Link
            to="/rota/$routeCode/confirmada"
            params={{ routeCode: batch.routeCode }}
          >
            Ver rota confirmada <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      )}

      <div className="sticky bottom-3 z-20">
        <Button asChild size="lg" className="h-14 w-full text-base font-semibold shadow-lg">
          <Link
            to="/rota/$routeCode/pracas"
            params={{ routeCode: batch.routeCode }}
          >
            Organizar minha rota <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}