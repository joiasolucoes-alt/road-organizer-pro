import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { store, useStore } from "@/services/store";
import type { Driver } from "@/types";

export const Route = createFileRoute("/admin/motoristas")({
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

function MotoristasPage() {
  const drivers = useStore((s) => s.drivers);
  const batches = useStore((s) => s.batches);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [creating, setCreating] = useState(false);

  function usageCount(id: string) {
    return batches.filter((b) => b.motoristaId === id).length;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-end justify-between gap-3">
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

      <section className="rounded-2xl border bg-card shadow-sm">
        {drivers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Users className="h-8 w-8" />
            Nenhum motorista cadastrado.
          </div>
        ) : (
          <ul className="divide-y">
            {drivers.map((d) => {
              const usage = usageCount(d.id);
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center gap-4 p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {d.nome
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{d.nome}</p>
                    <p className="text-xs text-muted-foreground">{d.telefone}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {usage} lote(s) vinculado(s)
                  </p>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing(d)}
                      aria-label="Editar"
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
            })}
          </ul>
        )}
      </section>

      <DriverDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(nome, telefone) => {
          store.addDriver(nome, telefone);
          toast.success("Motorista cadastrado");
          setCreating(false);
        }}
        title="Novo motorista"
        submitLabel={
          <>
            <Plus className="mr-2 h-4 w-4" /> Cadastrar
          </>
        }
      />

      <DriverDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing ?? undefined}
        onSubmit={(nome, telefone) => {
          if (editing) {
            store.updateDriver(editing.id, { nome, telefone });
            toast.success("Motorista atualizado");
            setEditing(null);
          }
        }}
        title="Editar motorista"
        submitLabel="Salvar"
      />
    </div>
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
  onSubmit: (nome: string, telefone: string) => void;
  initial?: Driver;
  title: string;
  submitLabel: React.ReactNode;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [telefone, setTelefone] = useState(initial?.telefone ?? "");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
        else {
          setNome(initial?.nome ?? "");
          setTelefone(initial?.telefone ?? "");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nome.trim()) return;
            onSubmit(nome, telefone);
          }}
        >
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="mt-1"
              placeholder="(00) 00000-0000"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}