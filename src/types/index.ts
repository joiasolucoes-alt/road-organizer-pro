export type BatchStatus =
  | "importado"
  | "disponivel"
  | "em_edicao"
  | "confirmado"
  | "arquivo_gerado";

export interface Delivery {
  id: string;
  ordemOriginal: number;
  ordemAtual: number;
  dataPrevistaEntrega: string; // ISO
  tipo: string;
  status: string;
  pedido: string;
  notaFiscal: string;
  prenotaERP: string;
  cliente: string;
  razaoSocial: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  praca: string;
  divisaoCarga: number;
  carga: number;
  peso: number;
  quantidadeItens: number;
  valor: number;
  enderecoAlternativo: boolean;
  enderecoConfirmado: boolean;
  latitude: number;
  longitude: number;
  observacao: string | null;
}

export interface Square {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  data: string; // ISO date
  ordemOriginal: number;
  ordemAtual: number;
  deliveryIds: string[]; // ordered
}

export type CnhCategoria = "B" | "C" | "D" | "E" | "AB" | "AC" | "AD" | "AE";

export type VeiculoTipo =
  | "Van"
  | "VUC"
  | "Toco"
  | "Truck"
  | "Bitruck"
  | "Carreta";

export const CNH_CATEGORIAS: CnhCategoria[] = [
  "B",
  "C",
  "D",
  "E",
  "AB",
  "AC",
  "AD",
  "AE",
];

export const VEICULO_TIPOS: VeiculoTipo[] = [
  "Van",
  "VUC",
  "Toco",
  "Truck",
  "Bitruck",
  "Carreta",
];

/**
 * Só `nome` é obrigatório. `telefone` não é exigido pelo formulário, mas sem
 * ele o envio do acesso por WhatsApp fica indisponível.
 */
export interface Driver {
  id: string;
  nome: string;
  telefone: string;

  // Dados pessoais
  cpf?: string;
  rg?: string;
  dataNascimento?: string;
  email?: string;
  telefoneEmergencia?: string;

  // Habilitação
  cnhNumero?: string;
  cnhCategoria?: CnhCategoria;
  cnhValidade?: string;
  moppValidade?: string;

  /**
   * Veículo habitual. O veículo que vale para a carga é o do lote — o mesmo
   * motorista troca de caminhão, e é o veículo que define a capacidade.
   * Este campo serve só para pré-selecionar na atribuição.
   */
  veiculoPadraoId?: string;

  // Operacional
  ativo?: boolean;
  observacoes?: string;
}

export interface Vehicle {
  id: string;
  placa: string;
  tipo?: VeiculoTipo;
  modelo?: string;
  ano?: string;
  capacidadeKg?: number;
  renavam?: string;
  antt?: string;
  ativo?: boolean;
  observacoes?: string;
}

/** Rótulo curto para listas e selects: "Truck · VW Delivery · RKM8D42". */
export function vehicleLabel(v: Vehicle): string {
  return [v.tipo, v.modelo, v.placa].filter(Boolean).join(" · ");
}

/** dias restantes até a data (negativo = vencido). null se não informada. */
export function diasAteVencimento(iso?: string): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const alvo = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

export type DeliveryIssueReason =
  | "Endereço errado"
  | "Restrição de horário"
  | "Inviável de entrega";

export interface RouteChange {
  id: string;
  tipo: "praca" | "entrega";
  targetId: string;
  ordemOriginal: number;
  ordemNova: number;
  /** Justificativa da reordenação (ver CHANGE_REASONS). */
  motivo?: string;
  /** Problema relatado na entrega — independente de ter havido reordenação. */
  ocorrencia?: DeliveryIssueReason;
  observacao?: string;
  timestamp: string;
}

/** Um change só exige justificativa se a posição realmente mudou. */
export function isReorder(c: RouteChange): boolean {
  return c.ordemOriginal !== c.ordemNova;
}

/** Registro de que o motorista abriu o link da rota. */
export interface AccessLog {
  primeiroAcessoEm?: string;
  ultimoAcessoEm?: string;
  aberturas: number;
}

/** Comprovação de uma entrega concluída. */
export interface EntregaConcluida {
  /** instante da confirmação (ISO) */
  em: string;
  /** quem recebeu a mercadoria */
  recebedor?: string;
  observacao?: string;
  /**
   * Foto do comprovante, já reduzida no cliente. Guardar imagem dentro do
   * payload do lote só se sustenta na PoC — em produção vai para storage.
   */
  foto?: string;
}

/**
 * Execução da rota — o que acontece DEPOIS de confirmar a ordem.
 * Confirmar bloqueia a edição da sequência, não o acesso às entregas.
 */
export interface Execucao {
  iniciadaEm?: string;
  concluidaEm?: string;
  /** deliveryId -> comprovação */
  entregues: Record<string, EntregaConcluida>;
}

/**
 * Normaliza registros antigos, em que `entregues` guardava só o timestamp
 * como string.
 */
export function entregaInfo(
  valor: EntregaConcluida | string | undefined,
): EntregaConcluida | undefined {
  if (!valor) return undefined;
  return typeof valor === "string" ? { em: valor } : valor;
}

export interface Batch {
  id: string;
  codigo: string;
  carga: number;
  motoristaId: string;
  veiculoId?: string;
  acesso?: AccessLog;
  execucao?: Execucao;
  status: BatchStatus;
  createdAt: string;
  confirmedAt?: string;
  fileGeneratedAt?: string;
  routeCode: string; // ex: RT28860
  accessCode: string; // ex: 4KX9-2M
  accessGeneratedAt?: string;
  squares: Square[];
  deliveries: Delivery[];
  changes: RouteChange[];
}

export type NotificationKind =
  | "lote_criado"
  | "acesso_gerado"
  | "rota_confirmada"
  | "arquivo_gerado"
  | "lote_excluido";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  batchId?: string;
  title: string;
  description?: string;
  timestamp: string;
  read: boolean;
}

export interface AdminSession {
  username: string;
  loggedInAt: string;
}

export interface DriverSession {
  routeCode: string;
  loggedInAt: string;
}
