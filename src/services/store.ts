import { useSyncExternalStore } from "react";
import { buildInitialBatch, drivers as seedDrivers } from "@/mocks/data";
import type {
  AdminSession,
  AppNotification,
  Batch,
  Driver,
  DriverSession,
  NotificationKind,
} from "@/types";

const STORAGE_KEY = "master-rotas:v1";
const ADMIN_SESSION_KEY = "master-rotas:admin";
const DRIVER_SESSION_KEY = "master-rotas:driver";

interface State {
  batches: Batch[];
  drivers: Driver[];
  notifications: AppNotification[];
}

function initialState(): State {
  return {
    batches: [buildInitialBatch()],
    drivers: [...seedDrivers],
    notifications: [],
  };
}

function load(): State {
  const initial = initialState();
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>;
      return {
        batches: parsed.batches ?? initial.batches,
        drivers: parsed.drivers ?? initial.drivers,
        notifications: parsed.notifications ?? [],
      };
    }
  } catch {
    /* ignore */
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

let state: State = { batches: [], drivers: [], notifications: [] };
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

const serverSnapshot: State = { batches: [], drivers: [], notifications: [] };
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
  state = {
    ...state,
    batches: [...state.batches],
    drivers: [...state.drivers],
    notifications: [...state.notifications],
  };
  persist();
  emit();
}

function pushNotification(
  s: State,
  kind: NotificationKind,
  title: string,
  opts: { batchId?: string; description?: string } = {},
) {
  s.notifications.unshift({
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    title,
    description: opts.description,
    batchId: opts.batchId,
    timestamp: new Date().toISOString(),
    read: false,
  });
}

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

function uniqueRouteCode(existing: Batch[]) {
  const taken = new Set(existing.map((b) => b.routeCode));
  let code = randRouteCode();
  while (taken.has(code)) code = randRouteCode();
  return code;
}

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
    ensureHydrated();
    return state.drivers;
  },
  reset() {
    update((s) => {
      Object.assign(s, initialState());
    });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      window.localStorage.removeItem(DRIVER_SESSION_KEY);
    }
  },
  createBatchFromImport(): Batch {
    let created: Batch | null = null;
    update((s) => {
      const base = buildInitialBatch();
      const seq = s.batches.length + 1;
      const day = new Date().toISOString().slice(0, 10);
      const carga = 28860 + seq * 7;
      const nb: Batch = {
        ...base,
        id: `batch-${Date.now()}`,
        codigo: `LT-${day}-${String(seq).padStart(3, "0")}`,
        carga,
        status: "disponivel",
        createdAt: new Date().toISOString(),
        routeCode: uniqueRouteCode(s.batches),
        accessCode: randAccessCode(),
        accessGeneratedAt: undefined,
        confirmedAt: undefined,
        fileGeneratedAt: undefined,
        motoristaId: s.drivers[0]?.id ?? "",
      };
      s.batches.unshift(nb);
      created = nb;
      pushNotification(s, "lote_criado", `Lote ${nb.codigo} importado`, {
        batchId: nb.id,
        description: `Carga ${nb.carga} · ${nb.squares.length} praças`,
      });
    });
    return created!;
  },
  deleteBatch(id: string) {
    update((s) => {
      const b = s.batches.find((x) => x.id === id);
      if (!b) return;
      if (b.status === "confirmado" || b.status === "arquivo_gerado") return;
      s.batches = s.batches.filter((x) => x.id !== id);
      pushNotification(s, "lote_excluido", `Lote ${b.codigo} excluído`);
    });
  },
  assignDriver(batchId: string, driverId: string) {
    update((s) => {
      const b = s.batches.find((x) => x.id === batchId);
      if (!b) return;
      if (b.status === "confirmado" || b.status === "arquivo_gerado") return;
      b.motoristaId = driverId;
    });
  },
  reorderSquares(batchId: string, newOrder: string[]) {
    update((s) => {
      const b = s.batches.find((x) => x.id === batchId);
      if (!b) return;
      if (b.status === "confirmado" || b.status === "arquivo_gerado") return;
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
      if (b.status === "confirmado" || b.status === "arquivo_gerado") return;
      const sq = b.squares.find((x) => x.id === squareId);
      if (!sq) return;
      sq.deliveryIds = newOrder;
      newOrder.forEach((did, idx) => {
        const del = b.deliveries.find((d) => d.id === did);
        if (!del) return;
        const posInSquare = idx + 1;
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
  resetSquareOrder(batchId: string) {
    update((s) => {
      const b = s.batches.find((x) => x.id === batchId);
      if (!b) return;
      if (b.status === "confirmado" || b.status === "arquivo_gerado") return;
      b.squares = [...b.squares]
        .sort((a, z) => a.ordemOriginal - z.ordemOriginal)
        .map((sq) => ({ ...sq, ordemAtual: sq.ordemOriginal }));
      b.changes = b.changes.filter((c) => c.tipo !== "praca");
    });
  },
  resetAllOrders(batchId: string) {
    update((s) => {
      const b = s.batches.find((x) => x.id === batchId);
      if (!b) return;
      if (b.status === "confirmado" || b.status === "arquivo_gerado") return;
      b.squares = [...b.squares]
        .sort((a, z) => a.ordemOriginal - z.ordemOriginal)
        .map((sq) => ({
          ...sq,
          ordemAtual: sq.ordemOriginal,
          deliveryIds: [...sq.deliveryIds].sort((a, z) => {
            const da = b.deliveries.find((d) => d.id === a)!;
            const dz = b.deliveries.find((d) => d.id === z)!;
            return da.ordemOriginal - dz.ordemOriginal;
          }),
        }));
      b.deliveries.forEach((d) => (d.ordemAtual = d.ordemOriginal));
      b.changes = [];
      if (b.status === "em_edicao") b.status = "disponivel";
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
      pushNotification(s, "rota_confirmada", `Rota ${b.routeCode} confirmada`, {
        batchId: b.id,
        description: `${b.changes.length} alteração(ões) do motorista`,
      });
    });
  },
  markFileGenerated(batchId: string) {
    update((s) => {
      const b = s.batches.find((x) => x.id === batchId);
      if (!b) return;
      b.status = "arquivo_gerado";
      b.fileGeneratedAt = new Date().toISOString();
      pushNotification(s, "arquivo_gerado", `Arquivo Fusion gerado`, {
        batchId: b.id,
        description: `Rota ${b.routeCode}`,
      });
    });
  },
  addDriver(nome: string, telefone: string) {
    update((s) => {
      s.drivers.push({
        id: `drv-${Date.now()}`,
        nome: nome.trim(),
        telefone: telefone.trim(),
      });
    });
  },
  updateDriver(id: string, patch: Partial<Omit<Driver, "id">>) {
    update((s) => {
      const d = s.drivers.find((x) => x.id === id);
      if (!d) return;
      Object.assign(d, patch);
    });
  },
  deleteDriver(id: string): boolean {
    let ok = false;
    update((s) => {
      if (s.batches.some((b) => b.motoristaId === id)) return;
      s.drivers = s.drivers.filter((d) => d.id !== id);
      ok = true;
    });
    return ok;
  },
  markNotificationsRead() {
    update((s) => {
      s.notifications = s.notifications.map((n) => ({ ...n, read: true }));
    });
  },
};

export const driverAccess = {
  generate(batchId: string, opts?: { regenerate?: boolean }) {
    update((s) => {
      const b = s.batches.find((x) => x.id === batchId);
      if (!b) return;
      if (opts?.regenerate || !b.accessGeneratedAt) {
        b.routeCode = uniqueRouteCode(
          s.batches.filter((x) => x.id !== batchId),
        );
        b.accessCode = randAccessCode();
        b.accessGeneratedAt = new Date().toISOString();
        pushNotification(s, "acesso_gerado", `Acesso gerado`, {
          batchId: b.id,
          description: `Rota ${b.routeCode} · código ${b.accessCode}`,
        });
      }
    });
    return state.batches.find((x) => x.id === batchId)!;
  },
};

// --- session helpers (mocked auth) ---

export const ADMIN_CREDENTIALS = { username: "admin", password: "master" };

function readSession<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export const adminSession = {
  get(): AdminSession | null {
    return readSession<AdminSession>(ADMIN_SESSION_KEY);
  },
  login(username: string, password: string): AdminSession | null {
    if (
      username.trim().toLowerCase() !== ADMIN_CREDENTIALS.username ||
      password !== ADMIN_CREDENTIALS.password
    ) {
      return null;
    }
    const session: AdminSession = {
      username: ADMIN_CREDENTIALS.username,
      loggedInAt: new Date().toISOString(),
    };
    if (typeof window !== "undefined")
      window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    emit();
    return session;
  },
  logout() {
    if (typeof window !== "undefined")
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
    emit();
  },
};

export const driverSession = {
  get(): DriverSession | null {
    return readSession<DriverSession>(DRIVER_SESSION_KEY);
  },
  login(routeCode: string, accessCode: string): DriverSession | null {
    ensureHydrated();
    const rc = routeCode.trim().toUpperCase();
    const ac = accessCode.trim().toUpperCase();
    const batch = state.batches.find((b) => b.routeCode === rc);
    if (!batch || batch.accessCode.toUpperCase() !== ac) return null;
    const session: DriverSession = {
      routeCode: rc,
      loggedInAt: new Date().toISOString(),
    };
    if (typeof window !== "undefined")
      window.localStorage.setItem(DRIVER_SESSION_KEY, JSON.stringify(session));
    emit();
    return session;
  },
  logout() {
    if (typeof window !== "undefined")
      window.localStorage.removeItem(DRIVER_SESSION_KEY);
    emit();
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