import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ChevronRight, RotateCcw } from "lucide-react";
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
              asChild
              variant="outline"
              size="sm"
              className="w-full justify-between"
            >
              <Link
                to="/rota/$routeCode/pracas/$squareId"
                params={{ routeCode, squareId: sq.id }}
              >
                {locked ? "Ver entregas" : "Organizar entregas"}
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