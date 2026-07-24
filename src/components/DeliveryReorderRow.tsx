import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  MapPinOff,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fmtCurrency, fmtWeight } from "@/lib/format";
import { cn } from "@/lib/utils";
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

export function DeliveryReorderRow({
  delivery: d,
  positionInSquare,
  originalPosition = d.ordemOriginal,
  issueReason,
  onIssueChange,
  onOpen,
}: Props) {
  const changed = positionInSquare !== originalPosition;
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
          issueReason
            ? "bg-destructive text-destructive-foreground"
            : "bg-primary text-primary-foreground",
        )}
      >
        {positionInSquare}
      </span>

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        {/* min-w-0 no container E no <p>: sem isso o nome do cliente nao
            encolhe e alarga a linha inteira para fora da tela. */}
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="min-w-0 truncate text-sm font-semibold text-foreground">
            {d.cliente}
          </p>
          {changed && (
            <span
              className="inline-flex shrink-0 items-center rounded bg-[color:var(--brand-warn-bg)] px-1 text-[10px] font-semibold text-[color:var(--brand-warn-fg)]"
              title={`Ordem original: ${originalPosition}`}
            >
              {originalPosition}→{positionInSquare}
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-muted-foreground">
          {d.bairro} · {d.endereco}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-muted-foreground sm:hidden">
          <span className="rounded bg-muted px-1.5 py-0.5">
            {fmtWeight(d.peso)}
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5">
            {fmtCurrency(d.valor)}
          </span>
          {issueReason && (
            <span className="inline-flex items-center gap-0.5 rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {issueReason}
            </span>
          )}
        </div>
      </button>

      <div className="hidden shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground sm:flex">
        <span className="rounded bg-muted px-2 py-1 tabular-nums">
          {fmtWeight(d.peso)}
        </span>
        <span className="rounded bg-muted px-2 py-1 tabular-nums">
          {fmtCurrency(d.valor)}
        </span>
        {issueReason && (
          <span
            className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-1 text-destructive"
            title={issueReason}
          >
            <AlertCircle className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      {onIssueChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Registrar ocorrência"
            >
              <MoreVertical className="h-4 w-4" />
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
  );
}