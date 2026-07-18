import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtCurrency, fmtDate, fmtWeight } from "@/lib/format";
import { batchTotals, store, useStore } from "@/services/store";

export const Route = createFileRoute("/admin/import")({
  component: ImportPage,
});

const STEPS = [
  "Arquivo recebido",
  "Estrutura validada",
  "Colunas identificadas",
  "Entregas processadas",
  "Carga criada",
  "Lote criado com sucesso",
] as const;

function ImportPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const [done, setDone] = useState(false);
  const batch = useStore((s) => s.batches[0]);

  async function runSimulation(name: string) {
    setFileName(name);
    setDone(false);
    for (let i = 0; i < STEPS.length; i++) {
      setStep(i);
      await new Promise((r) => setTimeout(r, 550));
    }
    setDone(true);
    store.createBatchFromImport();
  }

  function handleFile(f: File) {
    void runSimulation(f.name);
  }

  const totals = batch ? batchTotals(batch) : null;
  const dias = batch
    ? Array.from(new Set(batch.squares.map((s) => s.data))).sort()
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Importar rota</h1>
        <p className="text-sm text-muted-foreground">
          Envie o arquivo XLS gerado pelo Fusion para criar um novo lote de
          entregas.
        </p>
      </header>

      <div className="rounded-2xl border-2 border-dashed bg-card p-8">
        <input
          ref={inputRef}
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {step === -1 && (
          <div className="flex flex-col items-center text-center">
            <div className="rounded-full bg-primary/10 p-4 text-primary">
              <UploadCloud className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">
              Envie o arquivo do Fusion
            </h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Aceitamos <code>.xls</code> ou <code>.xlsx</code>. Nesta versão o
              conteúdo é validado e simulado com dados mockados.
            </p>
            <Button
              className="mt-5"
              size="lg"
              onClick={() => inputRef.current?.click()}
            >
              <UploadCloud className="mr-2 h-4 w-4" /> Selecionar arquivo
            </Button>
          </div>
        )}

        {step >= 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  Processando estrutura do Fusion…
                </p>
              </div>
              {!done ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-[color:var(--brand-blue-strong)]" />
              )}
            </div>

            <Progress value={((step + 1) / STEPS.length) * 100} />

            <ul className="space-y-1.5">
              {STEPS.map((s, i) => {
                const state =
                  i < step ? "done" : i === step && !done ? "doing" : i === step && done ? "done" : "pending";
                return (
                  <li
                    key={s}
                    className="flex items-center gap-2 text-sm"
                  >
                    {state === "done" ? (
                      <CheckCircle2 className="h-4 w-4 text-[color:var(--brand-blue-strong)]" />
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
          </div>
        )}
      </div>

      {done && batch && totals && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Resumo da importação</h2>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Row k="Arquivo" v={fileName ?? "-"} />
            <Row k="Aba identificada" v="Entregas" />
            <Row k="Colunas" v="26" />
            <Row k="Entregas" v={String(totals.entregas)} />
            <Row k="Praças" v={String(totals.pracas)} />
            <Row k="Dias" v={String(totals.dias)} />
            <Row
              k="Período"
              v={
                dias.length
                  ? `${fmtDate(dias[0])} a ${fmtDate(dias[dias.length - 1])}`
                  : "-"
              }
            />
            <Row k="Carga" v={String(batch.carga)} />
            <Row k="Peso total" v={fmtWeight(totals.peso)} />
            <Row k="Valor total" v={fmtCurrency(totals.valor)} />
          </div>

          <div className="mt-6 flex flex-col justify-end gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setStep(-1);
                setDone(false);
                setFileName(null);
              }}
            >
              Enviar outro arquivo
            </Button>
            <Button
              size="lg"
              onClick={() => {
                toast.success("Lote criado com sucesso");
                void navigate({
                  to: "/admin/lotes/$batchId",
                  params: { batchId: batch.id },
                });
              }}
            >
              Criar lote de entregas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between rounded-md bg-muted/40 px-3 py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-semibold text-foreground">{v}</span>
    </div>
  );
}