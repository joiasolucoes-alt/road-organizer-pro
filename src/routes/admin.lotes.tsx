import { createFileRoute, Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/StatusBadge";
import {
  fmtCurrency,
  fmtDateTime,
  fmtInt,
  fmtWeight,
} from "@/lib/format";
import { batchTotals, useStore } from "@/services/store";

export const Route = createFileRoute("/admin/lotes")({
  component: LotesPage,
});

function LotesPage() {
  const batches = useStore((s) => s.batches);
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Lotes</h1>
        <p className="text-sm text-muted-foreground">
          Todos os lotes importados do Fusion.
        </p>
      </header>

      <div className="grid gap-3">
        {batches.map((b) => {
          const t = batchTotals(b);
          return (
            <Link
              key={b.id}
              to="/admin/lotes/$batchId"
              params={{ batchId: b.id }}
              className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold">{b.codigo}</p>
                  <p className="text-xs text-muted-foreground">
                    Carga {b.carga} · Importado em {fmtDateTime(b.createdAt)}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs sm:grid-cols-5">
                <Fact label="Dias" value={fmtInt(t.dias)} />
                <Fact label="Praças" value={fmtInt(t.pracas)} />
                <Fact label="Entregas" value={fmtInt(t.entregas)} />
                <Fact label="Peso" value={fmtWeight(t.peso)} />
                <Fact label="Valor" value={fmtCurrency(t.valor)} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}