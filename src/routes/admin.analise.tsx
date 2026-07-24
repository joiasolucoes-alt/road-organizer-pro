import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Lightbulb,
  MapPin,
  Shuffle,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStore } from "@/services/store";
import { isReorder, type Batch } from "@/types";

export const Route = createFileRoute("/admin/analise")({
  head: () => ({
    meta: [
      { title: "Análise de rotas — Master Rotas" },
      {
        name: "description",
        content:
          "Onde os motoristas mais alteram a sequência gerada pelo Fusion.",
      },
    ],
  }),
  component: AnalisePage,
});

interface PracaStat {
  nome: string;
  reordenacoes: number;
  lotes: number;
  somaDelta: number;
  subiu: number;
  desceu: number;
  motivos: Map<string, number>;
}

/**
 * Agrega, por nome de praça, quantas vezes o motorista mexeu na posição
 * definida pelo Fusion. Praça que aparece sempre no topo é sinal de que o
 * roteirizador erra ali de forma sistemática.
 */
function analisarPracas(batches: Batch[]): PracaStat[] {
  const mapa = new Map<string, PracaStat>();

  for (const b of batches) {
    const nomesNoLote = new Set<string>();
    for (const c of b.changes) {
      if (c.tipo !== "praca" || !isReorder(c)) continue;
      const nome = b.squares.find((s) => s.id === c.targetId)?.nome;
      if (!nome) continue;

      const cur =
        mapa.get(nome) ??
        {
          nome,
          reordenacoes: 0,
          lotes: 0,
          somaDelta: 0,
          subiu: 0,
          desceu: 0,
          motivos: new Map<string, number>(),
        };

      cur.reordenacoes += 1;
      // delta negativo = passou a ser visitada antes do que o Fusion previa
      const delta = c.ordemNova - c.ordemOriginal;
      cur.somaDelta += delta;
      if (delta < 0) cur.subiu += 1;
      else cur.desceu += 1;
      if (c.motivo) cur.motivos.set(c.motivo, (cur.motivos.get(c.motivo) ?? 0) + 1);

      if (!nomesNoLote.has(nome)) {
        cur.lotes += 1;
        nomesNoLote.add(nome);
      }
      mapa.set(nome, cur);
    }
  }

  return [...mapa.values()].sort((a, b) => b.reordenacoes - a.reordenacoes);
}

function AnalisePage() {
  const batches = useStore((s) => s.batches);
  const drivers = useStore((s) => s.drivers);

  const pracas = analisarPracas(batches);
  const reorders = batches.flatMap((b) => b.changes.filter(isReorder));
  const ocorrencias = batches.flatMap((b) =>
    b.changes.filter((c) => c.ocorrencia),
  );
  const lotesComAlteracao = batches.filter((b) =>
    b.changes.some(isReorder),
  ).length;

  const taxa =
    batches.length > 0
      ? Math.round((lotesComAlteracao / batches.length) * 100)
      : 0;

  const motivosGerais = new Map<string, number>();
  for (const c of reorders) {
    if (c.motivo) motivosGerais.set(c.motivo, (motivosGerais.get(c.motivo) ?? 0) + 1);
  }
  const motivos = [...motivosGerais.entries()].sort((a, b) => b[1] - a[1]);

  const porMotorista = drivers
    .map((d) => {
      const meus = batches.filter((b) => b.motoristaId === d.id);
      const alt = meus.filter((b) => b.changes.some(isReorder)).length;
      return {
        id: d.id,
        nome: d.nome,
        rotas: meus.length,
        alteradas: alt,
        taxa: meus.length ? Math.round((alt / meus.length) * 100) : 0,
      };
    })
    .filter((d) => d.rotas > 0)
    .sort((a, b) => b.taxa - a.taxa);

  const semDados = reorders.length === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Inteligência de rota
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Análise de alterações
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Onde os motoristas mais discordam da sequência gerada pelo Fusion.
          Praça que se repete aqui é candidata a ajuste no roteirizador.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Lotes analisados" value={fmtInt(batches.length)} />
        <StatCard
          label="Lotes com alteração"
          value={fmtInt(lotesComAlteracao)}
          tone="brand"
        />
        <StatCard label="Taxa de alteração" value={`${taxa}%`} />
        <StatCard label="Ocorrências" value={fmtInt(ocorrencias.length)} />
      </div>

      {semDados ? (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
          <Lightbulb className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">Ainda sem alterações</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Assim que os motoristas começarem a reordenar as rotas, este painel
            mostra quais praças o Fusion erra com mais frequência.
          </p>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border bg-card shadow-sm">
            <header className="flex items-center gap-2 border-b p-4">
              <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold">
                  Praças mais reordenadas
                </h2>
                <p className="text-xs text-muted-foreground">
                  Seta para cima = motorista antecipa a praça; para baixo =
                  adia.
                </p>
              </div>
            </header>
            <ul className="divide-y">
              {pracas.map((p, i) => {
                const mediaDelta = p.somaDelta / p.reordenacoes;
                const antecipa = mediaDelta < 0;
                const motivoTop = [...p.motivos.entries()].sort(
                  (a, b) => b[1] - a[1],
                )[0];
                return (
                  <li
                    key={p.nome}
                    className="flex flex-wrap items-center gap-3 p-4"
                  >
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        i === 0
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {motivoTop
                          ? `Motivo mais alegado: ${motivoTop[0]}`
                          : "Sem justificativa registrada"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold",
                          antecipa
                            ? "bg-primary/10 text-primary"
                            : "bg-[color:var(--brand-warn-bg)] text-[color:var(--brand-warn-fg)]",
                        )}
                      >
                        {antecipa ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                        {Math.abs(mediaDelta).toFixed(1)} posição(ões)
                      </span>
                      <span className="text-muted-foreground">
                        {fmtInt(p.reordenacoes)}x em {fmtInt(p.lotes)} lote(s)
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            {pracas[0] && pracas[0].lotes > 1 && (
              <footer className="flex items-start gap-2 border-t bg-[color:var(--brand-warn-bg)] p-3 text-xs font-medium text-[color:var(--brand-warn-fg)]">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>{pracas[0].nome}</strong> foi reordenada em{" "}
                  {pracas[0].lotes} lotes diferentes — vale rever a regra do
                  Fusion para essa praça.
                </span>
              </footer>
            )}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
              <header className="mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
                  <Shuffle className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-semibold">Motivos mais alegados</h2>
              </header>
              {motivos.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma justificativa registrada.
                </p>
              ) : (
                <ul className="space-y-2">
                  {motivos.map(([motivo, n]) => (
                    <li key={motivo} className="min-w-0">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate">{motivo}</span>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {n}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(n / motivos[0][1]) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
              <header className="mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-semibold">
                  Alteração por motorista
                </h2>
              </header>
              {porMotorista.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma rota atribuída.
                </p>
              ) : (
                <ul className="space-y-2">
                  {porMotorista.map((d) => (
                    <li key={d.id} className="min-w-0">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <Link
                          to="/admin/motoristas/$driverId"
                          params={{ driverId: d.id }}
                          className="truncate hover:underline"
                        >
                          {d.nome}
                        </Link>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {d.taxa}%{" "}
                          <span className="font-normal text-muted-foreground">
                            ({d.alteradas}/{d.rotas})
                          </span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${d.taxa}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
