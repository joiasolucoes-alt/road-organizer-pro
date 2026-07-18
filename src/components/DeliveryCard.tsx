import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Info,
  MapPin,
  Package,
  Scale,
  Wallet,
} from "lucide-react";
import { ChangeIndicator } from "./ChangeIndicator";
import { Button } from "@/components/ui/button";
import { fmtCurrency, fmtDateTime, fmtInt, fmtWeight } from "@/lib/format";
import type { Delivery } from "@/types";

interface Props {
  delivery: Delivery;
  positionInSquare: number;
  onOpen?: () => void;
}

export function DeliveryCard({ delivery: d, positionInSquare, onOpen }: Props) {
  const changed = positionInSquare !== d.ordemOriginal;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-primary px-2 text-sm font-bold text-primary-foreground">
              {positionInSquare}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
                {d.cliente}
              </h3>
              <p className="truncate text-xs text-muted-foreground">
                {d.razaoSocial}
              </p>
            </div>
          </div>

          <div className="mt-2 space-y-0.5 text-xs text-foreground">
            <p className="flex items-start gap-1.5">
              <MapPin
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0">
                {d.endereco}
                <br />
                <span className="text-muted-foreground">
                  {d.bairro} — {d.cidade}/{d.uf}
                </span>
              </span>
            </p>
          </div>
        </div>

        <ChangeIndicator
          original={d.ordemOriginal}
          atual={positionInSquare}
          compact
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <MiniStat
          icon={<Scale className="h-3.5 w-3.5" />}
          label="Peso"
          value={fmtWeight(d.peso)}
        />
        <MiniStat
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Valor"
          value={fmtCurrency(d.valor)}
        />
        <MiniStat
          icon={<Package className="h-3.5 w-3.5" />}
          label="Itens"
          value={fmtInt(d.quantidadeItens)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" aria-hidden />
          {fmtDateTime(d.dataPrevistaEntrega)}
        </span>
        {d.enderecoConfirmado ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-lime)]/25 px-2 py-0.5 font-medium text-[color:var(--brand-blue-strong)]">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Endereço
            confirmado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-warn-bg)] px-2 py-0.5 font-medium text-[color:var(--brand-warn-fg)]">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden /> Endereço não
            confirmado
          </span>
        )}
      </div>

      {changed && (
        <div className="rounded-md bg-[color:var(--brand-warn-bg)] px-2 py-1 text-[11px] font-medium text-[color:var(--brand-warn-fg)] ring-1 ring-[color:var(--brand-warn)]/40">
          Ordem alterada pelo motorista
        </div>
      )}

      {onOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={onOpen}
          className="w-full"
        >
          <Info className="mr-1.5 h-3.5 w-3.5" /> Ver detalhes da entrega
        </Button>
      )}
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-muted/60 px-2 py-1">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-0.5 truncate text-xs font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}