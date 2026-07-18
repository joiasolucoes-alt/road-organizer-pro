import { ArrowRight } from "lucide-react";

interface Props {
  original: number;
  atual: number;
  compact?: boolean;
}

export function ChangeIndicator({ original, atual, compact }: Props) {
  const changed = original !== atual;
  if (!changed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        Original: <strong className="text-foreground">{original}</strong>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--brand-warn-bg)] px-2 py-0.5 text-xs font-medium text-[color:var(--brand-warn-fg)] ring-1 ring-[color:var(--brand-warn)]/40">
      {!compact && "Ordem"}
      <span className="line-through opacity-70">{original}</span>
      <ArrowRight className="h-3 w-3" aria-hidden />
      <span className="font-bold">{atual}</span>
      <span className="sr-only">
        Ordem alterada de {original} para {atual}
      </span>
    </span>
  );
}