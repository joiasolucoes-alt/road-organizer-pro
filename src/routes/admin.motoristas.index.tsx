import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BadgeCheck,
  History,
  IdCard,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Truck,
  UserPlus,
  Users,
} from "lucide-react";
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
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { store, useStore } from "@/services/store";
import {
  CNH_CATEGORIAS,
  diasAteVencimento,
  vehicleLabel,
  type CnhCategoria,
  type Driver,
} from "@/types";

export const Route = createFileRoute("/admin/motoristas/")({
  head: () => ({
    meta: [
      { title: "Motoristas — Master Rotas" },
      {
        name: "description",
        content: "Gestão da equipe de motoristas da Master Distribuidora.",
      },
    ],
  }),
  component: MotoristasPage,
});

type Rascunho = Omit<Driver, "id">;

const VAZIO: Rascunho = {
  nome: "",
  telefone: "",
  ativo: true,
};

function MotoristasPage() {
  const drivers = useStore((s) => s.drivers);
  const batches = useStore((s) => s.batches);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [creating, setCreating] = useState(false);

  function usageCount(id: string) {
    return batches.filter((b) => b.motoristaId === id).length;
  }

  const comPendencia = drivers.filter((d) => {
    const cnh = diasAteVencimento(d.cnhValidade);
    return cnh !== null && cnh < 30;
  }).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Equipe
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Motoristas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre os motoristas que receberão acesso às rotas.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Novo motorista
        </Button>
      </header>

      {comPendencia > 0 && (
        <div className="flex items-start gap-2 rounded-xl border-l-4 border-[color:var(--brand-warn)] bg-[color:var(--brand-warn-bg)] px-3 py-2 text-sm font-medium text-[color:var(--brand-warn-fg)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {comPendencia} motorista(s) com CNH vencida ou a vencer em menos de 30
          dias.
        </div>
      )}

      <section className="rounded-2xl border bg-card shadow-sm">
        {drivers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Users className="h-8 w-8" />
            Nenhum motorista cadastrado.
          </div>
        ) : (
          <ul className="divide-y">
            {drivers.map((d) => (
              <DriverRow
                key={d.id}
                driver={d}
                usage={usageCount(d.id)}
                onEdit={() => setEditing(d)}
              />
            ))}
          </ul>
        )}
      </section>

      <DriverDialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Novo motorista"
        submitLabel={
          <>
            <Plus className="mr-2 h-4 w-4" /> Cadastrar
          </>
        }
        onSubmit={(data) => {
          store.addDriver(data);
          toast.success("Motorista cadastrado");
          setCreating(false);
        }}
      />

      <DriverDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing ?? undefined}
        title="Editar motorista"
        submitLabel="Salvar"
        onSubmit={(data) => {
          if (!editing) return;
          store.updateDriver(editing.id, data);
          toast.success("Motorista atualizado");
          setEditing(null);
        }}
      />
    </div>
  );
}

function DriverRow({
  driver: d,
  usage,
  onEdit,
}: {
  driver: Driver;
  usage: number;
  onEdit: () => void;
}) {
  const vehicles = useStore((s) => s.vehicles);
  const veiculo = vehicles.find((v) => v.id === d.veiculoPadraoId);
  const cnhDias = diasAteVencimento(d.cnhValidade);
  const inativo = d.ativo === false;

  return (
    <li className="flex flex-wrap items-center gap-3 p-4 sm:gap-4">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          inativo
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary",
        )}
      >
        {d.nome
          .split(" ")
          .map((p) => p[0])
          .slice(0, 2)
          .join("")}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate font-semibold">{d.nome}</p>
          {inativo && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
              Inativo
            </span>
          )}
          {cnhDias !== null && cnhDias < 30 && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                cnhDias < 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-[color:var(--brand-warn-bg)] text-[color:var(--brand-warn-fg)]",
              )}
            >
              {cnhDias < 0
                ? `CNH vencida em ${fmtDate(d.cnhValidade!)}`
                : `CNH vence em ${cnhDias}d`}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {d.telefone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" /> {d.telefone}
            </span>
          )}
          {d.cnhCategoria && (
            <span className="inline-flex items-center gap-1">
              <IdCard className="h-3 w-3" /> CNH {d.cnhCategoria}
            </span>
          )}
          {veiculo && (
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3 w-3" /> {vehicleLabel(veiculo)}
            </span>
          )}
        </div>
      </div>

      <p className="shrink-0 text-xs text-muted-foreground">
        {usage} lote(s)
      </p>

      <div className="flex shrink-0 gap-1">
        <Button asChild size="icon" variant="ghost" aria-label="Ver histórico">
          <Link to="/admin/motoristas/$driverId" params={{ driverId: d.id }}>
            <History className="h-4 w-4" />
          </Link>
        </Button>
        <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Excluir"
          onClick={() => {
            if (usage > 0) {
              toast.error(
                "Motorista vinculado a lote(s); remova o vínculo antes.",
              );
              return;
            }
            if (confirm(`Excluir ${d.nome}?`)) {
              store.deleteDriver(d.id);
              toast.success("Motorista excluído");
            }
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </li>
  );
}

function DriverDialog({
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
  initial?: Driver;
  title: string;
  submitLabel: React.ReactNode;
}) {
  const [f, setF] = useState<Rascunho>(VAZIO);
  const vehicles = useStore((s) => s.vehicles);

  // Recarrega o formulário sempre que o alvo da edição muda.
  useEffect(() => {
    if (!open) return;
    setF(initial ? { ...initial } : { ...VAZIO });
  }, [open, initial]);

  const set = <K extends keyof Rascunho>(k: K, v: Rascunho[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Apenas o nome é obrigatório. Preencha o que já tiver — o cadastro
            pode ser completado depois.
          </DialogDescription>
        </DialogHeader>

        <form
          id="form-motorista"
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.nome.trim()) {
              toast.error("Informe o nome do motorista.");
              return;
            }
            onSubmit(f);
          }}
        >
          <Secao titulo="Dados pessoais" icon={<Users className="h-4 w-4" />}>
            <Campo label="Nome" required className="sm:col-span-2">
              <Input
                value={f.nome}
                onChange={(e) => set("nome", e.target.value)}
                required
              />
            </Campo>
            <Campo label="Telefone" hint="usado no envio por WhatsApp">
              <Input
                value={f.telefone}
                onChange={(e) => set("telefone", e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </Campo>
            <Campo label="Telefone de emergência">
              <Input
                value={f.telefoneEmergencia ?? ""}
                onChange={(e) => set("telefoneEmergencia", e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </Campo>
            <Campo label="CPF">
              <Input
                value={f.cpf ?? ""}
                onChange={(e) => set("cpf", e.target.value)}
                placeholder="000.000.000-00"
              />
            </Campo>
            <Campo label="RG">
              <Input
                value={f.rg ?? ""}
                onChange={(e) => set("rg", e.target.value)}
              />
            </Campo>
            <Campo label="Data de nascimento">
              <Input
                type="date"
                value={f.dataNascimento ?? ""}
                onChange={(e) => set("dataNascimento", e.target.value)}
              />
            </Campo>
            <Campo label="E-mail">
              <Input
                type="email"
                value={f.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
              />
            </Campo>
          </Secao>

          <Secao titulo="Habilitação" icon={<IdCard className="h-4 w-4" />}>
            <Campo label="Número da CNH">
              <Input
                value={f.cnhNumero ?? ""}
                onChange={(e) => set("cnhNumero", e.target.value)}
              />
            </Campo>
            <Campo label="Categoria">
              <Select
                value={f.cnhCategoria ?? ""}
                onValueChange={(v) => set("cnhCategoria", v as CnhCategoria)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CNH_CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Validade da CNH">
              <Input
                type="date"
                value={f.cnhValidade ?? ""}
                onChange={(e) => set("cnhValidade", e.target.value)}
              />
            </Campo>
            <Campo label="Validade do MOPP" hint="produtos perigosos">
              <Input
                type="date"
                value={f.moppValidade ?? ""}
                onChange={(e) => set("moppValidade", e.target.value)}
              />
            </Campo>
          </Secao>

          <Secao
            titulo="Operacional"
            icon={<BadgeCheck className="h-4 w-4" />}
          >
            <Campo
              label="Veículo habitual"
              hint="o da carga é definido no lote"
            >
              <Select
                value={f.veiculoPadraoId ?? ""}
                onValueChange={(v) => set("veiculoPadraoId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {vehicleLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Campo label="Observações" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={f.observacoes ?? ""}
                onChange={(e) => set("observacoes", e.target.value)}
                placeholder="Restrições, preferências de rota, etc."
              />
            </Campo>
          </Secao>
        </form>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-motorista">
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Secao({
  titulo,
  icon,
  children,
}: {
  titulo: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {titulo}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Campo({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label className="text-xs">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
        {hint && (
          <span className="ml-1 font-normal text-muted-foreground">
            ({hint})
          </span>
        )}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
