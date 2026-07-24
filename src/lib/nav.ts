/**
 * Helpers para gerar links de navegação externa (Waze / Google Maps) a partir
 * de coordenadas de uma entrega. Usam esquemas universais que abrem o app
 * nativo no celular e o site em desktop.
 */
export function googleMapsNavUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function wazeNavUrl(lat: number, lng: number) {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/**
 * Rota com várias paradas no Google Maps, na ordem recebida. Sai da posição
 * atual (origin omitido), passa pelos waypoints e termina no último ponto.
 *
 * O app de consumo aceita ~9 waypoints + destino. Acima disso a URL é
 * truncada, então limitamos: o motorista relança quando conclui esse trecho
 * (a lista de pendentes recalcula). O Waze não tem equivalente multiparada.
 */
export const MAX_PARADAS_MAPA = 10;

export function googleMapsMultiStopUrl(
  coords: [number, number][],
  max = MAX_PARADAS_MAPA,
): string | null {
  const validos = coords.filter(
    ([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng),
  );
  if (validos.length === 0) return null;

  const trecho = validos.slice(0, max);
  const destino = trecho[trecho.length - 1];
  const waypoints = trecho.slice(0, -1);

  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
    destination: `${destino[0]},${destino[1]}`,
  });
  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.map(([a, b]) => `${a},${b}`).join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}