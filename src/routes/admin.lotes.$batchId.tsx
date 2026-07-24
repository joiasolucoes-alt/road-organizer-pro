import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  FileClock,
  MapPin,
  MessageCircle,
  Package,
  RefreshCw,
  Trash2,
  Truck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fmtCurrency,
  fmtDate,
  fmtInt,
  fmtWeight,
} from "@/lib/format";
import {
  batchTotals,
  driverAccess,
  squareTotals,
  store,
  useStore,
} from "@/services/store";

export const Route = createFileRoute("/admin/lotes/$batchId")({
  component: BatchDetailsPage,
});

function BatchDetailsPage() {
  const { batchId } = useParams({ from: "/admin/lotes/$batchId" });
  const navigate = useNavigate();
  const batch = useStore((s) => s.batches.find((b) => b.id === batchId));
  const drivers = useStore((s) => s.drivers);
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
  const dr = drivers.find((d) => d.id === batch.motoristaId);
  const dias = Array.from(new Set(batch.squares.map((s) => s.data))).sort();
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  // O código vai embutido: quem abre o link (ou lê o QR) entra direto.
  const link = `${origin}/rota/${batch.routeCode}?c=${batch.accessCode}`;
  const locked =
    batch.status === "confirmado" || batch.status === "arquivo_gerado";

  const periodo =
    dias.length > 0
      ? `${fmtDate(dias[0])} a ${fmtDate(dias[dias.length - 1])}`
      : "-";

  // Mensagem pronta para o motorista: link com acesso automático e, logo
  // abaixo, os códigos para quem preferir digitar.
  const mensagem = [
    `Olá, ${dr?.nome ?? "motorista"}! Segue o acesso à sua rota na Master Distribuidora.`,
    ``,
    `Carga ${batch.carga} · ${t.entregas} entregas · ${t.pracas} praças`,
    `Período: ${periodo}`,
    ``,
    `Abra o link abaixo — o acesso é automático:`,
    link,
    ``,
    `Se precisar entrar manualmente:`,
    `Código da rota: ${batch.routeCode}`,
    `Código de acesso: ${batch.accessCode}`,
  ].join("\n");

  // wa.me exige só dígitos com DDI. Os telefones vêm como "(32) 99811-4402".
  const telefoneWhats = (() => {
    const digitos = (dr?.telefone ?? "").replace(/\D/g, "");
    if (!digitos) return null;
    return digitos.startsWith("55") ? digitos : `55${digitos}`;
  })();

  const whatsappUrl = `https://wa.me/${telefoneWhats ?? ""}?text=${encodeURIComponent(mensagem)}`;

  function copy() {
    void navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copiado");
    setTimeout(() => setCopied(false), 1500);
  }

  function copyMessage() {
    void navigator.clipboard.writeText(mensagem);
    toast.success("Mensagem copiada");
  }

  function openAccess() {
    driverAccess.generate(batch!.id);
    setOpen(true);
  }

  function regenerate() {
    driverAccess.generate(batch!.id, { regenerate: true });
    toast.success("Novo código gerado");
  }

  function handleDelete() {
    if (locked) return;
    if (confirm(`Excluir o lote ${batch!.codigo}? Esta ação não pode ser desfeita.`)) {
      store.deleteBatch(batch!.id);
      toast.success("Lote excluído");
      void navigate({ to: "/admin/lotes" });
    }
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
          <div className="flex flex-wrap justify-end gap-2">
            {locked && (
              <Button asChild variant="outline">
                <Link
                  to="/admin/lotes/$batchId/alteracoes"
                  params={{ batchId }}
                >
                  <FileClock className="mr-2 h-4 w-4" /> Ver alterações
                </Link>
              </Button>
            )}
            {!locked && (
              <Button variant="outline" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </Button>
            )}
            <Button size="lg" onClick={openAccess}>
              <Truck className="mr-2 h-4 w-4" /> Gerar acesso do motorista
            </Button>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Motorista responsável
            </p>
            <p className="mt-1 font-semibold">{dr?.nome ?? "Não atribuído"}</p>
            {dr?.telefone && (
              <p className="text-xs text-muted-foreground">{dr.telefone}</p>
            )}
          </div>
          {!locked && drivers.length > 0 && (
            <div className="min-w-[220px]">
              <Select
                value={batch.motoristaId}
                onValueChange={(v) => {
                  store.assignDriver(batch.id, v);
                  toast.success("Motorista atualizado");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar motorista" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </section>

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
              Compartilhe o QR ou o link com {dr?.nome}. O acesso já vem
              embutido — não é preciso digitar código.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-4">
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-border">
                <QRCodeSVG value={link} size={168} level="M" />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                O motorista aponta a câmera e entra direto na rota.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0 rounded-lg border bg-muted/40 p-3">
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Código da rota
                </p>
                <p className="mt-1 truncate font-mono text-xl font-bold">
                  {batch.routeCode}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border bg-muted/40 p-3">
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Código de acesso
                </p>
                <p className="mt-1 truncate font-mono text-xl font-bold tracking-wider">
                  {batch.accessCode}
                </p>
              </div>
            </div>
            <div className="min-w-0 rounded-lg border bg-muted/40 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Link de acesso
              </p>
              <p className="mt-1 break-all font-mono text-[11px] leading-snug">
                {link}
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              asChild={!!telefoneWhats}
              disabled={!telefoneWhats}
              size="lg"
              className="w-full bg-[#25D366] text-white hover:bg-[#1FB855]"
            >
              {telefoneWhats ? (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Enviar por WhatsApp para {dr?.nome?.split(" ")[0]}
                </a>
              ) : (
                <span>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Motorista sem telefone cadastrado
                </span>
              )}
            </Button>

            <div className="grid w-full grid-cols-2 gap-2">
              <Button variant="outline" onClick={copy}>
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copiar link
              </Button>
              <Button variant="outline" onClick={copyMessage}>
                <Copy className="mr-2 h-4 w-4" /> Copiar mensagem
              </Button>
            </div>

            <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="ghost" size="sm" onClick={regenerate}>
                <RefreshCw className="mr-2 h-4 w-4" /> Regenerar código
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link
                  to="/rota/$routeCode"
                  params={{ routeCode: batch.routeCode }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> Abrir visão do
                  motorista
                </Link>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}