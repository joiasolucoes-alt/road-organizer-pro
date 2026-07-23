export const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);

export const fmtWeight = (kg: number) =>
  `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(kg)} kg`;

export const fmtInt = (n: number) =>
  new Intl.NumberFormat("pt-BR").format(n);

/**
 * "2026-07-20" é interpretado pelo JS como UTC — em UTC-3 isso exibe 19/07.
 * Datas puras precisam ser construídas no fuso local; strings com hora
 * ("2026-07-20T08:12:46") já são locais por especificação.
 */
const toLocalDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(iso);
};

export const fmtDate = (iso: string) =>
  toLocalDate(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const fmtDateTime = (iso: string) => {
  const time = toLocalDate(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${fmtDate(iso)} às ${time}`;
};

export const fmtDateShort = (iso: string) =>
  toLocalDate(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });