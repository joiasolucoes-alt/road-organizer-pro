import { useSyncExternalStore } from "react";
import { buildInitialBatch, drivers } from "@/mocks/data";
import type { Batch, Driver, RouteChange } from "@/types";

const STORAGE_KEY = "master-rotas:v0";

interface State {
  batches: Batch[];
}

function load(): State {
  if (typeof window === "undefined") return { batches: [buildInitialBatch()] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* ignore */
  }
  const initial: State = { batches: [buildInitialBatch()] };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

let state: State = { batches: [] };
let hydrated = false;
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined")
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function emit() {
  listeners.forEach((l) => l());
}

function ensureHydrated() {
  if (hydrated) return;
  if (typeof window === "undefined") return;
  state = load();
  hydrated = true;
}

function subscribe(cb: () => void) {
  ensureHydrated();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  ensureHydrated();
  return state;
}

const serverSnapshot: State = { batches: [] };
function getServerSnapshot() {
  return serverSnapshot;
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getServerSnapshot()),
  );
}

function update(mut: (s: State) => void) {
  ensureHydrated();
  mut(state);
  state = { ...state, batches: [...state.batches] };
  persist();
  emit();
}

// --- actions ---

export const store = {
  getBatches(): Batch[] {
    ensureHydrated();
    return state.batches;
  },
  getBatch(id: string): Batch | undefined {
    ensureHydrated();
    return state.batches.find((b) => b.id === id);
  },
  getBatchByRoute(code: string): Batch | undefined {
    ensureHydrated();
    return state.batches.find((b) => b.routeCode === code);
  },
  getDrivers(): Driver[] {
    return drivers;
  },
  reset() {
    update((s) => {
      s.batches = [buildInitialBatch()];
    });
  },
  createBatchFromImport() {
    update((s) => {
      const existing = s.batches[0] ?? buildInitialBatch();
      // For MVP we always keep the single mocked batch
      if (!s.batches.length) s.batches.push(existing);
    });
    return state.batches[0];
  },
  reorderSquares(batchId: string, newOrder: string[]) {
    update((s) => {
      const b = s.batches.find((x) => x.id === batchId);
      if (!b) return;
      const map = new Map(b.squares.map((sq) => [sq.id, sq]));
      const reordered = newOrder
        .map((id, i) => {
          const sq = map.get(id);
          if (!sq) return null;
          const wasChanged = sq.ordemAtual !== i + 1;
          if (wasChanged) {
            b.changes = b.changes.filter(
              (c) => !(c.tipo === "praca" && c.targetId === id),
            );
            b.changes.push({
              id: `chg-${Date.now()}-${id}`,
              tipo: "praca",
              targetId: id,
              ordemOriginal: sq.ordemOriginal,
              ordemNova: i + 1,
              timestamp: new Date().toISOString(),
            });
          }
          return { ...sq, ordemAtual: i + 1 };
        })
        .filter(Boolean) as typeof b.squares;
      b.squares = reordered;
      if (b.status === "disponivel") b.status = "em_edicao";
    });
  },
  reorderDeliveries(batchId: string, squareId: string, newOrder: string[]) {
    update((s) => {
      const b = s.batches.find((x) => x.id === batchId);
      if (!b) return;
      const sq = b.squares.find((x) => x.id === squareId);
      if (!sq) return;
      sq.deliveryIds = newOrder;
      // update ordemAtual within the batch across all deliveries in this square
      newOrder.forEach((did, idx) => {
        const del = b.deliveries.find((d) => d.id === did);
        if (!del) return;
        const posInSquare = idx + 1;
        // relative order within square; also update global based on square order
        del.ordemAtual = posInSquare;
        const changed = del.ordemAtual !== del.ordemOriginal;
        b.changes = b.changes.filter(
          (c) => !(c.tipo === "entrega" && c.targetId === did),
        );
        if (changed) {
          b.changes.push({
            id: `chg-${Date.now()}-${did}`,
            tipo: "entrega",
            targetId: did,
            ordemOriginal: del.ordemOriginal,
            ordemNova: posInSquare,
            timestamp: new Date().toISOString(),
          });
        }
      });
      if (b.status === "disponivel") b.status = "em_edicao";
    });
  },
  saveChangeReason(
    batchId: string,
    tipo: "praca" | "entrega",
    targetId: string,
    motivo: string,
    observacao?: string,
  ) {
    update((s) => {
      const b = s.batches.find((x) => x.id === batchId);
      if (!b) return;
      const chg = b.changes.find(
        (c) => c.tipo === tipo && c.targetId === targetId,
      );
      if (chg) {
        chg.motivo = motivo;
        chg.observacao = observacao;
      }
    });
  },
  confirmRoute(batchId: string) {
    update((s) => {
      const b = s.batches.find((x) => x.id === batchId);
      if (!b) return;
      b.status = "confirmado";
      b.confirmedAt = new Date().toISOString();
    });
  },
  markFileGenerated(batchId: string) {
    update((s) => {
      const b = s.batches.find((x) => x.id === batchId);
      if (!b) return;
      b.status = "arquivo_gerado";
      b.fileGeneratedAt = new Date().toISOString();
    });
  },
};

function randRouteCode() {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `RT${n}`;
}

function randAccessCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n: number) =>
    Array.from(
      { length: n },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
  return `${pick(4)}-${pick(2)}`;
}

export const driverAccess = {
  generate(batchId: string, opts?: { regenerate?: boolean }) {
    update((s) => {
      const b = s.batches.find((x) => x.id === batchId);
      if (!b) return;
      if (opts?.regenerate || !b.accessGeneratedAt) {
        // Ensure routeCode uniqueness across batches
        const taken = new Set(
          s.batches.filter((x) => x.id !== batchId).map((x) => x.routeCode),
        );
        let code = randRouteCode();
        while (taken.has(code)) code = randRouteCode();
        b.routeCode = code;
        b.accessCode = randAccessCode();
        b.accessGeneratedAt = new Date().toISOString();
      }
    });
    return state.batches.find((x) => x.id === batchId)!;
  },
};

// helpers
export function batchTotals(b: Batch) {
  const peso = b.deliveries.reduce((s, d) => s + d.peso, 0);
  const valor = b.deliveries.reduce((s, d) => s + d.valor, 0);
  const itens = b.deliveries.reduce((s, d) => s + d.quantidadeItens, 0);
  return {
    peso,
    valor,
    itens,
    entregas: b.deliveries.length,
    pracas: b.squares.length,
    dias: new Set(b.squares.map((s) => s.data)).size,
  };
}

export function squareTotals(b: Batch, squareId: string) {
  const sq = b.squares.find((s) => s.id === squareId);
  if (!sq) return { peso: 0, valor: 0, entregas: 0, itens: 0 };
  const dels = sq.deliveryIds
    .map((id) => b.deliveries.find((d) => d.id === id))
    .filter(Boolean) as import("@/types").Delivery[];
  return {
    peso: dels.reduce((s, d) => s + d.peso, 0),
    valor: dels.reduce((s, d) => s + d.valor, 0),
    itens: dels.reduce((s, d) => s + d.quantidadeItens, 0),
    entregas: dels.length,
  };
}