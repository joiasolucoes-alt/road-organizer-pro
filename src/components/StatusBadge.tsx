import { cn } from "@/lib/utils";
import type { BatchStatus } from "@/types";

const MAP: Record<BatchStatus, { label: string; className: string }> = {
  importado: {
    label: "Importado",
    className: "bg-secondary text-secondary-foreground",
  },
  disponivel: {
    label: "Disponível para organização",
    className:
      "bg-[color:var(--brand-lime)]/25 text-[color:var(--brand-blue-strong)] ring-1 ring-[color:var(--brand-lime)]/40",
  },
  em_edicao: {
    label: "Em edição pelo motorista",
    className:
      "bg-[color:var(--brand-warn-bg)] text-[color:var(--brand-warn-fg)] ring-1 ring-[color:var(--brand-warn)]/40",
  },
  confirmado: {
    label: "Confirmado",
    className: "bg-primary text-primary-foreground",
  },
  arquivo_gerado: {
    label: "Arquivo gerado",
    className: "bg-[color:var(--brand-blue-strong)] text-primary-foreground",
  },
};

export function StatusBadge({ status }: { status: BatchStatus }) {
  const s = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}