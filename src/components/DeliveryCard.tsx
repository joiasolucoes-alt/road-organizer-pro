import {
  AlertCircle,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  MapPinOff,
  MoreHorizontal,
  Package,
  Scale,
  Wallet,
} from "lucide-react";
import { ChangeIndicator } from "./ChangeIndicator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fmtCurrency, fmtDateTime, fmtInt, fmtWeight } from "@/lib/format";
import type { Delivery, DeliveryIssueReason } from "@/types";

const DELIVERY_ISSUES: {
  reason: DeliveryIssueReason;
  icon: React.ReactNode;
}[] = [
  { reason: "Endereço errado", icon: <MapPinOff className="h-4 w-4" /> },
  { reason: "Restrição de horário", icon: <Clock className="h-4 w-4" /> },
  { reason: "Inviável de entrega", icon: <Ban className="h-4 w-4" /> },
];

interface Props {
  delivery: Delivery;
  positionInSquare: number;
  originalPosition?: number;
  issueReason?: DeliveryIssueReason;
  onIssueChange?: (reason: DeliveryIssueReason | null) => void;
  onOpen?: () => void;
}

export function DeliveryCard({
  delivery: d,
  positionInSquare,
  originalPosition = d.ordemOriginal,
  issueReason,
  onIssueChange,
  onOpen,
}: Props) {
  const changed = positionInSquare !== originalPosition;
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

        <div className="flex shrink-0 flex-col items-end gap-2">
          <ChangeIndicator
            original={originalPosition}
            atual={positionInSquare}
            compact
          />
          {onIssueChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Abrir opções da entrega"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Ocorrência da entrega</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {DELIVERY_ISSUES.map((item) => (
                  <DropdownMenuItem
                    key={item.reason}
                    onClick={() => onIssueChange(item.reason)}
                  >
                    {item.icon}
                    <span>{item.reason}</span>
                    {issueReason === item.reason && (
                      <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
                {issueReason && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onIssueChange(null)}>
                      <AlertCircle className="h-4 w-4" />
                      Limpar ocorrência
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
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

      {issueReason && (
        <div className="inline-flex w-fit items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive ring-1 ring-destructive/20">
          <AlertCircle className="h-3.5 w-3.5" />
          {issueReason}
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
