import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { esc } from '../lib/escape.js';

// Real map (OpenStreetMap tiles via Leaflet) with the store, the delivery area and the rider.
const pin = (cls, html, size = 40, anchor = [20, 40]) => L.divIcon({ className: `map-pin ${cls}`, html, iconSize: [size, size], iconAnchor: anchor });

export default function MapView({ store, storeName, dest, rider, follow = false, label }) {
  const el = useRef(null);
  const map = useRef(null);
  const riderMarker = useRef(null);
  const accuracy = useRef(null);

  // create the map once
  useEffect(() => {
    const m = L.map(el.current, { scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    const pts = [];
    if (store) { L.marker([store.lat, store.lng], { icon: pin('pin-store', '<i class="bi bi-shop"></i>'), title: storeName }).addTo(m).bindPopup(esc(storeName || 'Store')); pts.push([store.lat, store.lng]); }
    if (dest) {
      L.marker([dest.lat, dest.lng], { icon: pin('pin-home', '<i class="bi bi-house-door-fill"></i>'), title: 'Delivery area' }).addTo(m).bindPopup('Delivery area (approximate)');
      L.circle([dest.lat, dest.lng], { radius: 700, color: '#F07824', weight: 1, fillOpacity: 0.08 }).addTo(m);
      pts.push([dest.lat, dest.lng]);
    }
    if (store && dest) L.polyline([[store.lat, store.lng], [dest.lat, dest.lng]], { color: '#202124', weight: 2, dashArray: '6 8', opacity: 0.5 }).addTo(m);
    if (rider) pts.push([rider.lat, rider.lng]);
    if (pts.length > 1) m.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
    else if (pts.length === 1) m.setView(pts[0], 14);
    else m.setView([31.5204, 74.3587], 12);
    map.current = m;
    const t = setTimeout(() => { try { m.invalidateSize(); } catch { /* removed */ } }, 60);
    return () => { clearTimeout(t); m.remove(); map.current = null; riderMarker.current = null; accuracy.current = null; };
  }, [store?.lat, store?.lng, dest?.lat, dest?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // move the rider marker whenever a new position arrives
  useEffect(() => {
    const m = map.current;
    if (!m || !rider) return;
    const ll = [rider.lat, rider.lng];
    if (!riderMarker.current) {
      riderMarker.current = L.marker(ll, { icon: pin('pin-rider', '<span class="rider-pulse"></span><i class="bi bi-bicycle"></i>', 44, [22, 22]), title: 'Rider', zIndexOffset: 1000 }).addTo(m);
      if (rider.accuracy) accuracy.current = L.circle(ll, { radius: rider.accuracy, color: '#347A54', weight: 1, fillOpacity: 0.1 }).addTo(m);
    } else {
      riderMarker.current.setLatLng(ll);
      accuracy.current?.setLatLng(ll).setRadius(rider.accuracy || 0);
    }
    if (follow || !m.getBounds().contains(ll)) m.panTo(ll);
  }, [rider?.lat, rider?.lng, rider?.accuracy, follow]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="track-map" ref={el} role="img" aria-label={label || 'Map'} data-rider={rider ? `${rider.lat},${rider.lng}` : ''} />;
}
