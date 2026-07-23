import { cn } from "@/lib/utils";

interface Props {
  variant?: "full" | "mark";
  className?: string;
}

export function AppLogo({ variant = "full", className }: Props) {
  const mark = (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Master Distribuidora"
      className="h-full w-full"
    >
      <circle cx="32" cy="32" r="31" fill="var(--brand-blue)" />
      <circle
        cx="32"
        cy="32"
        r="27.5"
        fill="none"
        stroke="var(--brand-lime)"
        strokeWidth="2.8"
      />
      <path
        d="M17 23c0-3 2.4-5.4 5.4-5.4H27v17.2h-4.6c-3 0-5.4-2.4-5.4-5.4V23Z"
        fill="var(--brand-lime)"
      />
      <path
        d="M29.5 15.5h7.4v22.8c0 3.1-2.5 5.6-5.6 5.6h-1.8V15.5Z"
        fill="var(--brand-lime)"
      />
      <path
        d="M39.5 20h3.9c3 0 5.4 2.4 5.4 5.4V35c0 2.8-2.1 5.1-4.8 5.4l-4.5.5V20Z"
        fill="var(--brand-lime)"
      />
      <path
        d="M29.5 42.2c7.4 3.2 13.4-7.2 22.8-3.8"
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
      <path
        d="M29.5 47c8.6 3.6 14.7-8 25-4.4"
        fill="none"
        stroke="var(--brand-lime)"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
      <path
        d="M50.6 34.7 57 41l-7.1 5.4.7-4.3-.7-3.2.7-4.2Z"
        fill="var(--brand-lime)"
      />
    </svg>
  );

  if (variant === "mark") {
    return (
      <span
        className={cn(
          "inline-flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-full",
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
      <span className="inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full">
        {mark}
      </span>
      <span className="min-w-0 leading-none">
        <span className="block text-sm font-black uppercase tracking-wide text-primary">
          Master
        </span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Rotas
        </span>
      </span>
    </span>
  );
}
