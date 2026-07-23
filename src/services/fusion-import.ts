import * as XLSX from "xlsx";
import type { Delivery } from "@/types";

/**
 * Leitura do XLS exportado pelo Fusion (aba "Entregas").
 *
 * As colunas são resolvidas pelo NOME normalizado do cabeçalho, não pela
 * posição — o Fusion pode reordenar ou inserir colunas entre exportações e o
 * import continua funcionando.
 */

export interface FusionParseResult {
  deliveries: Delivery[];
  carga: number;
  sheetName: string;
  colunas: number;
  warnings: string[];
}

export class FusionParseError extends Error {}

/** Maiúsculas, sem acento, sem pontuação, espaços colapsados. */
function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[.\-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cada campo aceita mais de um rótulo, cobrindo variações do Fusion. */
const COLUMNS = {
  ordem: ["ORDEM"],
  data: ["DATA PREVISTA ENTREGA", "DATA PREVISTA", "DATA ENTREGA"],
  tipo: ["TIPO"],
  status: ["STATUS"],
  pedido: ["PEDIDO"],
  notaFiscal: ["NF", "NOTA FISCAL"],
  valor: ["VALOR"],
  prenotaERP: ["PRENOTA ERP", "PRENOTA"],
  cliente: ["CLIENTE"],
  razaoSocial: ["RAZAO SOCIAL"],
  endereco: ["ENDERECO"],
  bairro: ["BAIRRO"],
  cidade: ["CIDADE"],
  uf: ["UF"],
  praca: ["PRACA"],
  divisaoCarga: ["DIV CARGA", "DIVISAO CARGA"],
  carga: ["CARGA"],
  peso: ["PESO"],
  observacao: ["OBSERVACAO", "OBS"],
  enderecoAlternativo: ["ENDER ALTERNATIVO", "ENDERECO ALTERNATIVO"],
  enderecoConfirmado: ["END CONF", "ENDERECO CONFIRMADO"],
  latitude: ["LAT", "LATITUDE"],
  longitude: ["LONG", "LONGITUDE"],
  quantidadeItens: ["QTD ITENS", "QUANTIDADE ITENS", "QTD"],
} as const;

type ColumnKey = keyof typeof COLUMNS;

/** Colunas sem as quais a rota não se sustenta. */
const REQUIRED: ColumnKey[] = [
  "ordem",
  "data",
  "cliente",
  "praca",
  "cidade",
  "peso",
  "valor",
];

/** "R$1620.23" · "1.620,23" · 1620.23 → 1620.23 */
function parseMoney(raw: unknown): number {
  if (typeof raw === "number") return raw;
  let s = String(raw ?? "")
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .trim();
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastComma > lastDot) {
    // Formato pt-BR: ponto é milhar, vírgula é decimal.
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // Formato do export atual: ponto decimal, sem separador de milhar.
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseNumber(raw: unknown): number {
  if (typeof raw === "number") return raw;
  const n = Number(String(raw ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** "S"/"SIM"/true → true */
function parseBool(raw: unknown): boolean {
  const s = String(raw ?? "").trim().toUpperCase();
  return s === "S" || s === "SIM" || s === "TRUE" || s === "1";
}

/**
 * "20/07/2026 08:12:46" → "2026-07-20T08:12:46".
 * A ordenação por dia depende de `slice(0, 10)`, então a data PRECISA sair
 * com o ano na frente.
 */
function parseFusionDate(raw: unknown): string | null {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
      `${raw.getFullYear()}-${pad(raw.getMonth() + 1)}-${pad(raw.getDate())}` +
      `T${pad(raw.getHours())}:${pad(raw.getMinutes())}:${pad(raw.getSeconds())}`
    );
  }
  const s = String(raw ?? "").trim();
  if (!s) return null;

  const br = s.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (br) {
    const [, d, m, y, hh = "00", mm = "00", ss = "00"] = br;
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
  }
  // Já em ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.replace(" ", "T");
  return null;
}

function text(raw: unknown): string {
  return String(raw ?? "").trim();
}

export async function parseFusionFile(
  file: File,
): Promise<FusionParseResult> {
  const buffer = await file.arrayBuffer();

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "array", cellDates: false });
  } catch {
    throw new FusionParseError(
      "Não foi possível ler o arquivo. Envie o .xls ou .xlsx original do Fusion.",
    );
  }

  // Prefere a aba "Entregas"; se não existir, usa a primeira.
  const sheetName =
    wb.SheetNames.find((n) => normalizeHeader(n) === "ENTREGAS") ??
    wb.SheetNames[0];
  if (!sheetName) throw new FusionParseError("A planilha está vazia.");

  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    raw: true,
    defval: null,
  });

  // O cabeçalho nem sempre está na primeira linha (logotipo, filtros, etc.).
  const headerIndex = rows.findIndex((r) => {
    const cells = (r ?? []).map(normalizeHeader);
    return cells.includes("ORDEM") && cells.includes("PRACA");
  });
  if (headerIndex < 0) {
    throw new FusionParseError(
      'Cabeçalho não encontrado. A planilha precisa ter as colunas "ORDEM" e "PRAÇA".',
    );
  }

  const header = (rows[headerIndex] ?? []).map(normalizeHeader);
  const index = {} as Record<ColumnKey, number>;
  for (const [key, labels] of Object.entries(COLUMNS) as [
    ColumnKey,
    readonly string[],
  ][]) {
    index[key] = header.findIndex((h) => labels.includes(h));
  }

  const missing = REQUIRED.filter((k) => index[k] < 0);
  if (missing.length > 0) {
    throw new FusionParseError(
      `Colunas obrigatórias ausentes: ${missing
        .map((k) => COLUMNS[k][0])
        .join(", ")}.`,
    );
  }

  const cell = (row: unknown[], key: ColumnKey) =>
    index[key] >= 0 ? row[index[key]] : null;

  const warnings: string[] = [];
  const deliveries: Delivery[] = [];
  let ignoradas = 0;

  rows.slice(headerIndex + 1).forEach((row) => {
    if (!row || row.every((c) => c === null || c === "")) return;

    const cliente = text(cell(row, "cliente"));
    const data = parseFusionDate(cell(row, "data"));

    // Sem cliente ou sem data a linha não vira entrega — costuma ser rodapé
    // de totais do relatório.
    if (!cliente || !data) {
      ignoradas += 1;
      return;
    }

    const seq = deliveries.length + 1;
    const ordem = parseNumber(cell(row, "ordem")) || seq;

    deliveries.push({
      id: `e${String(seq).padStart(3, "0")}`,
      ordemOriginal: ordem,
      ordemAtual: ordem,
      dataPrevistaEntrega: data,
      tipo: text(cell(row, "tipo")) || "Entrega",
      status: text(cell(row, "status")),
      pedido: text(cell(row, "pedido")),
      notaFiscal: text(cell(row, "notaFiscal")),
      prenotaERP: text(cell(row, "prenotaERP")),
      cliente,
      razaoSocial: text(cell(row, "razaoSocial")) || cliente,
      endereco: text(cell(row, "endereco")),
      bairro: text(cell(row, "bairro")),
      cidade: text(cell(row, "cidade")),
      uf: text(cell(row, "uf")),
      praca: text(cell(row, "praca")) || text(cell(row, "cidade")),
      divisaoCarga: parseNumber(cell(row, "divisaoCarga")) || 1,
      carga: parseNumber(cell(row, "carga")),
      peso: parseNumber(cell(row, "peso")),
      quantidadeItens: parseNumber(cell(row, "quantidadeItens")),
      valor: parseMoney(cell(row, "valor")),
      enderecoAlternativo: parseBool(cell(row, "enderecoAlternativo")),
      enderecoConfirmado: parseBool(cell(row, "enderecoConfirmado")),
      latitude: parseNumber(cell(row, "latitude")),
      longitude: parseNumber(cell(row, "longitude")),
      observacao: text(cell(row, "observacao")) || null,
    });
  });

  if (deliveries.length === 0) {
    throw new FusionParseError(
      "Nenhuma entrega válida encontrada na planilha.",
    );
  }

  if (ignoradas > 0) {
    warnings.push(`${ignoradas} linha(s) sem cliente ou data foram ignoradas.`);
  }

  const semCoordenada = deliveries.filter(
    (d) => d.latitude === 0 || d.longitude === 0,
  ).length;
  if (semCoordenada > 0) {
    warnings.push(`${semCoordenada} entrega(s) sem coordenada geográfica.`);
  }

  const cargas = Array.from(new Set(deliveries.map((d) => d.carga))).filter(
    Boolean,
  );
  if (cargas.length > 1) {
    warnings.push(
      `A planilha contém ${cargas.length} cargas diferentes (${cargas.join(", ")}).`,
    );
  }

  return {
    deliveries,
    carga: cargas[0] ?? 0,
    sheetName,
    colunas: header.filter(Boolean).length,
    warnings,
  };
}
