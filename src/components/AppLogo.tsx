import { cn } from "@/lib/utils";

interface Props {
  variant?: "full" | "mark";
  className?: string;
}

export function AppLogo({ variant = "full", className }: Props) {
  const mark = (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Master Distribuidora"
      className="h-full w-full"
    >
      <rect width="48" height="48" rx="10" fill="var(--brand-blue)" />
      <path
        d="M12 14h24c2.4 0 4.2 2 3.8 4.3L37 34h-5.7l2.1-12.1-8.5 12.1h-4.1l-4.2-12.2L14.5 34H9l3-17.3c.3-1.6 1.7-2.7 3.3-2.7Z"
        fill="white"
      />
      <path
        d="M34.8 35.5H41l-1.1 5.5H17.6c-3.9 0-7-1.9-8.5-5.5h6.2c1.1 1.1 2.7 1.6 4.8 1.6h14.4l.3-1.6Z"
        fill="var(--brand-lime)"
      />
    </svg>
  );

  if (variant === "mark") {
    return (
      <span
        className={cn(
          "inline-flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-[10px]",
          className,
        )}
      >
        {mark}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-2 text-left text-foreground",
        className,
      )}
    >
      <span className="inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-[10px]">
        {mark}
      </span>
      <span className="min-w-0 leading-none">
        <span className="block text-sm font-black uppercase tracking-wide text-primary">
          Master
        </span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Distribuidora
        </span>
      </span>
    </span>
  );
}
