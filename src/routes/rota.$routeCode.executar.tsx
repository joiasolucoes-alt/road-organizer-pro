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
  RouteIcon,
  Undo2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DeliveryConfirmDrawer } from "@/components/DeliveryConfirmDrawer";
import { DeliveryDetailsDrawer } from "@/components/DeliveryDetailsDrawer";
import { SquareRouteMapLazy } from "@/components/SquareRouteMapLazy";
import { Button } from "@/components/ui/button";
import { fmtCurrency, fmtDate, fmtInt, fmtWeight } from "@/lib/format";
import {
  googleMapsMultiStopUrl,
  googleMapsNavUrl,
  MAX_PARADAS_MAPA,
  wazeNavUrl,
} from "@/lib/nav";
import { cn } from "@/lib/utils";
import { squareTotals, store, useStore } from "@/services/store";
import { registroInfo, type Delivery, type RegistroEntrega } from "@/types";

export const Route = createFileRoute("/rota/$routeCode/executar")({
  component: ExecutarPage,
});

function ExecutarPage() {
  const { routeCode } = useParams({ from: "/rota/$routeCode/executar" });
  const batch = useStore((s) =>
    s.batches.find((b) => b.routeCode === routeCode),
  )!;

  const registros = batch.execucao?.registros ?? {};
  const feito = (id: string) => Boolean(registros[id]);

  // Praça atual = a primeira que ainda tem entrega pendente.
  const primeiraPendente = Math.max(
    0,
    batch.squares.findIndex((sq) => sq.deliveryIds.some((id) => !feito(id))),
  );
  const [indice, setIndice] = useState(primeiraPendente);
  const [detalhe, setDetalhe] = useState<Delivery | null>(null);
  const [confirmando, setConfirmando] = useState<Delivery | null>(null);

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
  const resolvidos = Object.values(registros);
  const totalFeitas = resolvidos.length;
  const totalFalhas = resolvidos.filter(
    (r) => r.status === "nao_entregue",
  ).length;
  const totalEntregues = totalFeitas - totalFalhas;
  const rotaConcluida = totalFeitas >= totalEntregas && totalEntregas > 0;

  if (!sq) return null;

  const itens = sq.deliveryIds
    .map((id) => batch.deliveries.find((d) => d.id === id))
    .filter(Boolean) as Delivery[];
  const feitasNaPraca = itens.filter((d) => feito(d.id)).length;
  const totais = squareTotals(batch, sq.id);
  const pendentes = itens.filter((d) => !feito(d.id));
  const proximaPendente = pendentes[0];

  // Uma rota só no Google Maps com todas as paradas pendentes desta praça, na
  // ordem já revisada — o motorista abre o navegador uma vez, não a cada porta.
  const rotaPracaUrl = googleMapsMultiStopUrl(
    pendentes.map((d) => [d.latitude, d.longitude] as [number, number]),
  );
  const paradasNoMapa = Math.min(pendentes.length, MAX_PARADAS_MAPA);

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

      {/* Resumo de fechamento: aparece quando toda a rota foi resolvida. */}
      {rotaConcluida && (
        <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 shrink-0 text-primary" />
            <h2 className="text-base font-bold">Rota finalizada</h2>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <FechamentoStat label="Entregues" valor={totalEntregues} tone="ok" />
            <FechamentoStat
              label="Não entregues"
              valor={totalFalhas}
              tone={totalFalhas > 0 ? "warn" : "muted"}
            />
            <FechamentoStat label="Total" valor={totalEntregas} tone="muted" />
          </div>
          {batch.execucao?.iniciadaEm && batch.execucao.concluidaEm && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {new Date(batch.execucao.iniciadaEm).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              →{" "}
              {new Date(batch.execucao.concluidaEm).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · duração de {duracao(batch.execucao.iniciadaEm, batch.execucao.concluidaEm)}
            </p>
          )}
          <Button asChild variant="outline" className="mt-3 w-full bg-card">
            <Link to="/rota/$routeCode/confirmada" params={{ routeCode }}>
              Ver comprovante da rota
            </Link>
          </Button>
        </section>
      )}

      <SquareRouteMapLazy deliveries={itens} />

      {/* Navegação da praça inteira de uma vez: uma rota só no Google Maps com
          todas as paradas pendentes, na ordem revisada. */}
      {pendentes.length > 0 && (
        <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-3 shadow-sm">
          {rotaPracaUrl && (
            <>
              <Button asChild size="lg" className="h-14 w-full text-base">
                <a href={rotaPracaUrl} target="_blank" rel="noreferrer">
                  <RouteIcon className="mr-2 h-5 w-5" />
                  Iniciar navegação ({paradasNoMapa}{" "}
                  {paradasNoMapa === 1 ? "parada" : "paradas"})
                </a>
              </Button>
              {pendentes.length > MAX_PARADAS_MAPA && (
                <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                  Abre as {MAX_PARADAS_MAPA} próximas paradas. Ao concluí-las,
                  toque de novo para seguir.
                </p>
              )}
            </>
          )}

          {proximaPendente && (
            <div className="mt-3 border-t border-primary/20 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                Próxima parada
              </p>
              <p className="mt-0.5 truncate text-sm font-bold">
                {proximaPendente.cliente}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {proximaPendente.endereco} — {proximaPendente.bairro}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="bg-card">
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
                <Button asChild variant="outline" className="bg-card">
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
            </div>
          )}
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
              info={registroInfo(registros[d.id])}
              onRegistrar={() => setConfirmando(d)}
              onReabrir={() => {
                store.resolverEntrega(batch.id, d.id, null);
                toast.success("Entrega reaberta");
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

      <DeliveryConfirmDrawer
        delivery={confirmando}
        onClose={() => setConfirmando(null)}
        onConfirm={(registro) => {
          if (!confirmando) return;
          store.resolverEntrega(batch.id, confirmando.id, registro);
          setConfirmando(null);
          toast.success(
            registro.status === "entregue"
              ? "Entrega confirmada"
              : "Não entrega registrada",
          );
        }}
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
  info,
  onRegistrar,
  onReabrir,
  onOpen,
}: {
  delivery: Delivery;
  posicao: number;
  info?: RegistroEntrega;
  onRegistrar: () => void;
  onReabrir: () => void;
  onOpen: () => void;
}) {
  const resolvida = !!info;
  const falhou = info?.status === "nao_entregue";
  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-3 shadow-sm transition-colors",
        info?.status === "entregue" && "border-primary/30 bg-primary/5",
        falhou && "border-destructive/30 bg-destructive/5",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
            !resolvida && "bg-muted text-foreground",
            info?.status === "entregue" && "bg-primary text-primary-foreground",
            falhou && "bg-destructive text-white",
          )}
        >
          {!resolvida ? (
            posicao
          ) : falhou ? (
            <XCircle className="h-5 w-5" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
        </span>

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <p
            className={cn(
              "min-w-0 truncate text-sm font-semibold",
              info?.status === "entregue" &&
                "text-muted-foreground line-through",
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
            {info && (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5",
                  falhou
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary",
                )}
              >
                {new Date(info.em).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {resolvida ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              onClick={onReabrir}
              aria-label="Reabrir entrega"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button asChild size="icon" variant="secondary" className="h-9 w-9">
                <a
                  href={googleMapsNavUrl(d.latitude, d.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Navegar até a entrega"
                >
                  <Navigation className="h-4 w-4" />
                </a>
              </Button>
              <Button
                size="icon"
                className="h-9 w-9"
                onClick={onRegistrar}
                aria-label="Registrar entrega"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Comprovação registrada: status, recebedor/motivo, observação, foto. */}
      {info && (info.recebedor || info.motivo || info.observacao || info.foto) && (
        <div className="mt-2 flex items-start gap-2 border-t pt-2">
          {info.foto && (
            <img
              src={info.foto}
              alt="Comprovante"
              className="h-12 w-12 shrink-0 rounded-md border object-cover"
            />
          )}
          <div className="min-w-0 text-[11px] text-muted-foreground">
            {falhou && info.motivo && (
              <p className="truncate font-medium text-destructive">
                {info.motivo}
              </p>
            )}
            {info.recebedor && (
              <p className="truncate">
                Recebido por{" "}
                <span className="font-medium text-foreground">
                  {info.recebedor}
                </span>
              </p>
            )}
            {info.observacao && <p className="truncate">{info.observacao}</p>}
          </div>
        </div>
      )}
    </li>
  );
}

function FechamentoStat({
  label,
  valor,
  tone,
}: {
  label: string;
  valor: number;
  tone: "ok" | "warn" | "muted";
}) {
  return (
    <div className="rounded-lg border bg-card p-2">
      <p
        className={cn(
          "text-2xl font-bold tabular-nums",
          tone === "ok" && "text-primary",
          tone === "warn" && "text-destructive",
        )}
      >
        {valor}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

/** "1h 47min" a partir de dois instantes ISO. */
function duracao(inicio: string, fim: string): string {
  const ms = new Date(fim).getTime() - new Date(inicio).getTime();
  const min = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}
