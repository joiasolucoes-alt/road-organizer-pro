import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileCheck2,
  ListChecks,
  Loader2,
  Navigation,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { fmtCurrency, fmtDateTime, fmtInt, fmtWeight } from "@/lib/format";
import { batchTotals, store, useStore } from "@/services/store";

export const Route = createFileRoute("/rota/$routeCode/confirmada")({
  component: ConfirmadaPage,
});

const GEN_STEPS = [
  "Preservando estrutura original",
  "Atualizando coluna ORDEM",
  "Reorganizando linhas",
  "Validando arquivo",
  "Arquivo pronto",
] as const;

function ConfirmadaPage() {
  const { routeCode } = useParams({ from: "/rota/$routeCode/confirmada" });
  const batch = useStore((s) =>
    s.batches.find((b) => b.routeCode === routeCode),
  )!;
  const t = batchTotals(batch);
  const [genStep, setGenStep] = useState(-1);
  const [generating, setGenerating] = useState(false);

  const feitas = Object.keys(batch.execucao?.entregues ?? {}).length;
  const rotuloExecucao = batch.execucao?.concluidaEm
    ? "Ver rota concluída"
    : feitas > 0
      ? `Continuar rota (${feitas}/${t.entregas})`
      : "Iniciar rota";

  async function generate() {
    setGenerating(true);
    setGenStep(-1);
    for (let i = 0; i < GEN_STEPS.length; i++) {
      setGenStep(i);
      await new Promise((r) => setTimeout(r, 700));
    }
    store.markFileGenerated(batch.id);

    // Build a mocked CSV file with original + new order
    const rows = [
      [
        "ORDEM_ORIGINAL",
        "ORDEM",
        "PRACA",
        "DATA",
        "CLIENTE",
        "PEDIDO",
        "PESO",
        "VALOR",
      ],
    ];
    batch.squares.forEach((sq, si) => {
      sq.deliveryIds.forEach((did, di) => {
        const d = batch.deliveries.find((x) => x.id === did)!;
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
    a.download = `fusion_${batch.routeCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Arquivo Fusion gerado");
    setGenerating(false);
  }

  function downloadSummary() {
    const summary = {
      lote: batch.codigo,
      carga: batch.carga,
      rota: batch.routeCode,
      confirmadoEm: batch.confirmedAt,
      totais: t,
      pracas: batch.squares.map((s, i) => ({
        ordemOriginal: s.ordemOriginal,
        ordemNova: i + 1,
        nome: s.nome,
      })),
      alteracoes: batch.changes,
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resumo_${batch.routeCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-[color:var(--brand-lime)]/20 p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          Rota organizada com sucesso
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Carga {batch.carga} · confirmada em{" "}
          {batch.confirmedAt ? fmtDateTime(batch.confirmedAt) : "-"}
        </p>
      </section>

      {/* Caminho do motorista a partir daqui: rodar a rota ou revisar as
          entregas. A geração do arquivo (abaixo) é ação de escritório. */}
      <section className="grid gap-2 sm:grid-cols-2">
        <Button asChild size="lg" className="h-14 text-base font-semibold">
          <Link to="/rota/$routeCode/executar" params={{ routeCode }}>
            <Navigation className="mr-2 h-5 w-5" /> {rotuloExecucao}
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14 text-base">
          <Link to="/rota/$routeCode/pracas" params={{ routeCode }}>
            <ListChecks className="mr-2 h-5 w-5" /> Ver praças e entregas
          </Link>
        </Button>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Praças" value={fmtInt(t.pracas)} />
        <StatCard label="Entregas" value={fmtInt(t.entregas)} tone="brand" />
        <StatCard label="Peso" value={fmtWeight(t.peso)} />
        <StatCard label="Valor" value={fmtCurrency(t.valor)} />
      </div>

      {/* Progresso da execução, se já começou. */}
      {feitas > 0 && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">
              {batch.execucao?.concluidaEm
                ? "Rota concluída"
                : "Rota em andamento"}
            </span>
            <span className="text-muted-foreground">
              {feitas} de {t.entregas} entregas
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${t.entregas ? (feitas / t.entregas) * 100 : 0}%`,
              }}
            />
          </div>
        </section>
      )}

      {generating || genStep >= 0 ? (
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">
            {generating ? "Gerando arquivo Fusion" : "Arquivo gerado"}
          </h2>
          <ul className="mt-3 space-y-1.5">
            {GEN_STEPS.map((s, i) => {
              const state =
                i < genStep ? "done" : i === genStep && generating ? "doing" : i <= genStep ? "done" : "pending";
              return (
                <li key={s} className="flex items-center gap-2 text-sm">
                  {state === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : state === "doing" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border" />
                  )}
                  <span
                    className={
                      state === "pending"
                        ? "text-muted-foreground"
                        : "text-foreground"
                    }
                  >
                    {s}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        <Button variant="outline" onClick={downloadSummary}>
          <Download className="mr-2 h-4 w-4" /> Baixar resumo da rota
        </Button>
        <Button onClick={generate} disabled={generating}>
          <FileCheck2 className="mr-2 h-4 w-4" />
          {generating ? "Gerando..." : "Simular arquivo Fusion"}
        </Button>
        <Button asChild variant="secondary">
          <Link to="/rota/$routeCode" params={{ routeCode }}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Link>
        </Button>
      </div>
    </div>
  );
}
