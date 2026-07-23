import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  MapPin,
  Package,
  RotateCcw,
  Scale,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DeliveryReorderRow } from "@/components/DeliveryReorderRow";
import { DeliveryDetailsDrawer } from "@/components/DeliveryDetailsDrawer";
import { SortableList } from "@/components/SortableList";
import { Button } from "@/components/ui/button";
import { fmtCurrency, fmtDate, fmtInt, fmtWeight } from "@/lib/format";
import { squareTotals, store, useStore } from "@/services/store";
import type { Delivery, DeliveryIssueReason, RouteChange } from "@/types";

export const Route = createFileRoute("/rota/$routeCode/pracas/$squareId")({
  component: SquareDeliveriesPage,
});

function SquareDeliveriesPage() {
  const { routeCode, squareId } = useParams({
    from: "/rota/$routeCode/pracas/$squareId",
  });
  const batch = useStore((s) =>
    s.batches.find((b) => b.routeCode === routeCode),
  )!;
  const sq = batch.squares.find((s) => s.id === squareId)!;
  const locked = batch.status === "confirmado" || batch.status === "arquivo_gerado";
  const [detail, setDetail] = useState<Delivery | null>(null);

  const items = sq.deliveryIds.map(
    (id) => batch.deliveries.find((d) => d.id === id)!,
  );
  const originalPositions = getOriginalDeliveryPositions(
    batch.deliveries,
    sq.deliveryIds,
  );

  const changed = items.some(
    (d, i) => originalPositions.get(d.id) !== i + 1,
  );
  const totals = squareTotals(batch, squareId);

  const list = (
    <SortableList
      items={items}
      onReorder={(order) => {
        if (locked) return;
        store.reorderDeliveries(batch.id, squareId, order);
      }}
      renderItem={(d, i) => (
        <DeliveryReorderRow
          delivery={d}
          positionInSquare={i + 1}
          originalPosition={originalPositions.get(d.id)}
          issueReason={getDeliveryIssueReason(batch.changes, d.id)}
          onIssueChange={
            locked
              ? undefined
              : (reason) => {
                  store.setDeliveryIssue(batch.id, d.id, reason);
                  toast.success(
                    reason ? "Ocorrência registrada" : "Ocorrência removida",
                  );
                }
          }
          onOpen={() => setDetail(d)}
        />
      )}
    />
  );

  return (
    <div className="pb-24 lg:pb-6">
      <header className="mb-4">
        <Link
          to="/rota/$routeCode/pracas"
          params={{ routeCode }}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar às praças
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
          {sq.nome}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> {fmtDate(sq.data)}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {sq.cidade}/{sq.uf}
          </span>
          <span aria-hidden>·</span>
          <span>{items.length} entregas</span>
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-3">
          {locked && (
            <div className="rounded-lg border-l-4 border-primary bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
              Rota confirmada — visualização somente leitura.
            </div>
          )}
          {changed && !locked && (
            <div className="flex items-center justify-between gap-2 rounded-lg border-l-4 border-[color:var(--brand-warn)] bg-[color:var(--brand-warn-bg)] px-3 py-1.5 text-xs font-medium text-[color:var(--brand-warn-fg)] lg:hidden">
              <span>Sequência alterada</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[color:var(--brand-warn-fg)] hover:bg-[color:var(--brand-warn)]/10"
                onClick={() => {
                  store.resetDeliveriesOrder(batch.id, squareId);
                  toast.success("Sequência restaurada");
                }}
              >
                <RotateCcw className="mr-1 h-3 w-3" /> Restaurar
              </Button>
            </div>
          )}
          {!locked && (
            <p className="text-[11px] text-muted-foreground">
              Toque no nome para ver detalhes. Arraste ou use as setas para
              reordenar.
            </p>
          )}
          {list}
        </section>

        <aside className="hidden space-y-3 lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Resumo da praça
            </p>
            <p className="mt-1 truncate text-base font-bold">{sq.nome}</p>
            <p className="text-xs text-muted-foreground">
              {sq.cidade}/{sq.uf} · {fmtDate(sq.data)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <SideFact
                icon={<Package className="h-3.5 w-3.5" />}
                label="Entregas"
                value={fmtInt(totals.entregas)}
              />
              <SideFact
                icon={<Scale className="h-3.5 w-3.5" />}
                label="Peso"
                value={fmtWeight(totals.peso)}
              />
              <SideFact
                icon={<Wallet className="h-3.5 w-3.5" />}
                label="Valor"
                value={fmtCurrency(totals.valor)}
              />
              <SideFact
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                label="Data"
                value={fmtDate(sq.data)}
              />
            </div>
            {changed && !locked && (
              <div className="mt-3 rounded-lg border-l-4 border-[color:var(--brand-warn)] bg-[color:var(--brand-warn-bg)] px-3 py-2 text-xs font-medium text-[color:var(--brand-warn-fg)]">
                Sequência alterada em relação ao Fusion.
              </div>
            )}
            {changed && !locked && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => {
                  store.resetDeliveriesOrder(batch.id, squareId);
                  toast.success("Sequência restaurada");
                }}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restaurar original
              </Button>
            )}
          </div>

          <Button
            asChild
            size="lg"
            className="w-full"
            onClick={() => toast.success("Sequência salva")}
          >
            <Link to="/rota/$routeCode/pracas" params={{ routeCode }}>
              Salvar sequência <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </aside>
      </div>

      <DeliveryDetailsDrawer
        delivery={detail}
        onClose={() => setDetail(null)}
      />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 px-4 py-3 shadow-lg backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link to="/rota/$routeCode/pracas" params={{ routeCode }}>
              Voltar
            </Link>
          </Button>
          <Button
            asChild
            className="flex-[2]"
            onClick={() => toast.success("Sequência salva")}
          >
            <Link to="/rota/$routeCode/pracas" params={{ routeCode }}>
              Salvar sequência <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SideFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted/45 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-0.5 truncate text-sm font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}

function getOriginalDeliveryPositions(
  deliveries: Delivery[],
  deliveryIds: string[],
) {
  const byOriginalOrder = [...deliveryIds].sort((a, z) => {
    const da = deliveries.find((d) => d.id === a);
    const dz = deliveries.find((d) => d.id === z);
    return (da?.ordemOriginal ?? 0) - (dz?.ordemOriginal ?? 0);
  });
  return new Map(byOriginalOrder.map((id, index) => [id, index + 1]));
}

function getDeliveryIssueReason(
  changes: RouteChange[],
  deliveryId: string,
): DeliveryIssueReason | undefined {
  return changes.find(
    (change) => change.tipo === "entrega" && change.targetId === deliveryId,
  )?.ocorrencia;
}
