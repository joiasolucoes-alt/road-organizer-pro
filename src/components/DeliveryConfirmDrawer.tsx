import { Camera, CheckCircle2, Loader2, Trash2, X, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { fmtCurrency, fmtWeight } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { cn } from "@/lib/utils";
import {
  MOTIVOS_NAO_ENTREGA,
  type Delivery,
  type MotivoNaoEntrega,
  type RegistroEntrega,
} from "@/types";

interface Props {
  delivery: Delivery | null;
  onClose: () => void;
  onConfirm: (registro: Omit<RegistroEntrega, "em">) => void;
}

/**
 * Registro da entrega no ponto: entregue (recebedor + foto) ou não entregue
 * (motivo). Tudo opcional no caminho feliz — travar o motorista na porta do
 * cliente por um campo obrigatório é pior do que registrar menos. No caminho
 * de falha, o motivo é obrigatório: é a informação que o admin precisa.
 */
export function DeliveryConfirmDrawer({ delivery, onClose, onConfirm }: Props) {
  const open = !!delivery;
  const inputFoto = useRef<HTMLInputElement>(null);
  const [modo, setModo] = useState<"entregue" | "nao_entregue">("entregue");
  const [recebedor, setRecebedor] = useState("");
  const [motivo, setMotivo] = useState<MotivoNaoEntrega | "">("");
  const [observacao, setObservacao] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setModo("entregue");
    setRecebedor("");
    setMotivo("");
    setObservacao("");
    setFoto(null);
    setProcessando(false);
  }, [open, delivery?.id]);

  async function capturar(file: File) {
    setProcessando(true);
    try {
      setFoto(await compressImage(file));
    } catch {
      toast.error("Não foi possível processar a foto.");
    } finally {
      setProcessando(false);
      if (inputFoto.current) inputFoto.current.value = "";
    }
  }

  function confirmar() {
    if (modo === "nao_entregue" && !motivo) {
      toast.error("Selecione o motivo da não entrega.");
      return;
    }
    onConfirm(
      modo === "entregue"
        ? {
            status: "entregue",
            recebedor: recebedor.trim() || undefined,
            observacao: observacao.trim() || undefined,
            foto: foto ?? undefined,
          }
        : {
            status: "nao_entregue",
            motivo: motivo || undefined,
            observacao: observacao.trim() || undefined,
            foto: foto ?? undefined,
          },
    );
  }

  const falha = modo === "nao_entregue";

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92dvh]">
        {delivery && (
          <>
            <DrawerHeader className="text-left">
              <DrawerTitle className="text-lg">Registrar entrega</DrawerTitle>
              <DrawerDescription>
                {delivery.cliente} · {fmtWeight(delivery.peso)} ·{" "}
                {fmtCurrency(delivery.valor)}
              </DrawerDescription>
            </DrawerHeader>

            <div className="min-w-0 space-y-3 overflow-y-auto px-4 pb-2">
              {/* Alternador entregue / não entregue */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModo("entregue")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border-2 py-2.5 text-sm font-semibold transition-colors",
                    !falha
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" /> Entregue
                </button>
                <button
                  type="button"
                  onClick={() => setModo("nao_entregue")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border-2 py-2.5 text-sm font-semibold transition-colors",
                    falha
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border text-muted-foreground",
                  )}
                >
                  <XCircle className="h-4 w-4" /> Não entregue
                </button>
              </div>

              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                {delivery.endereco} — {delivery.bairro}
              </div>

              {falha ? (
                <div>
                  <Label className="text-xs">
                    Motivo <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={motivo}
                    onValueChange={(v) => setMotivo(v as MotivoNaoEntrega)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Por que não foi entregue?" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOTIVOS_NAO_ENTREGA.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label className="text-xs">Quem recebeu</Label>
                  <Input
                    className="mt-1"
                    value={recebedor}
                    onChange={(e) => setRecebedor(e.target.value)}
                    placeholder="Nome de quem assinou (opcional)"
                  />
                </div>
              )}

              <div>
                <Label className="text-xs">Observação</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder={
                    falha
                      ? "Detalhes da ocorrência (opcional)"
                      : "Entrega parcial, avaria, etc. (opcional)"
                  }
                />
              </div>

              <div>
                <Label className="text-xs">
                  {falha ? "Foto da ocorrência" : "Foto do comprovante"}
                </Label>
                <input
                  ref={inputFoto}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void capturar(f);
                  }}
                />
                {foto ? (
                  <div className="relative mt-1 overflow-hidden rounded-lg border">
                    <img
                      src={foto}
                      alt="Registro da entrega"
                      className="max-h-56 w-full object-cover"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute right-2 top-2 h-8 w-8"
                      aria-label="Remover foto"
                      onClick={() => setFoto(null)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-1 h-12 w-full"
                    disabled={processando}
                    onClick={() => inputFoto.current?.click()}
                  >
                    {processando ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="mr-2 h-4 w-4" />
                    )}
                    {processando ? "Processando…" : "Tirar foto"}
                  </Button>
                )}
              </div>
            </div>

            <DrawerFooter>
              <Button
                size="lg"
                className={cn(
                  "h-12 w-full",
                  falha && "bg-destructive text-white hover:bg-destructive/90",
                )}
                disabled={processando}
                onClick={confirmar}
              >
                {falha ? (
                  <XCircle className="mr-2 h-4 w-4" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {falha ? "Registrar não entrega" : "Confirmar entrega"}
              </Button>
              <Button variant="outline" onClick={onClose}>
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
