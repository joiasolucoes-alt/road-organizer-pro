import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  IdCard,
  MapPin,
  Package,
  Phone,
  Shuffle,
  Truck,
} from "lucide-react";
import { useMemo } from "react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { fmtCurrency, fmtDate, fmtInt, fmtWeight } from "@/lib/format";
import { batchTotals, useStore } from "@/services/store";
import { diasAteVencimento, isReorder, vehicleLabel } from "@/types";

export const Route = createFileRoute("/admin/motoristas/$driverId")({
  component: DriverHistoryPage,
});

function DriverHistoryPage() {
  const { driverId } = useParams({ from: "/admin/motoristas/$driverId" });
  const driver = useStore((s) => s.drivers.find((d) => d.id === driverId));
  // O seletor precisa devolver referência estável: filtrar dentro dele cria um
  // array novo a cada render e useSyncExternalStore entra em loop.
  const todosBatches = useStore((s) => s.batches);
  const vehicles = useStore((s) => s.vehicles);
  const batches = useMemo(
    () => todosBatches.filter((b) => b.motoristaId === driverId),
    [todosBatches, driverId],
  );

  if (!driver) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Motorista não encontrado.</p>
        <Button asChild className="mt-4">
          <Link to="/admin/motoristas">Voltar</Link>
        </Button>
      </div>
    );
  }

  const concluidas = batches.filter(
    (b) => b.status === "confirmado" || b.status === "arquivo_gerado",
  );

  // Só reordenações contam como "alteração"; ocorrências são outra coisa.
  const reorders = batches.flatMap((b) => b.changes.filter(isReorder));
  const ocorrencias = batches.flatMap((b) =>
    b.changes.filter((c) => c.ocorrencia),
  );

  const totalEntregas = batches.reduce(
    (acc, b) => acc + batchTotals(b).entregas,
    0,
  );
  const totalPeso = batches.reduce((acc, b) => acc + batchTotals(b).peso, 0);

  // Com que frequência ele mexe na rota que recebe pronta.
  const taxaAlteracao =
    batches.length > 0
      ? Math.round(
          (batches.filter((b) => b.changes.some(isReorder)).length /
            batches.length) *
            100,
        )
      : 0;

  const motivos = contar(
    reorders.map((c) => c.motivo).filter((m): m is string => !!m),
  );
  const tiposOcorrencia = contar(
    ocorrencias.map((c) => c.ocorrencia!).filter(Boolean),
  );
  const pracasMexidas = contar(
    batches.flatMap((b) =>
      b.changes
        .filter((c) => isReorder(c) && c.tipo === "praca")
        .map((c) => b.squares.find((s) => s.id === c.targetId)?.nome ?? "—"),
    ),
  );

  const veiculo = vehicles.find((v) => v.id === driver.veiculoPadraoId);
  const cnhDias = diasAteVencimento(driver.cnhValidade);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <Link
          to="/admin/motoristas"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar aos motoristas
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {driver.nome}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {driver.telefone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" /> {driver.telefone}
            </span>
          )}
          {driver.cnhCategoria && (
            <span className="inline-flex items-center gap-1">
              <IdCard className="h-3 w-3" /> CNH {driver.cnhCategoria}
              {cnhDias !== null &&
                ` · vence ${fmtDate(driver.cnhValidade!)}`}
            </span>
          )}
          {veiculo && (
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3 w-3" /> {vehicleLabel(veiculo)}
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Rotas recebidas" value={fmtInt(batches.length)} />
        <StatCard
          label="Rotas concluídas"
          value={fmtInt(concluidas.length)}
          tone="brand"
        />
        <StatCard
          label="Taxa de alteração"
          value={`${taxaAlteracao}%`}
          hint="rotas em que mexeu na ordem"
        />
        <StatCard label="Ocorrências" value={fmtInt(ocorrencias.length)} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Entregas" value={fmtInt(totalEntregas)} />
        <StatCard label="Peso acumulado" value={fmtWeight(totalPeso)} />
        <StatCard label="Praças reordenadas" value={fmtInt(
          reorders.filter((c) => c.tipo === "praca").length,
        )} />
        <StatCard label="Entregas reordenadas" value={fmtInt(
          reorders.filter((c) => c.tipo === "entrega").length,
        )} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Ranking
          titulo="Motivos mais alegados"
          icon={<Shuffle className="h-4 w-4" />}
          itens={motivos}
          vazio="Nenhuma justificativa registrada."
        />
        <Ranking
          titulo="Praças que mais reordena"
          icon={<MapPin className="h-4 w-4" />}
          itens={pracasMexidas}
          vazio="Nenhuma praça reordenada."
        />
        <Ranking
          titulo="Ocorrências relatadas"
          icon={<Package className="h-4 w-4" />}
          itens={tiposOcorrencia}
          vazio="Nenhuma ocorrência."
        />
      </div>

      <section className="rounded-2xl border bg-card shadow-sm">
        <header className="border-b p-4">
          <h2 className="text-base font-semibold">Rotas do motorista</h2>
        </header>
        {batches.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma rota atribuída ainda.
          </p>
        ) : (
          <ul className="divide-y">
            {batches.map((b) => {
              const t = batchTotals(b);
              const alt = b.changes.filter(isReorder).length;
              const dias = Array.from(
                new Set(b.squares.map((s) => s.data)),
              ).sort();
              return (
                <li key={b.id}>
                  <Link
                    to="/admin/lotes/$batchId"
                    params={{ batchId: b.id }}
                    className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-bold">
                        {b.codigo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Carga {b.carga} ·{" "}
                        {dias.length
                          ? `${fmtDate(dias[0])} — ${fmtDate(dias[dias.length - 1])}`
                          : "-"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{fmtInt(t.entregas)} entregas</span>
                      <span>{fmtWeight(t.peso)}</span>
                      <span>{fmtCurrency(t.valor)}</span>
                      {alt > 0 && (
                        <span className="rounded bg-[color:var(--brand-warn-bg)] px-1.5 py-0.5 font-semibold text-[color:var(--brand-warn-fg)]">
                          {alt} alteração(ões)
                        </span>
                      )}
                      <StatusBadge status={b.status} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Conta ocorrências e devolve ordenado do mais frequente para o menos. */
function contar(valores: string[]): { rotulo: string; n: number }[] {
  const mapa = new Map<string, number>();
  for (const v of valores) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  return [...mapa.entries()]
    .map(([rotulo, n]) => ({ rotulo, n }))
    .sort((a, b) => b.n - a.n);
}

function Ranking({
  titulo,
  icon,
  itens,
  vazio,
}: {
  titulo: string;
  icon: React.ReactNode;
  itens: { rotulo: string; n: number }[];
  vazio: string;
}) {
  const max = itens[0]?.n ?? 1;
  return (
    <section className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
      <header className="mb-3 flex items-center gap-2">
        <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
          {icon}
        </span>
        <h2 className="text-sm font-semibold">{titulo}</h2>
      </header>
      {itens.length === 0 ? (
        <p className="text-xs text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="space-y-2">
          {itens.slice(0, 5).map((i) => (
            <li key={i.rotulo} className="min-w-0">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{i.rotulo}</span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {i.n}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(i.n / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
