import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { SortableList } from "@/components/SortableList";
import { SquareCard } from "@/components/SquareCard";
import { Button } from "@/components/ui/button";
import { squareTotals, store, useStore } from "@/services/store";

export const Route = createFileRoute("/rota/$routeCode/pracas")({
  component: PracasPage,
});

function PracasPage() {
  const { routeCode } = useParams({ from: "/rota/$routeCode/pracas" });
  const batch = useStore((s) =>
    s.batches.find((b) => b.routeCode === routeCode),
  )!;

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
          Arraste os cards ou use as setas para organizar a sequência de visita.
          Toque em uma praça para reordenar as entregas.
        </p>
      </header>

      {changed && (
        <div className="rounded-lg border-l-4 border-[color:var(--brand-warn)] bg-[color:var(--brand-warn-bg)] px-3 py-2 text-xs font-medium text-[color:var(--brand-warn-fg)]">
          Ordem alterada em relação ao Fusion — clique em confirmar quando
          terminar.
        </div>
      )}

      <SortableList
        items={batch.squares}
        onReorder={(order) => {
          store.reorderSquares(batch.id, order);
        }}
        renderItem={(sq) => (
          <div className="space-y-3">
            <SquareCard square={sq} totals={squareTotals(batch, sq.id)} />
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
          <Button
            asChild
            className="flex-[2]"
            onClick={() => toast.success("Ordem das praças confirmada")}
          >
            <Link to="/rota/$routeCode/resumo" params={{ routeCode }}>
              Confirmar ordem das praças
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}