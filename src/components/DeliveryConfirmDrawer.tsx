import { Camera, CheckCircle2, Loader2, Trash2, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { fmtCurrency, fmtWeight } from "@/lib/format";
import { compressImage } from "@/lib/image";
import type { Delivery, EntregaConcluida } from "@/types";

interface Props {
  delivery: Delivery | null;
  onClose: () => void;
  onConfirm: (prova: Omit<EntregaConcluida, "em">) => void;
}

/**
 * Confirmação da entrega no ponto: quem recebeu, observação e foto do
 * comprovante. Tudo opcional — travar o motorista na porta do cliente por
 * causa de um campo obrigatório é pior do que registrar menos.
 */
export function DeliveryConfirmDrawer({ delivery, onClose, onConfirm }: Props) {
  const open = !!delivery;
  const inputFoto = useRef<HTMLInputElement>(null);
  const [recebedor, setRecebedor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRecebedor("");
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

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92dvh]">
        {delivery && (
          <>
            <DrawerHeader className="text-left">
              <DrawerTitle className="text-lg">Confirmar entrega</DrawerTitle>
              <DrawerDescription>
                {delivery.cliente} · {fmtWeight(delivery.peso)} ·{" "}
                {fmtCurrency(delivery.valor)}
              </DrawerDescription>
            </DrawerHeader>

            <div className="min-w-0 space-y-3 overflow-y-auto px-4 pb-2">
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                {delivery.endereco} — {delivery.bairro}
              </div>

              <div>
                <Label className="text-xs">Quem recebeu</Label>
                <Input
                  className="mt-1"
                  value={recebedor}
                  onChange={(e) => setRecebedor(e.target.value)}
                  placeholder="Nome de quem assinou (opcional)"
                />
              </div>

              <div>
                <Label className="text-xs">Observação</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Entrega parcial, avaria, etc. (opcional)"
                />
              </div>

              <div>
                <Label className="text-xs">Foto do comprovante</Label>
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
                      alt="Comprovante da entrega"
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
                className="h-12 w-full"
                disabled={processando}
                onClick={() =>
                  onConfirm({
                    recebedor: recebedor.trim() || undefined,
                    observacao: observacao.trim() || undefined,
                    foto: foto ?? undefined,
                  })
                }
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar entrega
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
