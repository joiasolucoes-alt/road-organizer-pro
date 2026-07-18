import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DeliveryCard } from "@/components/DeliveryCard";
import { DeliveryDetailsDrawer } from "@/components/DeliveryDetailsDrawer";
import { SortableList } from "@/components/SortableList";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";
import { store, useStore } from "@/services/store";
import type { Delivery } from "@/types";

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
  const [detail, setDetail] = useState<Delivery | null>(null);

  const items = sq.deliveryIds.map(
    (id) => batch.deliveries.find((d) => d.id === id)!,
  );

  const changed = items.some((d, i) => d.ordemOriginal !== i + 1);

  return (
    <div className="space-y-4 pb-24">
      <header>
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
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> {fmtDate(sq.data)}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {sq.cidade}/{sq.uf}
          </span>
          <span aria-hidden>·</span>
          <span>{items.length} entregas obrigatórias</span>
        </p>
      </header>

      {changed && (
        <div className="rounded-lg border-l-4 border-[color:var(--brand-warn)] bg-[color:var(--brand-warn-bg)] px-3 py-2 text-xs font-medium text-[color:var(--brand-warn-fg)]">
          Sequência alterada em relação ao Fusion.
        </div>
      )}

      <SortableList
        items={items}
        onReorder={(order) => {
          store.reorderDeliveries(batch.id, squareId, order);
        }}
        renderItem={(d, i) => (
          <DeliveryCard
            delivery={d}
            positionInSquare={i + 1}
            onOpen={() => setDetail(d)}
          />
        )}
      />

      <DeliveryDetailsDrawer
        delivery={detail}
        onClose={() => setDetail(null)}
      />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
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