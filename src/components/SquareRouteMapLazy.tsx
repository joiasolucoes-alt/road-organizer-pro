import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { Batch, Delivery } from "@/types";

// Leaflet só existe no browser — carregamos o componente sob React.lazy e
// atrás de <ClientOnly> para não quebrar o SSR.
const SquareRouteMap = lazy(() => import("./SquareRouteMap"));
const SquaresOverviewMap = lazy(() => import("./SquaresOverviewMap"));

interface Props {
  deliveries: Delivery[];
  className?: string;
}

export function SquareRouteMapLazy(props: Props) {
  const fallback = (
    <div className="flex h-72 items-center justify-center rounded-2xl border bg-muted/30 text-xs text-muted-foreground sm:h-80">
      Carregando mapa…
    </div>
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <SquareRouteMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}

interface OverviewProps {
  batch: Batch;
  className?: string;
}

export function SquaresOverviewMapLazy(props: OverviewProps) {
  const fallback = (
    <div className="flex h-80 items-center justify-center rounded-2xl border bg-muted/30 text-xs text-muted-foreground">
      Carregando mapa…
    </div>
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <SquaresOverviewMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}