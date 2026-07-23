import { useSyncExternalStore } from "react";
import { buildInitialBatch, buildBatchFromDeliveries, drivers as seedDrivers } from "@/mocks/data";
import { supabase, hasRemote } from "@/services/supabase";
import type {
  AdminSession,
  AppNotification,
  Batch,
  Delivery,
  DeliveryIssueReason,
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

/** local = sem Supabase configurado · syncing = carregando · ready = sincronizado */
export type SyncStatus = "local" | "syncing" | "ready" | "error";
let syncStatus: SyncStatus = hasRemote ? "syncing" : "local";

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
  // localStorage primeiro: a tela pinta na hora. O remoto chega logo depois
  // e substitui — evita a demo começar com um spinner.
  state = load();
  hydrated = true;
  void bootstrapRemote();
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

/**
 * Enquanto for "syncing" as telas devem mostrar carregando em vez de
 * "não encontrado" — senão o motorista abre o link e vê um erro que some.
 */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    subscribe,
    () => syncStatus,
    () => "syncing" as SyncStatus,
  );
}

// --- sincronização com Supabase -------------------------------------------

function batchRow(b: Batch) {
  return {
    id: b.id,
    route_code: b.routeCode,
    access_code: b.accessCode,
    status: b.status,
    payload: b as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };
}

async function pullRemote(): Promise<State | null> {
  if (!supabase) return null;
  const [b, d, n] = await Promise.all([
    supabase.from("batches").select("payload, updated_at").order("updated_at", { ascending: false }),
    supabase.from("drivers").select("id, nome, telefone").order("created_at"),
    supabase
      .from("notifications")
      .select("id, kind, batch_id, title, description, read, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (b.error) throw b.error;
  if (d.error) throw d.error;
  if (n.error) throw n.error;

  return {
    batches: (b.data ?? []).map((r) => r.payload as unknown as Batch),
    drivers: (d.data ?? []) as Driver[],
    notifications: (n.data ?? []).map((r) => ({
      id: r.id as string,
      kind: r.kind as NotificationKind,
      batchId: (r.batch_id as string | null) ?? undefined,
      title: r.title as string,
      description: (r.description as string | null) ?? undefined,
      timestamp: r.created_at as string,
      read: r.read as boolean,
    })),
  };
}

async function pushRemote(s: State) {
  if (!supabase) return;
  const ops = [
    supabase.from("batches").upsert(s.batches.map(batchRow)),
    supabase.from("drivers").upsert(
      s.drivers.map((d) => ({ id: d.id, nome: d.nome, telefone: d.telefone })),
    ),
  ];
  if (s.notifications.length > 0) {
    ops.push(
      supabase.from("notifications").upsert(
        s.notifications.map((n) => ({
          id: n.id,
          kind: n.kind,
          batch_id: n.batchId ?? null,
          title: n.title,
          description: n.description ?? null,
          read: n.read,
          created_at: n.timestamp,
        })),
      ),
    );
  }
  const results = await Promise.all(ops);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

let lastLocalWrite = 0;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePush() {
  if (!supabase) return;
  lastLocalWrite = Date.now();
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushRemote(state)
      .then(() => {
        lastLocalWrite = Date.now();
      })
      .catch((e) => console.error("[master-rotas] falha ao salvar:", e));
  }, 300);
}

async function bootstrapRemote() {
  if (!supabase) {
    syncStatus = "local";
    return;
  }
  try {
    const remote = await pullRemote();
    if (!remote) return;
    // Só semeia se o banco estiver realmente virgem. Sem esta checagem,
    // apagar todos os lotes faria o seed local ressuscitá-los no próximo boot.
    const virgem = remote.batches.length === 0 && remote.drivers.length === 0;
    if (virgem) {
      await pushRemote(state);
    } else {
      state = remote;
      persist();
    }
    syncStatus = "ready";
    watchRemote();
  } catch (e) {
    console.error("[master-rotas] falha ao sincronizar:", e);
    syncStatus = "error";
  }
  emit();
}

let watching = false;

function watchRemote() {
  if (!supabase || watching) return;
  watching = true;
  const onChange = () => {
    // Ignora o eco da própria escrita e não atropela uma edição em curso.
    if (Date.now() - lastLocalWrite < 2500) return;
    void pullRemote()
      .then((remote) => {
        if (!remote) return;
        state = remote;
        persist();
        emit();
      })
      .catch((e) => console.error("[master-rotas] falha ao atualizar:", e));
  };

  supabase
    .channel("master-rotas")
    .on("postgres_changes", { event: "*", schema: "public", table: "batches" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, onChange)
    .subscribe();
}

function update(mut: (s: State) => void) {
  ensureHydrated();
  mut(state);
  state = {
    ...state,
    batches: state.batches.map((b) => ({
      ...b,
      squares: b.squares.map((sq) => ({ ...sq })),
      deliveries: b.deliveries.map((d) => ({ ...d })),
      changes: [...b.changes],
    })),
    drivers: [...state.drivers],
    notifications: [...state.notifications],
  };
  persist();
  schedulePush();
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

function deliveryOriginalPositions(batch: Batch, deliveryIds: string[]) {
  const byOriginalOrder = [...deliveryIds].sort((a, z) => {
    const da = batch.deliveries.find((d) => d.id === a);
    const dz = batch.deliveries.find((d) => d.id === z);
    return (da?.ordemOriginal ?? 0) - (dz?.ordemOriginal ?? 0);
  });
  return new Map(byOriginalOrder.map((id, index) => [id, index + 1]));
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
  /** Zera local E remoto — senão o realtime traria os lotes antigos de volta. */
  async reset() {
    if (supabase) {
      await Promise.all([
        supabase.from("batches").delete().neq("id", ""),
        supabase.from("notifications").delete().neq("id", ""),
      ]).catch((e) => console.error("[master-rotas] falha ao resetar:", e));
    }
    update((s) => {
      Object.assign(s, initialState());
    });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      window.localStorage.removeItem(DRIVER_SESSION_KEY);
    }
  },
  /**
   * `input` vem da planilha real do Fusion. Sem ele, cai no lote mockado —
   * o caminho antigo continua servindo de plano B se a leitura falhar.
   */
  createBatchFromImport(input?: {
    deliveries: Delivery[];
    carga: number;
  }): Batch {
    let created: Batch | null = null;
    update((s) => {
      const base = buildInitialBatch();
      const seq = s.batches.length + 1;
      const day = new Date().toISOString().slice(0, 10);
      const imported = input
        ? buildBatchFromDeliveries(input.deliveries)
        : null;
      const carga = input?.carga || 28860 + seq * 7;
      const nb: Batch = {
        ...base,
        ...(imported
          ? { squares: imported.squares, deliveries: imported.deliveries }
          : {}),
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
      // O upsert não remove linhas: a exclusão precisa ir explícita ao banco.
      void supabase
        ?.from("batches")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("[master-rotas] falha ao excluir:", error);
        });
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
          const novaPosicao = i + 1;
          // Compara sempre contra a ordem ORIGINAL do Fusion, nunca contra a
          // posição atual: senão mover uma praça e devolvê-la ao lugar deixa
          // um change com ordemOriginal === ordemNova, que trava a confirmação.
          const previous = b.changes.find(
            (c) => c.tipo === "praca" && c.targetId === id,
          );
          b.changes = b.changes.filter(
            (c) => !(c.tipo === "praca" && c.targetId === id),
          );
          if (novaPosicao !== sq.ordemOriginal) {
            b.changes.push({
              id: previous?.id ?? `chg-${Date.now()}-${id}`,
              tipo: "praca",
              targetId: id,
              ordemOriginal: sq.ordemOriginal,
              ordemNova: novaPosicao,
              motivo: previous?.motivo,
              observacao: previous?.observacao,
              timestamp: new Date().toISOString(),
            });
          }
          return { ...sq, ordemAtual: novaPosicao };
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
      const originalPositions = deliveryOriginalPositions(b, sq.deliveryIds);
      sq.deliveryIds = newOrder;
      newOrder.forEach((did, idx) => {
        const del = b.deliveries.find((d) => d.id === did);
        if (!del) return;
        const posInSquare = idx + 1;
        const originalPosition = originalPositions.get(did) ?? posInSquare;
        del.ordemAtual = posInSquare;
        const changed = posInSquare !== originalPosition;
        // Preserva ocorrência/justificativa já registradas: reordenar não pode
        // apagar silenciosamente um problema relatado pelo motorista.
        const previous = b.changes.find(
          (c) => c.tipo === "entrega" && c.targetId === did,
        );
        b.changes = b.changes.filter(
          (c) => !(c.tipo === "entrega" && c.targetId === did),
        );
        if (changed || previous?.ocorrencia) {
          b.changes.push({
            id: previous?.id ?? `chg-${Date.now()}-${did}`,
            tipo: "entrega",
            targetId: did,
            ordemOriginal: originalPosition,
            ordemNova: posInSquare,
            motivo: previous?.motivo,
            ocorrencia: previous?.ocorrencia,
            observacao: previous?.observacao,
            timestamp: new Date().toISOString(),
          });
        }
      });
      if (b.status === "disponivel") b.status = "em_edicao";
    });
  },
  resetDeliveriesOrder(batchId: string, squareId: string) {
    update((s) => {
      const b = s.batches.find((x) => x.id === batchId);
      if (!b) return;
      if (b.status === "confirmado" || b.status === "arquivo_gerado") return;
      const sq = b.squares.find((x) => x.id === squareId);
      if (!sq) return;
      sq.deliveryIds = [...sq.deliveryIds].sort((a, z) => {
        const da = b.deliveries.find((d) => d.id === a)!;
        const dz = b.deliveries.find((d) => d.id === z)!;
        return da.ordemOriginal - dz.ordemOriginal;
      });
      sq.deliveryIds.forEach((did, idx) => {
        const del = b.deliveries.find((d) => d.id === did);
        if (del) del.ordemAtual = idx + 1;
      });
      // Restaurar a ordem não apaga ocorrências — elas descrevem um problema
      // real da entrega, não uma preferência de sequência.
      b.changes = b.changes.flatMap((c) => {
        if (c.tipo !== "entrega" || !sq.deliveryIds.includes(c.targetId))
          return [c];
        if (!c.ocorrencia) return [];
        const pos = sq.deliveryIds.indexOf(c.targetId) + 1;
        return [{ ...c, ordemOriginal: pos, ordemNova: pos, motivo: undefined }];
      });
    });
  },
  setDeliveryIssue(
    batchId: string,
    deliveryId: string,
    reason: DeliveryIssueReason | null,
  ) {
    update((s) => {
      const b = s.batches.find((x) => x.id === batchId);
      if (!b) return;
      if (b.status === "confirmado" || b.status === "arquivo_gerado") return;
      const sq = b.squares.find((x) => x.deliveryIds.includes(deliveryId));
      if (!sq) return;
      const currentPosition = sq.deliveryIds.indexOf(deliveryId) + 1;
      const originalPositions = deliveryOriginalPositions(b, sq.deliveryIds);
      const originalPosition =
        originalPositions.get(deliveryId) ?? currentPosition;
      const existing = b.changes.find(
        (c) => c.tipo === "entrega" && c.targetId === deliveryId,
      );

      // Ocorrência é um campo próprio: "Endereço errado" é um problema relatado,
      // não uma justificativa de reordenação. Misturar os dois fazia a tela de
      // resumo exibir a ocorrência como se justificasse uma troca de ordem.
      if (!reason) {
        if (existing) {
          existing.ocorrencia = undefined;
          // Sem ocorrência e sem reordenação, o registro deixa de existir.
          if (existing.ordemOriginal === existing.ordemNova) {
            b.changes = b.changes.filter((c) => c.id !== existing.id);
          }
        }
        return;
      }

      if (existing) {
        existing.ordemOriginal = originalPosition;
        existing.ordemNova = currentPosition;
        existing.ocorrencia = reason;
        existing.timestamp = new Date().toISOString();
        return;
      }

      b.changes.push({
        id: `chg-${Date.now()}-${deliveryId}`,
        tipo: "entrega",
        targetId: deliveryId,
        ordemOriginal: originalPosition,
        ordemNova: currentPosition,
        ocorrencia: reason,
        timestamp: new Date().toISOString(),
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
      b.squares.forEach((sq) => {
        sq.deliveryIds.forEach((did, idx) => {
          const del = b.deliveries.find((d) => d.id === did);
          if (del) del.ordemAtual = idx + 1;
        });
      });
      // Idem: preserva ocorrências, descarta apenas as reordenações.
      b.changes = b.changes.flatMap((c) => {
        if (c.tipo !== "entrega" || !c.ocorrencia) return [];
        const sq = b.squares.find((x) => x.deliveryIds.includes(c.targetId));
        const pos = sq ? sq.deliveryIds.indexOf(c.targetId) + 1 : c.ordemNova;
        return [{ ...c, ordemOriginal: pos, ordemNova: pos, motivo: undefined }];
      });
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
        // O routeCode é a chave da sessão do motorista e do link já enviado.
        // Regenerar rotaciona apenas o código de acesso: invalida o acesso
        // antigo sem derrubar quem está com o link certo.
        if (!b.accessGeneratedAt) {
          b.routeCode = uniqueRouteCode(
            s.batches.filter((x) => x.id !== batchId),
          );
        }
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
