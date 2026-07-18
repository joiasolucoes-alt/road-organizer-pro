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

export interface Driver {
  id: string;
  nome: string;
  telefone: string;
}

export interface RouteChange {
  id: string;
  tipo: "praca" | "entrega";
  targetId: string;
  ordemOriginal: number;
  ordemNova: number;
  motivo?: string;
  observacao?: string;
  timestamp: string;
}

export interface Batch {
  id: string;
  codigo: string;
  carga: number;
  motoristaId: string;
  status: BatchStatus;
  createdAt: string;
  confirmedAt?: string;
  fileGeneratedAt?: string;
  routeCode: string; // ex: RT28860
  accessCode: string; // ex: 4KX9-2M
  squares: Square[];
  deliveries: Delivery[];
  changes: RouteChange[];
}