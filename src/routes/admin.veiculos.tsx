import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { fmtWeight } from "@/lib/format";
import { cn } from "@/lib/utils";
import { store, useStore } from "@/services/store";
import { VEICULO_TIPOS, type Vehicle, type VeiculoTipo } from "@/types";

export const Route = createFileRoute("/admin/veiculos")({
  head: () => ({
    meta: [
      { title: "Veículos — Master Rotas" },
      {
        name: "description",
        content: "Frota da Master Distribuidora.",
      },
    ],
  }),
  component: VeiculosPage,
});

type Rascunho = Omit<Vehicle, "id">;
const VAZIO: Rascunho = { placa: "", ativo: true };

function VeiculosPage() {
  const vehicles = useStore((s) => s.vehicles);
  const batches = useStore((s) => s.batches);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Frota
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Veículos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            O veículo é vinculado à carga, não ao motorista — o mesmo motorista
            pode rodar com caminhões diferentes.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo veículo
        </Button>
      </header>

      <section className="rounded-2xl border bg-card shadow-sm">
        {vehicles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Truck className="h-8 w-8" />
            Nenhum veículo cadastrado.
          </div>
        ) : (
          <ul className="divide-y">
            {vehicles.map((v) => {
              const usage = batches.filter((b) => b.veiculoId === v.id).length;
              const inativo = v.ativo === false;
              return (
                <li key={v.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      inativo
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    <Truck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-mono font-bold">{v.placa}</p>
                      {v.tipo && (
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                          {v.tipo}
                        </span>
                      )}
                      {inativo && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        v.modelo,
                        v.ano,
                        v.capacidadeKg ? fmtWeight(v.capacidadeKg) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Sem detalhes"}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {usage} lote(s)
                  </p>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Editar"
                      onClick={() => setEditing(v)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Excluir"
                      onClick={() => {
                        if (usage > 0) {
                          toast.error(
                            "Veículo vinculado a lote(s); remova o vínculo antes.",
                          );
                          return;
                        }
                        if (confirm(`Excluir o veículo ${v.placa}?`)) {
                          store.deleteVehicle(v.id);
                          toast.success("Veículo excluído");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <VehicleDialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Novo veículo"
        submitLabel={
          <>
            <Plus className="mr-2 h-4 w-4" /> Cadastrar
          </>
        }
        onSubmit={(data) => {
          store.addVehicle(data);
          toast.success("Veículo cadastrado");
          setCreating(false);
        }}
      />

      <VehicleDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing ?? undefined}
        title="Editar veículo"
        submitLabel="Salvar"
        onSubmit={(data) => {
          if (!editing) return;
          store.updateVehicle(editing.id, data);
          toast.success("Veículo atualizado");
          setEditing(null);
        }}
      />
    </div>
  );
}

function VehicleDialog({
  open,
  onClose,
  onSubmit,
  initial,
  title,
  submitLabel,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Rascunho) => void;
  initial?: Vehicle;
  title: string;
  submitLabel: React.ReactNode;
}) {
  const [f, setF] = useState<Rascunho>(VAZIO);

  useEffect(() => {
    if (!open) return;
    setF(initial ? { ...initial } : { ...VAZIO });
  }, [open, initial]);

  const set = <K extends keyof Rascunho>(k: K, v: Rascunho[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Apenas a placa é obrigatória. A capacidade é usada para conferir o
            peso da carga.
          </DialogDescription>
        </DialogHeader>

        <form
          id="form-veiculo"
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.placa.trim()) {
              toast.error("Informe a placa.");
              return;
            }
            onSubmit(f);
          }}
        >
          <Campo label="Placa" required>
            <Input
              value={f.placa}
              onChange={(e) => set("placa", e.target.value.toUpperCase())}
              placeholder="ABC1D23"
              className="font-mono uppercase"
              required
            />
          </Campo>
          <Campo label="Tipo">
            <Select
              value={f.tipo ?? ""}
              onValueChange={(v) => set("tipo", v as VeiculoTipo)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {VEICULO_TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Modelo">
            <Input
              value={f.modelo ?? ""}
              onChange={(e) => set("modelo", e.target.value)}
              placeholder="VW Delivery 9.170"
            />
          </Campo>
          <Campo label="Ano">
            <Input
              value={f.ano ?? ""}
              onChange={(e) => set("ano", e.target.value)}
              placeholder="2021"
            />
          </Campo>
          <Campo label="Capacidade (kg)">
            <Input
              type="number"
              min={0}
              value={f.capacidadeKg ?? ""}
              onChange={(e) =>
                set(
                  "capacidadeKg",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              placeholder="4000"
            />
          </Campo>
          <Campo label="Situação">
            <Select
              value={f.ativo === false ? "inativo" : "ativo"}
              onValueChange={(v) => set("ativo", v === "ativo")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="RENAVAM">
            <Input
              value={f.renavam ?? ""}
              onChange={(e) => set("renavam", e.target.value)}
            />
          </Campo>
          <Campo label="RNTRC / ANTT">
            <Input
              value={f.antt ?? ""}
              onChange={(e) => set("antt", e.target.value)}
            />
          </Campo>
          <Campo label="Observações" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={f.observacoes ?? ""}
              onChange={(e) => set("observacoes", e.target.value)}
              placeholder="Baú refrigerado, restrição de altura, etc."
            />
          </Campo>
        </form>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-veiculo">
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label className="text-xs">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
