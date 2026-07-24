import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { fmtCurrency, fmtWeight } from "@/lib/format";
import { googleMapsNavUrl, wazeNavUrl } from "@/lib/nav";
import type { Delivery } from "@/types";

interface Props {
  deliveries: Delivery[];
  className?: string;
}

/**
 * Renderiza um mapa com as entregas na ordem atual, numeradas de 1..N e
 * conectadas por uma polilinha. Cada marcador abre um popup com o cliente e
 * botões para navegar via Waze / Google Maps. Este componente importa Leaflet
 * estaticamente e portanto SÓ pode ser carregado no cliente (via React.lazy
 * atrás de <ClientOnly>).
 */
export default function SquareRouteMap({ deliveries, className }: Props) {
  const points = useMemo(
    () =>
      deliveries
        .map((d, i) => ({ d, i, ll: [d.latitude, d.longitude] as [number, number] }))
        .filter(
          (p) => Number.isFinite(p.ll[0]) && Number.isFinite(p.ll[1]),
        ),
    [deliveries],
  );

  if (points.length === 0) {
    return (
      <div
        className={
          "flex h-56 items-center justify-center rounded-2xl border bg-muted/30 text-xs text-muted-foreground " +
          (className ?? "")
        }
      >
        Sem coordenadas para exibir no mapa.
      </div>
    );
  }

  const center = points[0].ll;
  const bounds = L.latLngBounds(points.map((p) => p.ll));

  return (
    <div
      className={
        "relative h-72 overflow-hidden rounded-2xl border shadow-sm sm:h-80 " +
        (className ?? "")
      }
    >
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds bounds={bounds} />
        <Polyline
          positions={points.map((p) => p.ll)}
          pathOptions={{
            color: "hsl(84 81% 44%)",
            weight: 4,
            opacity: 0.85,
          }}
        />
        {points.map(({ d, i, ll }) => (
          <Marker key={d.id} position={ll} icon={numberedIcon(i + 1)}>
            <Popup>
              <div className="min-w-[180px] space-y-1 text-xs">
                <p className="font-bold">
                  {i + 1}. {d.cliente}
                </p>
                <p className="text-muted-foreground">
                  {d.endereco} — {d.bairro}
                </p>
                <p className="text-muted-foreground">
                  {fmtWeight(d.peso)} · {fmtCurrency(d.valor)}
                </p>
                <div className="flex gap-1.5 pt-1">
                  <a
                    href={googleMapsNavUrl(d.latitude, d.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 rounded bg-primary px-2 py-1 text-center font-semibold text-primary-foreground"
                  >
                    Google Maps
                  </a>
                  <a
                    href={wazeNavUrl(d.latitude, d.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 rounded bg-foreground px-2 py-1 text-center font-semibold text-background"
                  >
                    Waze
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function FitBounds({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
    }
  }, [bounds, map]);
  return null;
}

function numberedIcon(n: number) {
  return L.divIcon({
    className: "master-route-marker",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:30px;height:30px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:hsl(84 81% 44%);
      color:#0b1f2a;
      border:2px solid #0b1f2a;
      box-shadow:0 2px 4px rgba(0,0,0,.3);
      font-weight:800;font-size:13px;font-family:system-ui,sans-serif;
    "><span style="transform:rotate(45deg)">${n}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -26],
  });
}