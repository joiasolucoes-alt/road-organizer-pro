import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  MapPin,
  Package,
  RotateCcw,
  Scale,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SortableList } from "@/components/SortableList";
import { SquareCard } from "@/components/SquareCard";
import { Button } from "@/components/ui/button";
import {
  fmtCurrency,
  fmtDateTime,
  fmtInt,
  fmtWeight,
} from "@/lib/format";
import { squareTotals, store, useStore } from "@/services/store";
import type { Delivery } from "@/types";

export const Route = createFileRoute("/rota/$routeCode/pracas")({
  component: PracasPage,
});

function PracasPage() {
  const { routeCode } = useParams({ from: "/rota/$routeCode/pracas" });
  const [expandedSquareId, setExpandedSquareId] = useState<string | null>(null);
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
            {locked ? (
              <>
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
                  Ver entregas
                  {expandedSquareId === sq.id ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                {expandedSquareId === sq.id && (
                  <DeliveriesPanel
                    deliveries={sq.deliveryIds.map(
                      (id) => batch.deliveries.find((d) => d.id === id)!,
                    )}
                  />
                )}
              </>
            ) : (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full justify-between"
              >
                <Link
                  to="/rota/$routeCode/pracas/$squareId"
                  params={{ routeCode, squareId: sq.id }}
                >
                  Organizar entregas
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        )}
      />

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

function DeliveriesPanel({ deliveries }: { deliveries: Delivery[] }) {
  return (
    <div className="space-y-2 rounded-xl border bg-muted/30 p-2">
      {deliveries.map((delivery, index) => (
        <DeliverySummary
          key={delivery.id}
          delivery={delivery}
          position={index + 1}
        />
      ))}
    </div>
  );
}

function DeliverySummary({
  delivery,
  position,
}: {
  delivery: Delivery;
  position: number;
}) {
  return (
    <article className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-primary px-2 text-sm font-bold text-primary-foreground">
          {position}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {delivery.cliente}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            Pedido {delivery.pedido} · NF {delivery.notaFiscal}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <p className="flex items-start gap-1.5 text-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span>
            {delivery.endereco}
            <br />
            <span className="text-muted-foreground">
              {delivery.bairro} · {delivery.cidade}/{delivery.uf}
            </span>
          </span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <InlineFact
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            label="Previsao"
            value={fmtDateTime(delivery.dataPrevistaEntrega)}
          />
          <InlineFact
            icon={<Scale className="h-3.5 w-3.5" />}
            label="Peso"
            value={fmtWeight(delivery.peso)}
          />
          <InlineFact
            icon={<Wallet className="h-3.5 w-3.5" />}
            label="Valor"
            value={fmtCurrency(delivery.valor)}
          />
          <InlineFact
            icon={<Package className="h-3.5 w-3.5" />}
            label="Itens"
            value={fmtInt(delivery.quantidadeItens)}
          />
        </div>
      </div>
    </article>
  );
}

function InlineFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-muted/60 px-2 py-1.5">
      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 break-words text-xs font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}
