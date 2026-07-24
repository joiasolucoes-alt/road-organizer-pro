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
import { fmtInt } from "@/lib/format";
import type { Batch } from "@/types";

interface Props {
  batch: Batch;
  className?: string;
}

/**
 * Mapa geral de uma rota: um marcador por praça (centroide das entregas)
 * numerado na ordem atual, conectados por uma polilinha. Só para o cliente.
 */
export default function SquaresOverviewMap({ batch, className }: Props) {
  const points = useMemo(() => {
    return batch.squares
      .map((sq, i) => {
        const items = sq.deliveryIds
          .map((id) => batch.deliveries.find((d) => d.id === id))
          .filter((d): d is NonNullable<typeof d> => !!d)
          .filter(
            (d) =>
              Number.isFinite(d.latitude) && Number.isFinite(d.longitude),
          );
        if (items.length === 0) return null;
        const lat =
          items.reduce((a, d) => a + d.latitude, 0) / items.length;
        const lng =
          items.reduce((a, d) => a + d.longitude, 0) / items.length;
        return {
          sq,
          index: i,
          entregas: items.length,
          ll: [lat, lng] as [number, number],
        };
      })
      .filter((p): p is NonNullable<typeof p> => !!p);
  }, [batch]);

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

  const bounds = L.latLngBounds(points.map((p) => p.ll));

  return (
    <div
      className={
        "relative h-80 overflow-hidden rounded-2xl border shadow-sm " +
        (className ?? "")
      }
    >
      <MapContainer
        center={points[0].ll}
        zoom={10}
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
            dashArray: "6 6",
          }}
        />
        {points.map((p) => (
          <Marker key={p.sq.id} position={p.ll} icon={numberedIcon(p.index + 1)}>
            <Popup>
              <div className="min-w-[160px] text-xs">
                <p className="font-bold">
                  {p.index + 1}. {p.sq.nome}
                </p>
                <p className="text-muted-foreground">
                  {p.sq.cidade}/{p.sq.uf}
                </p>
                <p className="text-muted-foreground">
                  {fmtInt(p.entregas)} entregas
                </p>
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
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [bounds, map]);
  return null;
}

function numberedIcon(n: number) {
  return L.divIcon({
    className: "master-route-marker",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:34px;height:34px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:hsl(84 81% 44%);
      color:#0b1f2a;
      border:2px solid #0b1f2a;
      box-shadow:0 2px 4px rgba(0,0,0,.3);
      font-weight:800;font-size:14px;font-family:system-ui,sans-serif;
    "><span style="transform:rotate(45deg)">${n}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -30],
  });
}