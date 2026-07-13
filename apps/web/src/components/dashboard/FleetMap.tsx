'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { formatDistanceToNow } from 'date-fns';
import 'leaflet/dist/leaflet.css';

// Leaflet's default marker icons resolve their image URLs relative to the CSS,
// which breaks under Next.js bundling (the images 404 and markers vanish).
// Point the defaults at the CDN-hosted assets so any default Marker renders.
// The fleet pins below use divIcons and don't rely on this, but keeping it
// here means a plain <Marker> added later still shows up.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export type PinColor = 'green' | 'orange' | 'red';

export interface FleetPin {
  boyId: string;
  name: string;
  lat: number;
  lng: number;
  lastSeen: string;
  currentStop: string | null;
  remaining: number;
  color: PinColor;
}

/** Centre of India — the initial view before any boy has reported in. */
const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const INITIAL_ZOOM = 5;

const PIN_HEX: Record<PinColor, string> = {
  green: '#16a34a',
  orange: '#ea580c',
  red: '#dc2626',
};

/** A coloured teardrop marker built with divIcon (no external image assets). */
function makeIcon(color: PinColor): L.DivIcon {
  return L.divIcon({
    className: 'fleet-pin',
    html: `<span style="
      display:block;width:18px;height:18px;border-radius:50% 50% 50% 0;
      background:${PIN_HEX[color]};transform:rotate(-45deg);
      border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -18],
  });
}

/**
 * Presentational Leaflet map of the live fleet. Rendered only on the client
 * (the page dynamic-imports this with `ssr: false`) so Leaflet never touches
 * `window` during SSR.
 */
export default function FleetMap({ pins }: { pins: FleetPin[] }) {
  // Memoise icons so we don't rebuild a DivIcon on every render.
  const icons = useMemo(
    () => ({
      green: makeIcon('green'),
      orange: makeIcon('orange'),
      red: makeIcon('red'),
    }),
    [],
  );

  return (
    <MapContainer
      center={INDIA_CENTER}
      zoom={INITIAL_ZOOM}
      scrollWheelZoom
      // Explicit pixel height: relying on `h-full` (height:100%) collapses the
      // map to 0px if any ancestor's height isn't resolved when Leaflet inits,
      // which makes the tiles render once and then disappear.
      style={{ height: '600px', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map((pin) => (
        <Marker
          key={pin.boyId}
          position={[pin.lat, pin.lng]}
          icon={icons[pin.color]}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{pin.name}</p>
              <p className="text-xs">
                <span className="text-muted-foreground">Current stop: </span>
                {pin.currentStop ?? '—'}
              </p>
              <p className="text-xs">
                <span className="text-muted-foreground">
                  Packages remaining:{' '}
                </span>
                {pin.remaining}
              </p>
              <p className="text-xs">
                <span className="text-muted-foreground">Last seen: </span>
                {formatDistanceToNow(new Date(pin.lastSeen), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
