import { ExternalLink, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { fmtCurrency, fmtDateTime, fmtInt, fmtWeight } from "@/lib/format";
import { googleMapsNavUrl, wazeNavUrl } from "@/lib/nav";
import type { Delivery } from "@/types";

interface Props {
  delivery: Delivery | null;
  onClose: () => void;
}

export function DeliveryDetailsDrawer({ delivery, onClose }: Props) {
  const open = !!delivery;
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        {delivery && (
          <>
            <DrawerHeader className="text-left">
              <DrawerTitle className="text-lg">{delivery.cliente}</DrawerTitle>
              <DrawerDescription>{delivery.razaoSocial}</DrawerDescription>
            </DrawerHeader>

            <div className="grid gap-4 overflow-y-auto px-4 pb-2">
              <Section title="Pedido">
                <Row k="Pedido" v={delivery.pedido} />
                <Row k="Prenota ERP" v={delivery.prenotaERP} />
                <Row k="Nota fiscal" v={delivery.notaFiscal} />
                <Row k="Carga" v={String(delivery.carga)} />
                <Row k="Status" v={delivery.status} />
                <Row k="Tipo" v={delivery.tipo} />
              </Section>

              <Section title="Endereço">
                <Row k="Logradouro" v={delivery.endereco} />
                <Row k="Bairro" v={delivery.bairro} />
                <Row k="Cidade/UF" v={`${delivery.cidade}/${delivery.uf}`} />
                <Row k="Praça" v={delivery.praca} />
                <Row
                  k="Endereço confirmado"
                  v={delivery.enderecoConfirmado ? "Sim" : "Não"}
                />
                <Row k="Latitude" v={String(delivery.latitude)} />
                <Row k="Longitude" v={String(delivery.longitude)} />
              </Section>

              <Section title="Carga e valores">
                <Row k="Peso" v={fmtWeight(delivery.peso)} />
                <Row k="Valor" v={fmtCurrency(delivery.valor)} />
                <Row
                  k="Quantidade de itens"
                  v={fmtInt(delivery.quantidadeItens)}
                />
                <Row
                  k="Entrega prevista"
                  v={fmtDateTime(delivery.dataPrevistaEntrega)}
                />
              </Section>

              {delivery.observacao && (
                <Section title="Observação">
                  <p className="text-sm text-foreground">
                    {delivery.observacao}
                  </p>
                </Section>
              )}
            </div>

            <DrawerFooter>
              <div className="flex gap-2">
                <Button asChild className="flex-1" variant="default">
                  <a
                    href={googleMapsNavUrl(delivery.latitude, delivery.longitude)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Navigation className="mr-2 h-4 w-4" /> Google Maps
                  </a>
                </Button>
                <Button asChild className="flex-1" variant="secondary">
                  <a
                    href={wazeNavUrl(delivery.latitude, delivery.longitude)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Navigation className="mr-2 h-4 w-4" /> Waze
                  </a>
                </Button>
              </div>
              <Button asChild variant="outline" className="w-full">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${delivery.latitude},${delivery.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> Ver no mapa
                </a>
              </Button>
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="rounded-lg border bg-card p-3">{children}</div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium text-foreground">{v}</span>
    </div>
  );
}