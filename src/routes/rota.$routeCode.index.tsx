import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Info,
  MapPin,
  Package,
  RouteIcon,
  Scale,
  Shuffle,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtCurrency, fmtDate, fmtInt, fmtWeight } from "@/lib/format";
import { batchTotals, squareTotals, useStore } from "@/services/store";
import type { Batch, Square } from "@/types";

export const Route = createFileRoute("/rota/$routeCode/")({
  component: DriverSummary,
});

function DriverSummary() {
  const { routeCode } = useParams({ from: "/rota/$routeCode/" });
  const batch = useStore((s) => s.batches.find((b) => b.routeCode === routeCode))!;
  const t = batchTotals(batch);
  const dias = Array.from(new Set(batch.squares.map((s) => s.data))).sort();
  const trips = buildTrips(batch);
  const changedSquares = new Set(
    batch.changes.filter((c) => c.tipo === "praca").map((c) => c.targetId),
  );
  const changedDeliveries = new Set(
    batch.changes.filter((c) => c.tipo === "entrega").map((c) => c.targetId),
  );
  const locked = batch.status === "confirmado" || batch.status === "arquivo_gerado";

  const feitas = Object.keys(batch.execucao?.registros ?? {}).length;
  const rotuloExecucao = batch.execucao?.concluidaEm
    ? "Ver rota concluída"
    : feitas > 0
      ? `Continuar rota (${feitas}/${t.entregas})`
      : "Iniciar rota";

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b bg-primary px-4 py-4 text-primary-foreground sm:px-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/75">
                Resumo da sua rota
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                Sequência da viagem
              </h1>
              <p className="mt-1 text-sm text-primary-foreground/80">
                Período planejado: {fmtDate(dias[0])} -{" "}
                {fmtDate(dias[dias.length - 1])}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {batch.changes.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-warn-bg)] px-2.5 py-1 text-xs font-semibold text-[color:var(--brand-warn-fg)]">
                  <Shuffle className="h-3.5 w-3.5" />
                  {batch.changes.length} alteração(ões)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <RouteMetric
            label="Viagens"
            value={fmtInt(trips.length)}
            icon={<RouteIcon className="h-4 w-4" />}
            tone="brand"
          />
          <RouteMetric
            label="Praças"
            value={fmtInt(t.pracas)}
            icon={<MapPin className="h-4 w-4" />}
          />
          <RouteMetric
            label="Entregas"
            value={fmtInt(t.entregas)}
            icon={<Package className="h-4 w-4" />}
          />
          <RouteMetric
            label="Peso total"
            value={fmtWeight(t.peso)}
            icon={<Scale className="h-4 w-4" />}
          />
          <RouteMetric
            label="Valor total"
            value={fmtCurrency(t.valor)}
            icon={<Wallet className="h-4 w-4" />}
          />
          <RouteMetric
            label="Período"
            value={`${fmtDate(dias[0])} - ${fmtDate(dias[dias.length - 1])}`}
            icon={<CalendarDays className="h-4 w-4" />}
          />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-3">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Viagens planejadas
              </h2>
              <p className="text-sm text-muted-foreground">
                Organize a ordem das praças e a sequência das entregas de cada
                viagem.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {trips.map((trip, index) => {
              const tripChanged = trip.squares.some(
                (sq) =>
                  changedSquares.has(sq.id) ||
                  sq.deliveryIds.some((id) => changedDeliveries.has(id)),
              );
              return (
                <TripCard
                  key={trip.date}
                  trip={trip}
                  index={index}
                  locked={locked}
                  changed={tripChanged}
                  status={batch.status}
                />
              );
            })}
          </div>
        </section>

        <aside className="space-y-3 xl:sticky xl:top-28 xl:self-start">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Orientação da rota</h2>
            <div className="mt-3 rounded-xl border-l-4 border-[color:var(--brand-warn)] bg-[color:var(--brand-warn-bg)] p-3 text-sm text-[color:var(--brand-warn-fg)]">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  <strong>
                    Todas as praças e entregas desta carga são obrigatórias.
                  </strong>{" "}
                  Você pode apenas alterar a ordem de visita das praças e a
                  sequência das entregas.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <SideFact label="Praças" value={fmtInt(t.pracas)} />
              <SideFact label="Entregas" value={fmtInt(t.entregas)} />
              <SideFact label="Peso" value={fmtWeight(t.peso)} />
              <SideFact label="Valor" value={fmtCurrency(t.valor)} />
            </div>
          </div>

          <div className="hidden rounded-2xl border bg-card p-4 shadow-sm lg:block">
            {locked ? (
              <div className="space-y-2">
                <Button asChild size="lg" className="w-full">
                  <Link
                    to="/rota/$routeCode/executar"
                    params={{ routeCode: batch.routeCode }}
                  >
                    {rotuloExecucao} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link
                    to="/rota/$routeCode/pracas"
                    params={{ routeCode: batch.routeCode }}
                  >
                    Ver praças e entregas
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link
                    to="/rota/$routeCode/confirmada"
                    params={{ routeCode: batch.routeCode }}
                  >
                    Comprovante da rota
                  </Link>
                </Button>
              </div>
            ) : (
              <Button asChild size="lg" className="w-full">
                <Link
                  to="/rota/$routeCode/pracas"
                  params={{ routeCode: batch.routeCode }}
                >
                  Organizar minha rota <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </aside>
      </div>

      {/* Confirmar bloqueia a EDIÇÃO da ordem — não o acesso às entregas.
          Daqui em diante o motorista precisa é rodar a rota. */}
      {locked && (
        <div className="sticky bottom-3 z-20 space-y-2 lg:hidden">
          <Button
            asChild
            size="lg"
            className="h-14 w-full text-base font-semibold shadow-lg"
          >
            <Link
              to="/rota/$routeCode/executar"
              params={{ routeCode: batch.routeCode }}
            >
              {rotuloExecucao} <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="bg-card">
              <Link
                to="/rota/$routeCode/pracas"
                params={{ routeCode: batch.routeCode }}
              >
                Ver entregas
              </Link>
            </Button>
            <Button asChild variant="outline" className="bg-card">
              <Link
                to="/rota/$routeCode/confirmada"
                params={{ routeCode: batch.routeCode }}
              >
                Comprovante
              </Link>
            </Button>
          </div>
        </div>
      )}

      {!locked && (
        <div className="sticky bottom-3 z-20 lg:hidden">
        <Button asChild size="lg" className="h-14 w-full text-base font-semibold shadow-lg">
          <Link
            to="/rota/$routeCode/pracas"
            params={{ routeCode: batch.routeCode }}
          >
            Organizar minha rota <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
      )}
    </div>
  );
}

interface TripGroup {
  date: string;
  squares: Square[];
  peso: number;
  valor: number;
  entregas: number;
}

function buildTrips(batch: Batch): TripGroup[] {
  const groups = new Map<string, Square[]>();
  batch.squares.forEach((square) => {
    const list = groups.get(square.data) ?? [];
    list.push(square);
    groups.set(square.data, list);
  });

  return Array.from(groups.entries())
    .sort(([a], [z]) => a.localeCompare(z))
    .map(([date, squares]) => {
      const totals = squares.reduce(
        (acc, square) => {
          const t = squareTotals(batch, square.id);
          acc.peso += t.peso;
          acc.valor += t.valor;
          acc.entregas += t.entregas;
          return acc;
        },
        { peso: 0, valor: 0, entregas: 0 },
      );
      return { date, squares, ...totals };
    });
}

function RouteMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "brand";
}) {
  return (
    <div
      className={
        tone === "brand"
          ? "rounded-xl border border-primary/20 bg-primary/10 p-3"
          : "rounded-xl border bg-muted/30 p-3"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-1 truncate text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function TripCard({
  trip,
  index,
  locked,
  changed,
  status,
}: {
  trip: TripGroup;
  index: number;
  locked: boolean;
  changed: boolean;
  status: Batch["status"];
}) {
  const stateLabel = locked
    ? "Viagem confirmada"
    : changed
      ? "Viagem alterada"
      : status === "em_edicao"
        ? "Em organização"
        : "Não iniciada";

  return (
    <article className="flex min-h-[210px] flex-col rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Viagem {index + 1}
          </p>
          <h3 className="mt-1 flex items-center gap-1.5 text-base font-bold">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            {fmtDate(trip.date)}
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-foreground">
          {locked ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          ) : changed ? (
            <Shuffle className="h-3.5 w-3.5 text-[color:var(--brand-warn-fg)]" />
          ) : (
            <RouteIcon className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {stateLabel}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <SideFact label="Praças" value={fmtInt(trip.squares.length)} />
        <SideFact label="Entregas" value={fmtInt(trip.entregas)} />
        <SideFact label="Peso" value={fmtWeight(trip.peso)} />
        <SideFact label="Valor" value={fmtCurrency(trip.valor)} />
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Praças
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {trip.squares.map((square) => (
            <span
              key={square.id}
              className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
            >
              {square.nome}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function SideFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/45 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}
