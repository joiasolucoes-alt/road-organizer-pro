import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Download, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { ChangeIndicator } from "@/components/ChangeIndicator";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { fmtDateTime, fmtInt } from "@/lib/format";
import { batchTotals, store, useStore } from "@/services/store";

export const Route = createFileRoute("/admin/lotes/$batchId/alteracoes")({
  head: () => ({
    meta: [
      { title: "Alterações da rota — Master Rotas" },
      {
        name: "description",
        content: "Comparativo entre a ordem original do Fusion e a ordem definida pelo motorista.",
      },
    ],
  }),
  component: AlteracoesPage,
});

function AlteracoesPage() {
  const { batchId } = useParams({ from: "/admin/lotes/$batchId/alteracoes" });
  const batch = useStore((s) => s.batches.find((b) => b.id === batchId));

  if (!batch) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Lote não encontrado.</p>
        <Button asChild className="mt-4">
          <Link to="/admin/lotes">Voltar</Link>
        </Button>
      </div>
    );
  }

  const t = batchTotals(batch);
  const changedSquares = batch.changes.filter((c) => c.tipo === "praca");
  const changedDeliveries = batch.changes.filter((c) => c.tipo === "entrega");
  const dr = store.getDrivers().find((d) => d.id === batch.motoristaId);
  const originalOrder = [...batch.squares].sort(
    (a, b) => a.ordemOriginal - b.ordemOriginal,
  );

  function downloadFusion() {
    const rows = [[
      "ORDEM_ORIGINAL",
      "ORDEM",
      "PRACA",
      "DATA",
      "CLIENTE",
      "PEDIDO",
      "PESO",
      "VALOR",
    ]];
    batch!.squares.forEach((sq, si) => {
      sq.deliveryIds.forEach((did, di) => {
        const d = batch!.deliveries.find((x) => x.id === did)!;
        rows.push([
          String(d.ordemOriginal),
          String((si + 1) * 100 + (di + 1)),
          sq.nome,
          d.dataPrevistaEntrega,
          d.cliente,
          d.pedido,
          d.peso.toString(),
          d.valor.toString(),
        ]);
      });
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fusion_${batch!.routeCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    store.markFileGenerated(batch!.id);
    toast.success("Arquivo Fusion gerado");
  }

  function downloadSummary() {
    const summary = {
      lote: batch!.codigo,
      carga: batch!.carga,
      rota: batch!.routeCode,
      motorista: dr?.nome,
      confirmadoEm: batch!.confirmedAt,
      totais: t,
      pracas: batch!.squares.map((s, i) => ({
        ordemOriginal: s.ordemOriginal,
        ordemNova: i + 1,
        nome: s.nome,
      })),
      alteracoes: batch!.changes,
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resumo_${batch!.routeCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <Link
            to="/admin/lotes/$batchId"
            params={{ batchId }}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao lote
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Alterações do motorista
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {batch.codigo} · Motorista {dr?.nome ?? "-"} · Confirmado em{" "}
            {batch.confirmedAt ? fmtDateTime(batch.confirmedAt) : "-"}
          </p>
        </div>
        <StatusBadge status={batch.status} />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Praças alteradas" value={fmtInt(changedSquares.length)} />
        <StatCard
          label="Entregas alteradas"
          value={fmtInt(changedDeliveries.length)}
          tone="brand"
        />
        <StatCard
          label="Com justificativa"
          value={fmtInt(batch.changes.filter((c) => c.motivo).length)}
        />
        <StatCard
          label="Sem justificativa"
          value={fmtInt(batch.changes.filter((c) => !c.motivo).length)}
        />
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <OrderColumn
          title="Ordem original do Fusion"
          items={originalOrder.map((s) => ({
            id: s.id,
            n: s.ordemOriginal,
            label: s.nome,
          }))}
          tone="muted"
        />
        <OrderColumn
          title="Ordem definida pelo motorista"
          items={batch.squares.map((s, i) => ({
            id: s.id,
            n: i + 1,
            label: s.nome,
            original: s.ordemOriginal,
          }))}
          tone="primary"
        />
      </section>

      {batch.changes.length > 0 && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Justificativas registradas</h2>
          <ul className="mt-3 space-y-2">
            {batch.changes.map((c) => {
              const label =
                c.tipo === "praca"
                  ? batch.squares.find((s) => s.id === c.targetId)?.nome
                  : batch.deliveries.find((d) => d.id === c.targetId)?.cliente;
              return (
                <li key={c.id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {c.tipo === "praca" ? "Praça" : "Entrega"}
                      </p>
                      <p className="truncate font-semibold">{label}</p>
                    </div>
                    <ChangeIndicator
                      original={c.ordemOriginal}
                      atual={c.ordemNova}
                    />
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">Motivo:</span>{" "}
                    {c.motivo ?? (
                      <span className="italic text-muted-foreground">
                        não informado
                      </span>
                    )}
                  </p>
                  {c.observacao && (
                    <p className="text-xs text-muted-foreground">
                      Observação: {c.observacao}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {fmtDateTime(c.timestamp)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={downloadSummary}>
          <Download className="mr-2 h-4 w-4" /> Baixar resumo (JSON)
        </Button>
        <Button onClick={downloadFusion}>
          <FileCheck2 className="mr-2 h-4 w-4" /> Gerar arquivo Fusion
        </Button>
      </div>
    </div>
  );
}

interface OrderItem {
  id: string;
  n: number;
  label: string;
  original?: number;
}

function OrderColumn({
  title,
  items,
  tone,
}: {
  title: string;
  items: OrderItem[];
  tone: "muted" | "primary";
}) {
  return (
    <div className="rounded-2xl border bg-card p-3 shadow-sm">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <ol className="space-y-1.5">
        {items.map((it) => {
          const changed = it.original !== undefined && it.original !== it.n;
          return (
            <li
              key={it.id}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5 text-sm"
            >
              <span
                className={
                  tone === "primary"
                    ? "inline-flex h-6 min-w-6 items-center justify-center rounded bg-primary px-1.5 text-xs font-bold text-primary-foreground"
                    : "inline-flex h-6 min-w-6 items-center justify-center rounded bg-muted px-1.5 text-xs font-bold text-foreground"
                }
              >
                {it.n}
              </span>
              <span className="min-w-0 flex-1 truncate">{it.label}</span>
              {changed && (
                <span className="rounded bg-[color:var(--brand-warn-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--brand-warn-fg)]">
                  alterado
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}