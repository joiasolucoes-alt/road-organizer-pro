import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Package,
  RotateCcw,
  Scale,
  Shuffle,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DeliveryDetailsDrawer } from "@/components/DeliveryDetailsDrawer";
import { SortableList } from "@/components/SortableList";
import { SquareCard } from "@/components/SquareCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { fmtCurrency, fmtDate, fmtInt, fmtWeight } from "@/lib/format";
import { batchTotals, squareTotals, store, useStore } from "@/services/store";
import type {
  Batch,
  Delivery,
  DeliveryIssueReason,
  RouteChange,
  Square,
} from "@/types";

export const Route = createFileRoute("/rota/$routeCode/pracas")({
  component: PracasPage,
});

function PracasPage() {
  const { routeCode } = useParams({ from: "/rota/$routeCode/pracas" });
  const [detail, setDetail] = useState<Delivery | null>(null);
  const batch = useStore((s) =>
    s.batches.find((b) => b.routeCode === routeCode),
  )!;

  const locked = batch.status === "confirmado" || batch.status === "arquivo_gerado";
  const changed = batch.squares.some(
    (s) => s.ordemAtual !== s.ordemOriginal,
  );
  const totals = batchTotals(batch);
  const changedSquares = batch.changes.filter((c) => c.tipo === "praca");
  const changedDeliveries = batch.changes.filter((c) => c.tipo === "entrega");
  const trips = getTripGroups(batch);

  return (
    <div className="space-y-4 pb-24 xl:pb-4">
      <header className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              to="/rota/$routeCode"
              params={{ routeCode }}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao resumo
            </Link>
            <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
              Definir ordem das praças
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {locked
                ? "Esta rota já foi confirmada - visualização somente leitura."
                : "Arraste os cards ou use as setas para organizar a sequência de visita. Abra uma praça para definir a ordem das entregas."}
            </p>
          </div>
          <StatusBadge status={batch.status} />
        </div>
      </header>

      <DeliveryDetailsDrawer delivery={detail} onClose={() => setDetail(null)} />

      <div className="grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)_320px]">
        <aside className="order-2 space-y-3 xl:order-1 xl:sticky xl:top-28 xl:self-start">
          <SectionShell title="Viagens" icon={<CalendarDays className="h-4 w-4" />}>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {trips.map((trip, index) => (
                <TripSummary key={trip.date} trip={trip} index={index} />
              ))}
            </div>
          </SectionShell>
        </aside>

        <section className="order-1 space-y-3 xl:order-2">
          {changed && !locked && (
            <div className="rounded-lg border-l-4 border-[color:var(--brand-warn)] bg-[color:var(--brand-warn-bg)] px-3 py-2 text-xs font-medium text-[color:var(--brand-warn-fg)]">
              Ordem alterada em relação ao Fusion - clique em confirmar quando
              terminar.
            </div>
          )}

          {changed && !locked && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  store.resetAllOrders(batch.id);
                  toast.success("Ordem restaurada para o padrão do Fusion");
                }}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restaurar ordem
                original
              </Button>
            </div>
          )}

          <SortableList
            items={batch.squares}
            onReorder={(order) => {
              if (locked) return;
              store.reorderSquares(batch.id, order);
            }}
            renderItem={(sq) => (
              <div className="space-y-3">
                <SquareCard square={sq} totals={squareTotals(batch, sq.id)} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() =>
                    setExpandedSquareId((current) =>
                      current === sq.id ? null : sq.id,
                    )
                  }
                  aria-expanded={expandedSquareId === sq.id}
                >
                  {locked ? "Ver entregas" : "Organizar entregas"}
                  {expandedSquareId === sq.id ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                {expandedSquareId === sq.id && (
                  <DeliveriesPanel
                    batch={batch}
                    square={sq}
                    locked={locked}
                    onOpenDelivery={setDetail}
                  />
                )}
              </div>
            )}
          />
        </section>

        <aside className="order-3 space-y-3 xl:sticky xl:top-28 xl:self-start">
          <SectionShell
            title="Resumo da sequência"
            icon={<ClipboardList className="h-4 w-4" />}
          >
            <div className="grid grid-cols-2 gap-2">
              <SummaryFact label="Viagens" value={fmtInt(trips.length)} />
              <SummaryFact label="Praças" value={fmtInt(totals.pracas)} />
              <SummaryFact label="Entregas" value={fmtInt(totals.entregas)} />
              <SummaryFact label="Alterações" value={fmtInt(batch.changes.length)} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <SummaryFact
                label="Praças alteradas"
                value={fmtInt(changedSquares.length)}
              />
              <SummaryFact
                label="Entregas alteradas"
                value={fmtInt(changedDeliveries.length)}
              />
              <SummaryFact label="Peso" value={fmtWeight(totals.peso)} />
              <SummaryFact label="Valor" value={fmtCurrency(totals.valor)} />
            </div>
          </SectionShell>

          <div className="hidden rounded-2xl border bg-card p-3 shadow-sm xl:block">
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/rota/$routeCode" params={{ routeCode }}>
                  Voltar
                </Link>
              </Button>
              {locked ? (
                <Button asChild className="flex-[2]">
                  <Link
                    to="/rota/$routeCode/confirmada"
                    params={{ routeCode }}
                  >
                    Ver rota confirmada <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  className="flex-[2]"
                  onClick={() => toast.success("Ordem das praças salva")}
                >
                  <Link to="/rota/$routeCode/resumo" params={{ routeCode }}>
                    Continuar para o resumo
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 px-4 py-3 shadow-lg backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link to="/rota/$routeCode" params={{ routeCode }}>
              Voltar
            </Link>
          </Button>
          {locked ? (
            <Button asChild className="flex-[2]">
              <Link to="/rota/$routeCode/confirmada" params={{ routeCode }}>
                Ver rota confirmada <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              className="flex-[2]"
              onClick={() => toast.success("Ordem das praças salva")}
            >
              <Link to="/rota/$routeCode/resumo" params={{ routeCode }}>
                Continuar para o resumo
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function getTripGroups(batch: Batch) {
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

function SectionShell({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-3 shadow-sm">
      <header className="mb-3 flex items-center gap-2">
        <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
          {icon}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function TripSummary({
  trip,
  index,
}: {
  trip: ReturnType<typeof getTripGroups>[number];
  index: number;
}) {
  return (
    <article className="rounded-xl border bg-muted/25 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-primary">Viagem {index + 1}</p>
          <p className="mt-0.5 text-sm font-bold">{fmtDate(trip.date)}</p>
        </div>
        <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground ring-1 ring-border">
          {fmtInt(trip.squares.length)} praça(s)
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <SmallFact
          icon={<Package className="h-3.5 w-3.5" />}
          label="Entregas"
          value={fmtInt(trip.entregas)}
        />
        <SmallFact
          icon={<Scale className="h-3.5 w-3.5" />}
          label="Peso"
          value={fmtWeight(trip.peso)}
        />
        <SmallFact
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Valor"
          value={fmtCurrency(trip.valor)}
        />
        <SmallFact
          icon={<Shuffle className="h-3.5 w-3.5" />}
          label="Praças"
          value={trip.squares.map((square) => square.nome).join(", ")}
        />
      </div>
    </article>
  );
}

function SummaryFact({ label, value }: { label: string; value: string }) {
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

function SmallFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-card px-2 py-1.5 text-xs ring-1 ring-border">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-0.5 truncate font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DeliveriesPanel({
  batch,
  square,
  locked,
  onOpenDelivery,
}: {
  batch: Batch;
  square: Square;
  locked: boolean;
  onOpenDelivery: (delivery: Delivery) => void;
}) {
  const deliveries = square.deliveryIds.map(
    (id) => batch.deliveries.find((delivery) => delivery.id === id)!,
  );
  const originalPositions = getOriginalDeliveryPositions(
    batch.deliveries,
    square.deliveryIds,
  );
  const changed = deliveries.some(
    (delivery, index) => originalPositions.get(delivery.id) !== index + 1,
  );

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Entregas da praça
          </p>
          {!locked && (
            <p className="text-xs text-muted-foreground">
              Arraste ou use as setas para ordenar como nas praças.
            </p>
          )}
        </div>
        {changed && !locked && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              store.resetDeliveriesOrder(batch.id, square.id);
              toast.success("Sequência restaurada para o padrão do Fusion");
            }}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restaurar sequência
          </Button>
        )}
      </div>

      {locked ? (
        <div className="space-y-2">
          {deliveries.map((delivery, index) => (
            <div key={delivery.id} className="rounded-xl border bg-card p-3">
              <DeliveryCard
                delivery={delivery}
                positionInSquare={index + 1}
                originalPosition={originalPositions.get(delivery.id)}
                issueReason={getDeliveryIssueReason(batch.changes, delivery.id)}
                onOpen={() => onOpenDelivery(delivery)}
              />
            </div>
          ))}
        </div>
      ) : (
        <SortableList
          items={deliveries}
          onReorder={(order) => {
            store.reorderDeliveries(batch.id, square.id, order);
          }}
          renderItem={(delivery, index) => (
            <DeliveryCard
              delivery={delivery}
              positionInSquare={index + 1}
              originalPosition={originalPositions.get(delivery.id)}
              issueReason={getDeliveryIssueReason(batch.changes, delivery.id)}
              onIssueChange={(reason) => {
                store.setDeliveryIssue(batch.id, delivery.id, reason);
                toast.success(
                  reason ? "Ocorrência registrada" : "Ocorrência removida",
                );
              }}
              onOpen={() => onOpenDelivery(delivery)}
            />
          )}
        />
      )}
    </div>
  );
}

function getOriginalDeliveryPositions(
  deliveries: Delivery[],
  deliveryIds: string[],
) {
  const byOriginalOrder = [...deliveryIds].sort((a, z) => {
    const da = deliveries.find((delivery) => delivery.id === a);
    const dz = deliveries.find((delivery) => delivery.id === z);
    return (da?.ordemOriginal ?? 0) - (dz?.ordemOriginal ?? 0);
  });
  return new Map(byOriginalOrder.map((id, index) => [id, index + 1]));
}

function getDeliveryIssueReason(changes: RouteChange[], deliveryId: string) {
  const reason = changes.find(
    (change) => change.tipo === "entrega" && change.targetId === deliveryId,
  )?.motivo;
  if (
    reason === "Endereço errado" ||
    reason === "Restrição de horário" ||
    reason === "Inviável de entrega"
  ) {
    return reason satisfies DeliveryIssueReason;
  }
  return undefined;
}
