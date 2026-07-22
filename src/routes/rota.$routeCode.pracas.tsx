import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DeliveryCard } from "@/components/DeliveryCard";
import { DeliveryDetailsDrawer } from "@/components/DeliveryDetailsDrawer";
import { SortableList } from "@/components/SortableList";
import { SquareCard } from "@/components/SquareCard";
import { Button } from "@/components/ui/button";
import { squareTotals, store, useStore } from "@/services/store";
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
  const [expandedSquareId, setExpandedSquareId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Delivery | null>(null);
  const batch = useStore((s) =>
    s.batches.find((b) => b.routeCode === routeCode),
  )!;

  const locked = batch.status === "confirmado" || batch.status === "arquivo_gerado";
  const changed = batch.squares.some(
    (s) => s.ordemAtual !== s.ordemOriginal,
  );

  return (
    <div className="space-y-4 pb-24">
      <header>
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
        <p className="mt-1 text-sm text-muted-foreground">
          {locked
            ? "Esta rota já foi confirmada — visualização somente leitura."
            : "Arraste os cards ou use as setas para organizar a sequência de visita. Toque em uma praça para reordenar as entregas."}
        </p>
      </header>

      {changed && !locked && (
        <div className="rounded-lg border-l-4 border-[color:var(--brand-warn)] bg-[color:var(--brand-warn-bg)] px-3 py-2 text-xs font-medium text-[color:var(--brand-warn-fg)]">
          Ordem alterada em relação ao Fusion — clique em confirmar quando
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
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restaurar ordem original
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

      <DeliveryDetailsDrawer delivery={detail} onClose={() => setDetail(null)} />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
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
