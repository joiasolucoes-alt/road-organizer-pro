import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  MapPin,
  Navigation,
  Package,
  Undo2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DeliveryDetailsDrawer } from "@/components/DeliveryDetailsDrawer";
import { SquareRouteMapLazy } from "@/components/SquareRouteMapLazy";
import { Button } from "@/components/ui/button";
import { fmtCurrency, fmtDate, fmtInt, fmtWeight } from "@/lib/format";
import { googleMapsNavUrl, wazeNavUrl } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { squareTotals, store, useStore } from "@/services/store";
import type { Delivery } from "@/types";

export const Route = createFileRoute("/rota/$routeCode/executar")({
  component: ExecutarPage,
});

function ExecutarPage() {
  const { routeCode } = useParams({ from: "/rota/$routeCode/executar" });
  const batch = useStore((s) =>
    s.batches.find((b) => b.routeCode === routeCode),
  )!;

  const entregues = batch.execucao?.entregues ?? {};
  const feito = (id: string) => Boolean(entregues[id]);

  // Praça atual = a primeira que ainda tem entrega pendente.
  const primeiraPendente = Math.max(
    0,
    batch.squares.findIndex((sq) => sq.deliveryIds.some((id) => !feito(id))),
  );
  const [indice, setIndice] = useState(primeiraPendente);
  const [detalhe, setDetalhe] = useState<Delivery | null>(null);

  // Avança sozinho quando o motorista fecha a praça em que está.
  useEffect(() => {
    const atual = batch.squares[indice];
    if (!atual) return;
    const pendentes = atual.deliveryIds.some((id) => !feito(id));
    if (!pendentes && primeiraPendente > indice) setIndice(primeiraPendente);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primeiraPendente]);

  const sq = batch.squares[indice];
  const totalEntregas = batch.deliveries.length;
  const totalFeitas = Object.keys(entregues).length;
  const rotaConcluida = totalFeitas >= totalEntregas && totalEntregas > 0;

  if (!sq) return null;

  const itens = sq.deliveryIds
    .map((id) => batch.deliveries.find((d) => d.id === id))
    .filter(Boolean) as Delivery[];
  const feitasNaPraca = itens.filter((d) => feito(d.id)).length;
  const totais = squareTotals(batch, sq.id);
  const proximaPendente = itens.find((d) => !feito(d.id));

  return (
    <div className="space-y-4 pb-28">
      <header className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
        <Link
          to="/rota/$routeCode"
          params={{ routeCode }}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Resumo da rota
        </Link>

        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Praça {indice + 1} de {batch.squares.length}
            </p>
            <h1 className="mt-0.5 truncate text-lg font-bold tracking-tight sm:text-2xl">
              {sq.nome}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> {fmtDate(sq.data)}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {sq.cidade}/{sq.uf}
              </span>
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            {feitasNaPraca}/{itens.length}
          </span>
        </div>

        {/* Progresso da rota inteira, não só da praça. */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Progresso da rota</span>
            <span className="font-semibold tabular-nums">
              {totalFeitas} de {totalEntregas} entregas
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${totalEntregas ? (totalFeitas / totalEntregas) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </header>

      {rotaConcluida && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary">
          <Flag className="h-4 w-4 shrink-0" />
          Todas as entregas foram concluídas.
        </div>
      )}

      <SquareRouteMapLazy deliveries={itens} />

      {/* Atalho para a próxima parada: é o que o motorista quer ao subir no
          caminhão, sem precisar procurar na lista. */}
      {proximaPendente && (
        <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
            Próxima parada
          </p>
          <p className="mt-1 truncate text-base font-bold">
            {proximaPendente.cliente}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {proximaPendente.endereco} — {proximaPendente.bairro}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button asChild size="lg" className="h-12">
              <a
                href={googleMapsNavUrl(
                  proximaPendente.latitude,
                  proximaPendente.longitude,
                )}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation className="mr-1.5 h-4 w-4" /> Google Maps
              </a>
            </Button>
            <Button asChild size="lg" variant="secondary" className="h-12">
              <a
                href={wazeNavUrl(
                  proximaPendente.latitude,
                  proximaPendente.longitude,
                )}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation className="mr-1.5 h-4 w-4" /> Waze
              </a>
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Entregas desta praça ({fmtInt(itens.length)})
          </h2>
          <span className="text-xs text-muted-foreground">
            {fmtWeight(totais.peso)} · {fmtCurrency(totais.valor)}
          </span>
        </div>

        <ul className="space-y-2">
          {itens.map((d, i) => (
            <ExecucaoRow
              key={d.id}
              delivery={d}
              posicao={i + 1}
              concluida={feito(d.id)}
              horario={entregues[d.id]}
              onToggle={() => {
                const novo = !feito(d.id);
                store.setDeliveryDone(batch.id, d.id, novo);
                toast.success(
                  novo ? "Entrega concluída" : "Entrega reaberta",
                );
              }}
              onOpen={() => setDetalhe(d)}
            />
          ))}
        </ul>
      </section>

      <DeliveryDetailsDrawer
        delivery={detalhe}
        onClose={() => setDetalhe(null)}
      />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 px-3 py-2.5 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Button
            variant="outline"
            className="shrink-0"
            disabled={indice === 0}
            onClick={() => setIndice((i) => Math.max(0, i - 1))}
            aria-label="Praça anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1 text-center text-xs">
            <p className="truncate font-semibold">{sq.nome}</p>
            <p className="text-muted-foreground">
              Praça {indice + 1} de {batch.squares.length}
            </p>
          </div>
          <Button
            variant="outline"
            className="shrink-0"
            disabled={indice >= batch.squares.length - 1}
            onClick={() =>
              setIndice((i) => Math.min(batch.squares.length - 1, i + 1))
            }
            aria-label="Próxima praça"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExecucaoRow({
  delivery: d,
  posicao,
  concluida,
  horario,
  onToggle,
  onOpen,
}: {
  delivery: Delivery;
  posicao: number;
  concluida: boolean;
  horario?: string;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-3 shadow-sm transition-colors",
        concluida && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggle}
          aria-label={concluida ? "Reabrir entrega" : "Marcar como entregue"}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors",
            concluida
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground hover:bg-muted/70",
          )}
        >
          {concluida ? <CheckCircle2 className="h-5 w-5" /> : posicao}
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <p
            className={cn(
              "min-w-0 truncate text-sm font-semibold",
              concluida && "text-muted-foreground line-through",
            )}
          >
            {d.cliente}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {d.bairro} · {d.endereco}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5">
              {fmtWeight(d.peso)}
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5">
              {fmtCurrency(d.valor)}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5">
              <Package className="h-2.5 w-2.5" /> {d.quantidadeItens}
            </span>
            {concluida && horario && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                {new Date(horario).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </button>

        <div className="flex shrink-0 flex-col gap-1">
          {concluida ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              onClick={onToggle}
              aria-label="Reabrir entrega"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button asChild size="icon" className="h-9 w-9">
                <a
                  href={googleMapsNavUrl(d.latitude, d.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Navegar no Google Maps"
                >
                  <Navigation className="h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                size="icon"
                variant="secondary"
                className="h-9 w-9"
              >
                <a
                  href={wazeNavUrl(d.latitude, d.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Navegar no Waze"
                >
                  <MapPin className="h-4 w-4" />
                </a>
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
