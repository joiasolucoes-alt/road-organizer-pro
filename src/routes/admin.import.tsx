import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Package,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtCurrency, fmtDate, fmtInt, fmtWeight } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  FusionParseError,
  parseFusionFile,
  type FusionParseResult,
} from "@/services/fusion-import";
import { store } from "@/services/store";

export const Route = createFileRoute("/admin/import")({
  component: ImportPage,
});

const STEPS = [
  "Arquivo recebido",
  "Estrutura da planilha validada",
  "Colunas do Fusion identificadas",
  "Entregas processadas",
  "Praças e viagens agrupadas",
] as const;

/** Praças derivadas da planilha, para conferência antes de criar o lote. */
interface PracaPreview {
  data: string;
  nome: string;
  entregas: number;
  peso: number;
  valor: number;
}

function buildPreview(parsed: FusionParseResult): PracaPreview[] {
  const map = new Map<string, PracaPreview>();
  for (const d of parsed.deliveries) {
    const data = d.dataPrevistaEntrega.slice(0, 10);
    const key = `${data}__${d.praca}`;
    const cur =
      map.get(key) ?? { data, nome: d.praca, entregas: 0, peso: 0, valor: 0 };
    cur.entregas += 1;
    cur.peso += d.peso;
    cur.valor += d.valor;
    map.set(key, cur);
  }
  return [...map.values()].sort(
    (a, b) => a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome),
  );
}

function ImportPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const [parsed, setParsed] = useState<FusionParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleFile(file: File) {
    setFileName(file.name);
    setParsed(null);
    setError(null);
    setStep(0);

    try {
      // A leitura é real; os passos existem para o operador acompanhar.
      const result = await parseFusionFile(file);
      for (let i = 1; i < STEPS.length; i++) {
        await new Promise((r) => setTimeout(r, 280));
        setStep(i);
      }
      setParsed(result);
      result.warnings.forEach((w) => toast.warning(w));
    } catch (e) {
      setStep(-1);
      setError(
        e instanceof FusionParseError
          ? e.message
          : "Não foi possível processar o arquivo. Verifique se é o export do Fusion.",
      );
    }
  }

  function reset() {
    setStep(-1);
    setParsed(null);
    setError(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function createBatch() {
    if (!parsed) return;
    setCreating(true);
    const batch = store.createBatchFromImport({
      deliveries: parsed.deliveries,
      carga: parsed.carga,
    });
    toast.success(`Lote ${batch.codigo} criado`);
    void navigate({
      to: "/admin/lotes/$batchId",
      params: { batchId: batch.id },
    });
  }

  const preview = parsed ? buildPreview(parsed) : [];
  const dias = parsed
    ? Array.from(
        new Set(parsed.deliveries.map((d) => d.dataPrevistaEntrega.slice(0, 10))),
      ).sort()
    : [];
  const totalPeso = parsed?.deliveries.reduce((s, d) => s + d.peso, 0) ?? 0;
  const totalValor = parsed?.deliveries.reduce((s, d) => s + d.valor, 0) ?? 0;
  const processing = step >= 0 && !parsed;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Importar rota</h1>
        <p className="text-sm text-muted-foreground">
          Envie o arquivo XLS gerado pelo Fusion para criar um novo lote de
          entregas.
        </p>
      </header>

      <input
        ref={inputRef}
        type="file"
        accept=".xls,.xlsx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      {step === -1 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          className={cn(
            "rounded-2xl border-2 border-dashed bg-card p-8 transition-colors",
            dragging && "border-primary bg-primary/5",
          )}
        >
          <div className="flex flex-col items-center text-center">
            <div className="rounded-full bg-primary/10 p-4 text-primary">
              <UploadCloud className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">
              Envie o arquivo do Fusion
            </h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Arraste o arquivo aqui ou selecione. Aceitamos <code>.xls</code> e{" "}
              <code>.xlsx</code>, na aba <strong>Entregas</strong>.
            </p>
            <Button
              className="mt-5"
              size="lg"
              onClick={() => inputRef.current?.click()}
            >
              <UploadCloud className="mr-2 h-4 w-4" /> Selecionar arquivo
            </Button>
          </div>

          {error && (
            <div className="mx-auto mt-6 flex max-w-md items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Não foi possível importar</p>
                <p className="mt-0.5 text-destructive/90">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {step >= 0 && (
        <div className="rounded-2xl border bg-card p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
              <FileSpreadsheet className="h-8 w-8 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {parsed
                    ? `Aba "${parsed.sheetName}" · ${parsed.colunas} colunas · ${parsed.deliveries.length} entregas`
                    : "Lendo a estrutura do Fusion…"}
                </p>
              </div>
              {processing ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-[color:var(--brand-blue-strong)]" />
              )}
            </div>

            <Progress value={((step + 1) / STEPS.length) * 100} />

            <ul className="space-y-1.5">
              {STEPS.map((s, i) => {
                const done = i < step || (i === step && !!parsed);
                const doing = i === step && !parsed;
                return (
                  <li key={s} className="flex items-center gap-2 text-sm">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[color:var(--brand-blue-strong)]" />
                    ) : doing ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border" />
                    )}
                    <span
                      className={
                        done || doing
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {s}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {parsed && (
        <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Resumo da importação</h2>
            <p className="text-xs text-muted-foreground">
              Confira antes de criar o lote.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric
              icon={<Package className="h-4 w-4" />}
              label="Entregas"
              value={fmtInt(parsed.deliveries.length)}
              tone="brand"
            />
            <Metric
              icon={<MapPin className="h-4 w-4" />}
              label="Praças"
              value={fmtInt(preview.length)}
            />
            <Metric
              icon={<CalendarDays className="h-4 w-4" />}
              label="Dias"
              value={fmtInt(dias.length)}
            />
            <Metric
              icon={<FileSpreadsheet className="h-4 w-4" />}
              label="Carga"
              value={String(parsed.carga || "-")}
            />
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <Row k="Período" v={
              dias.length
                ? `${fmtDate(dias[0])} a ${fmtDate(dias[dias.length - 1])}`
                : "-"
            } />
            <Row k="Peso total" v={fmtWeight(totalPeso)} />
            <Row k="Valor total" v={fmtCurrency(totalValor)} />
          </div>

          {parsed.warnings.length > 0 && (
            <ul className="space-y-1.5">
              {parsed.warnings.map((w) => (
                <li
                  key={w}
                  className="flex items-start gap-2 rounded-lg border-l-4 border-[color:var(--brand-warn)] bg-[color:var(--brand-warn-bg)] px-3 py-2 text-xs font-medium text-[color:var(--brand-warn-fg)]"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Praças identificadas
            </p>
            <ol className="divide-y rounded-xl border">
              {preview.map((p, i) => (
                <li
                  key={`${p.data}-${p.nome}`}
                  className="flex items-center gap-3 p-3"
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(p.data)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <p className="font-semibold">{fmtInt(p.entregas)} entregas</p>
                    <p className="text-muted-foreground">
                      {fmtWeight(p.peso)} · {fmtCurrency(p.valor)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col justify-end gap-2 sm:flex-row">
            <Button variant="outline" onClick={reset} disabled={creating}>
              Enviar outro arquivo
            </Button>
            <Button size="lg" onClick={createBatch} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar lote de entregas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "brand";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        tone === "brand" ? "border-primary/20 bg-primary/10" : "bg-muted/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-1 truncate text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 rounded-md bg-muted/40 px-3 py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="truncate font-semibold text-foreground">{v}</span>
    </div>
  );
}
