import { CalendarDays, MapPin, Package, Scale, Wallet } from "lucide-react";
import { ChangeIndicator } from "./ChangeIndicator";
import { fmtCurrency, fmtDate, fmtInt, fmtWeight } from "@/lib/format";
import type { Square } from "@/types";

interface Props {
  square: Square;
  totals: { peso: number; valor: number; entregas: number };
}

export function SquareCard({ square, totals }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-primary px-2 text-sm font-bold text-primary-foreground">
              {square.ordemAtual}
            </span>
            <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">
              {square.nome}
            </h3>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" aria-hidden />
            {square.cidade} — {square.uf}
          </p>
        </div>
        <ChangeIndicator
          original={square.ordemOriginal}
          atual={square.ordemAtual}
          compact
        />
      </div>

      {/* No celular a grade 2x2 dobrava a altura do card e deixava só ~2
          praças visíveis por vez, o que inviabiliza arrastar. */}
      <div className="flex flex-wrap gap-1.5 text-[11px] sm:hidden">
        <Pill icon={<CalendarDays className="h-3 w-3" />}>
          {fmtDate(square.data)}
        </Pill>
        <Pill icon={<Package className="h-3 w-3" />}>
          {fmtInt(totals.entregas)} entregas
        </Pill>
        <Pill icon={<Scale className="h-3 w-3" />}>
          {fmtWeight(totals.peso)}
        </Pill>
        <Pill icon={<Wallet className="h-3 w-3" />}>
          {fmtCurrency(totals.valor)}
        </Pill>
      </div>

      <div className="hidden grid-cols-4 gap-2 text-xs sm:grid">
        <Stat
          icon={<CalendarDays className="h-3.5 w-3.5" />}
          label="Data"
          value={fmtDate(square.data)}
        />
        <Stat
          icon={<Package className="h-3.5 w-3.5" />}
          label="Entregas"
          value={fmtInt(totals.entregas)}
        />
        <Stat
          icon={<Scale className="h-3.5 w-3.5" />}
          label="Peso"
          value={fmtWeight(totals.peso)}
        />
        <Stat
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Valor"
          value={fmtCurrency(totals.valor)}
        />
      </div>
    </div>
  );
}

function Pill({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-1 font-medium text-foreground">
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </span>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted/60 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}