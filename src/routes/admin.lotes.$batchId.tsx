import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fmtCurrency,
  fmtDate,
  fmtInt,
  fmtWeight,
} from "@/lib/format";
import {
  batchTotals,
  squareTotals,
  store,
  useStore,
} from "@/services/store";

export const Route = createFileRoute("/admin/lotes/$batchId")({
  component: BatchDetailsPage,
});

function BatchDetailsPage() {
  const { batchId } = useParams({ from: "/admin/lotes/$batchId" });
  const batch = useStore((s) => s.batches.find((b) => b.id === batchId));
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!batch) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Lote não encontrado.</p>
        <Button asChild className="mt-4">
          <Link to="/admin">Voltar</Link>
        </Button>
      </div>
    );
  }

  const t = batchTotals(batch);
  const dr = store.getDrivers().find((d) => d.id === batch.motoristaId);
  const dias = Array.from(new Set(batch.squares.map((s) => s.data))).sort();
  const link = `masterrotas.app/rota/${batch.routeCode}`;

  function copy() {
    void navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copiado");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Detalhes do lote
          </p>
          <h1 className="mt-1 font-mono text-2xl font-bold">{batch.codigo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Carga {batch.carga} · Motorista {dr?.nome ?? "-"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={batch.status} />
          <Button size="lg" onClick={() => setOpen(true)}>
            <Truck className="mr-2 h-4 w-4" /> Gerar acesso do motorista
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Dias" value={fmtInt(t.dias)} />
        <StatCard label="Praças" value={fmtInt(t.pracas)} />
        <StatCard label="Entregas" value={fmtInt(t.entregas)} tone="brand" />
        <StatCard
          label="Peso"
          value={fmtWeight(t.peso)}
          hint={`${fmtCurrency(t.valor)} em valor`}
        />
      </div>

      <section className="rounded-2xl border bg-card shadow-sm">
        <header className="border-b p-4">
          <h2 className="text-base font-semibold">Praças e dias planejados</h2>
          <p className="text-xs text-muted-foreground">
            Sequência gerada pelo Fusion (a ordem final é definida pelo motorista).
          </p>
        </header>
        <ol className="divide-y">
          {batch.squares.map((sq, i) => {
            const st = squareTotals(batch, sq.id);
            return (
              <li key={sq.id} className="flex items-center gap-4 p-4">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{sq.nome}</p>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" /> {fmtDate(sq.data)}
                    <span aria-hidden>·</span>
                    <MapPin className="h-3 w-3" /> {sq.cidade}/{sq.uf}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <p className="inline-flex items-center gap-1 font-semibold">
                    <Package className="h-3 w-3" /> {fmtInt(st.entregas)} entregas
                  </p>
                  <p className="text-muted-foreground">
                    {fmtWeight(st.peso)} · {fmtCurrency(st.valor)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        <footer className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          Período: {fmtDate(dias[0])} — {fmtDate(dias[dias.length - 1])}
        </footer>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acesso do motorista gerado</DialogTitle>
            <DialogDescription>
              Compartilhe o link abaixo com {dr?.nome}. Nesta versão, o acesso é
              mockado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Link de acesso
              </p>
              <p className="mt-1 break-all font-mono text-sm">{link}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Código de acesso
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest">
                {batch.accessCode}
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={copy}>
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Copiar link
            </Button>
            <Button asChild>
              <Link
                to="/rota/$routeCode"
                params={{ routeCode: batch.routeCode }}
              >
                <ExternalLink className="mr-2 h-4 w-4" /> Abrir visão do
                motorista
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}