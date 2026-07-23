import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ChangeIndicator } from "@/components/ChangeIndicator";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtInt } from "@/lib/format";
import { CHANGE_REASONS } from "@/mocks/data";
import { store, useStore } from "@/services/store";
import { isReorder } from "@/types";

export const Route = createFileRoute("/rota/$routeCode/resumo")({
  component: ResumoPage,
});

function ResumoPage() {
  const { routeCode } = useParams({ from: "/rota/$routeCode/resumo" });
  const batch = useStore((s) =>
    s.batches.find((b) => b.routeCode === routeCode),
  )!;
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const originalOrder = [...batch.squares].sort(
    (a, b) => a.ordemOriginal - b.ordemOriginal,
  );
  const newOrder = [...batch.squares].sort(
    (a, b) => a.ordemAtual - b.ordemAtual,
  );

  // Só reordenações exigem justificativa. Ocorrências são relatos de problema
  // e não bloqueiam a confirmação da rota.
  const reorders = batch.changes.filter(isReorder);
  const ocorrencias = batch.changes.filter((c) => c.ocorrencia);
  const changedSquares = reorders.filter((c) => c.tipo === "praca");
  const changedDeliveries = reorders.filter((c) => c.tipo === "entrega");
  const semJustificativa = reorders.filter((c) => !c.motivo);

  return (
    <div className="space-y-5 pb-24">
      <header>
        <Link
          to="/rota/$routeCode/pracas"
          params={{ routeCode }}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Revisar praças
        </Link>
        <h1 className="mt-2 text-xl font-bold sm:text-2xl">
          Resumo final da rota
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confira as alterações antes de confirmar. Após confirmar, a rota será
          bloqueada para edição.
        </p>
      </header>

      {semJustificativa.length > 0 && (
        <div className="rounded-lg border-l-4 border-[color:var(--brand-warn)] bg-[color:var(--brand-warn-bg)] px-3 py-2 text-xs font-medium text-[color:var(--brand-warn-fg)]">
          Informe o motivo de {semJustificativa.length} alteração(ões) antes de
          confirmar a rota.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Praças alteradas" value={fmtInt(changedSquares.length)} />
        <StatCard
          label="Praças sem alteração"
          value={fmtInt(batch.squares.length - changedSquares.length)}
        />
        <StatCard
          label="Entregas alteradas"
          value={fmtInt(changedDeliveries.length)}
          tone="brand"
        />
        <StatCard label="Ocorrências" value={fmtInt(ocorrencias.length)} />
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <OrderColumn
          title="Ordem original do Fusion"
          tone="muted"
          items={originalOrder.map((s) => ({
            id: s.id,
            n: s.ordemOriginal,
            label: s.nome,
          }))}
        />
        <OrderColumn
          title="Nova ordem definida"
          tone="primary"
          items={newOrder.map((s) => ({
            id: s.id,
            n: s.ordemAtual,
            label: s.nome,
            original: s.ordemOriginal,
          }))}
        />
      </section>

      {ocorrencias.length > 0 && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Ocorrências registradas</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Problemas relatados nas entregas. Não impedem a confirmação — a
            equipe logística é notificada.
          </p>
          <ul className="mt-3 space-y-2">
            {ocorrencias.map((c) => {
              const entrega = batch.deliveries.find(
                (d) => d.id === c.targetId,
              );
              return (
                <li
                  key={`oc-${c.id}`}
                  className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {entrega?.cliente ?? c.targetId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entrega?.bairro}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                    {c.ocorrencia}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {reorders.length > 0 && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">
            Justificativa das alterações
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Obrigatório — a equipe logística usa esta informação para revisar a
            rota.
          </p>
          <ul className="mt-3 space-y-3">
            {reorders.map((c) => {
              const label =
                c.tipo === "praca"
                  ? batch.squares.find((s) => s.id === c.targetId)?.nome
                  : batch.deliveries.find((d) => d.id === c.targetId)?.cliente;
              return (
                <li
                  key={c.id}
                  className="rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {c.tipo === "praca" ? "Praça" : "Entrega"}
                      </p>
                      <p className="font-semibold">{label}</p>
                    </div>
                    <ChangeIndicator
                      original={c.ordemOriginal}
                      atual={c.ordemNova}
                    />
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    <div>
                      <Label className="text-xs">Motivo</Label>
                      <Select
                        value={c.motivo}
                        onValueChange={(v) =>
                          store.saveChangeReason(
                            batch.id,
                            c.tipo,
                            c.targetId,
                            v,
                            c.observacao,
                          )
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione um motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          {CHANGE_REASONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Observação adicional</Label>
                      <Input
                        className="mt-1"
                        placeholder="Opcional"
                        defaultValue={c.observacao ?? ""}
                        onBlur={(e) =>
                          store.saveChangeReason(
                            batch.id,
                            c.tipo,
                            c.targetId,
                            c.motivo ?? "",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link to="/rota/$routeCode/pracas" params={{ routeCode }}>
              Voltar e revisar
            </Link>
          </Button>
          <Button
            className="flex-[2]"
            onClick={() => {
              if (semJustificativa.length > 0) {
                toast.error(
                  `Informe o motivo de ${semJustificativa.length} alteração(ões) antes de confirmar.`,
                );
                return;
              }
              setConfirmOpen(true);
            }}
          >
            Confirmar organização da rota
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar organização da rota</DialogTitle>
            <DialogDescription>
              Após confirmar, a rota será bloqueada para edição e o arquivo
              final poderá ser gerado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Voltar e revisar
            </Button>
            <Button
              onClick={() => {
                store.confirmRoute(batch.id);
                toast.success("Rota confirmada com sucesso");
                void navigate({
                  to: "/rota/$routeCode/confirmada",
                  params: { routeCode },
                });
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar rota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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