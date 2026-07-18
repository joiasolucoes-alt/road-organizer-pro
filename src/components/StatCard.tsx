import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: "default" | "brand" | "lime";
  hint?: string;
}

export function StatCard({
  label,
  value,
  icon,
  tone = "default",
  hint,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm",
        tone === "brand" &&
          "bg-primary text-primary-foreground border-transparent",
        tone === "lime" &&
          "bg-[color:var(--brand-lime)]/25 border-[color:var(--brand-lime)]/40",
      )}
    >
      <div className="flex items-center justify-between">
        <p
          className={cn(
            "text-xs font-medium uppercase tracking-wide",
            tone === "brand"
              ? "text-primary-foreground/80"
              : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {icon && <span className="opacity-80">{icon}</span>}
      </div>
      <p className="mt-1.5 text-2xl font-bold tracking-tight">{value}</p>
      {hint && (
        <p
          className={cn(
            "mt-1 text-xs",
            tone === "brand"
              ? "text-primary-foreground/70"
              : "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}