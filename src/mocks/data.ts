import type { Batch, Delivery, Driver, Square } from "@/types";
import raw from "./deliveries.json";

const deliveries = raw as Delivery[];

const toTitle = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|\s)\S/g, (t) => t.toUpperCase())
    .replace(/\bDe\b/g, "de")
    .replace(/\bDa\b/g, "da")
    .replace(/\bDo\b/g, "do")
    .replace(/\bE\b/g, "e");

/**
 * O Fusion exporta tudo em CAIXA ALTA. Convertemos para Title Case só na
 * exibição — os dados de origem seguem intactos no arquivo.
 */
export function normalizeDeliveries(list: Delivery[]): Delivery[] {
  return list.map((d) => ({
    ...d,
    cliente: toTitle(d.cliente),
    razaoSocial: toTitle(d.razaoSocial),
    endereco: toTitle(d.endereco),
    bairro: toTitle(d.bairro),
    cidade: toTitle(d.cidade),
    praca: toTitle(d.praca),
  }));
}

// Normalize a bit for display
for (const d of deliveries) {
  d.cliente = toTitle(d.cliente);
  d.razaoSocial = toTitle(d.razaoSocial);
  d.endereco = toTitle(d.endereco);
  d.bairro = toTitle(d.bairro);
  d.cidade = toTitle(d.cidade);
  d.praca = toTitle(d.praca);
}

export const drivers: Driver[] = [
  { id: "drv-01", nome: "Carlos Ferreira", telefone: "(32) 99811-4402" },
  { id: "drv-02", nome: "Ronaldo Lima", telefone: "(32) 99733-1120" },
];

function buildSquares(items: Delivery[]): Square[] {
  const groups = new Map<string, Delivery[]>();
  for (const d of items) {
    const day = d.dataPrevistaEntrega.slice(0, 10);
    const key = `${day}__${d.praca}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }
  const ordered = Array.from(groups.entries()).sort((a, b) => {
    const [ak, av] = a;
    const [bk, bv] = b;
    if (ak.slice(0, 10) !== bk.slice(0, 10))
      return ak.slice(0, 10) < bk.slice(0, 10) ? -1 : 1;
    return (
      Math.min(...av.map((x) => x.ordemOriginal)) -
      Math.min(...bv.map((x) => x.ordemOriginal))
    );
  });
  return ordered.map(([key, list], i) => {
    const first = list[0];
    return {
      id: `sq-${i + 1}`,
      nome: first.praca,
      cidade: first.cidade,
      uf: first.uf,
      data: key.split("__")[0],
      ordemOriginal: i + 1,
      ordemAtual: i + 1,
      deliveryIds: list
        .sort((a, b) => a.ordemOriginal - b.ordemOriginal)
        .map((d) => d.id),
    };
  });
}

export function buildInitialBatch(): Batch {
  const squares = buildSquares(deliveries);
  return {
    id: "batch-2026-07-20",
    codigo: "LT-2026-07-20-001",
    carga: 28860,
    motoristaId: "drv-01",
    status: "disponivel",
    createdAt: "2026-07-18T09:15:00",
    routeCode: "RT28860",
    accessCode: "4KX9-2M",
    squares,
    deliveries: JSON.parse(JSON.stringify(deliveries)) as Delivery[],
    changes: [],
  };
}

/**
 * Monta praças + entregas a partir de uma planilha real do Fusion.
 * Mesma regra do mock: uma praça é a combinação dia + praça.
 */
export function buildBatchFromDeliveries(list: Delivery[]): {
  squares: Square[];
  deliveries: Delivery[];
} {
  const normalized = normalizeDeliveries(list);
  return {
    squares: buildSquares(normalized),
    deliveries: normalized,
  };
}

export const CHANGE_REASONS = [
  "Melhor sequência geográfica",
  "Restrição de horário do cliente",
  "Facilidade de acesso",
  "Prioridade operacional",
  "Organização da carga",
  "Condição de trânsito",
  "Outro",
] as const;