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