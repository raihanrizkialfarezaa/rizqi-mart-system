"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Search,
  X,
  CheckCircle2,
  Loader2,
  Building2,
  Crosshair,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type MapPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (data: {
    address: string;
    kecamatan: string;
    latitude: number;
    longitude: number;
  }) => void;
  initialLat?: number;
  initialLng?: number;
};

type SearchResult = { display_name: string; lat: string; lon: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_LAT = -7.4726;
const DEFAULT_LNG = 112.4381;

const PRESETS = [
  { name: "Prajurit Kulon", lat: -7.4764, lng: 112.4281 },
  { name: "Magersari",      lat: -7.4692, lng: 112.4432 },
  { name: "Kranggan",       lat: -7.4781, lng: 112.4358 },
  { name: "Sooko",          lat: -7.4912, lng: 112.4192 },
  { name: "Puri",           lat: -7.5123, lng: 112.4451 },
  { name: "Jetis",          lat: -7.4421, lng: 112.4612 },
  { name: "Gedeg",          lat: -7.4512, lng: 112.3981 },
  { name: "Mojosari",       lat: -7.5234, lng: 112.5412 },
];

// ─── Leaflet Map Component (only rendered client-side) ────────────────────────

function LeafletMap({
  lat,
  lng,
  onMarkerDrag,
}: {
  lat: number;
  lng: number;
  onMarkerDrag: (lat: number, lng: number) => void;
}) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    // Dynamic import of Leaflet (only on client)
    import("leaflet").then((L) => {
      // Fix default icon paths (Leaflet + webpack/Next.js quirk)
      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      if (!containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng], {
        icon,
        draggable: true,
        autoPan: true,
      }).addTo(map);

      marker.bindPopup(
        '<div style="font-size:11px;font-weight:700;color:#0f172a;">📍 Titik Pengiriman<br/><span style="color:#6b7280;font-weight:400">Seret marker untuk pindah lokasi</span></div>',
        { offset: [0, -35], closeButton: false }
      ).openPopup();

      // Drag end handler
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onMarkerDrag(pos.lat, pos.lng);
      });

      // Click on map moves marker
      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        map.panTo(e.latlng, { animate: true, duration: 0.3 });
        onMarkerDrag(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        initializedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only run once on mount

  // Update marker & pan map when lat/lng changes externally (preset, GPS, search)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const latlng: [number, number] = [lat, lng];
    markerRef.current.setLatLng(latlng);
    mapRef.current.panTo(latlng, { animate: true, duration: 0.5 });
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      id="leaflet-map-container"
      className="w-full h-full min-h-[300px] z-0"
    />
  );
}

// ─── Main Modal Component ─────────────────────────────────────────────────────

export default function MapPickerModal({
  isOpen,
  onClose,
  onSelectLocation,
  initialLat = DEFAULT_LAT,
  initialLng = DEFAULT_LNG,
}: MapPickerModalProps) {
  const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng });

  const [searchQuery, setSearchQuery]   = useState("");
  const [isSearching, setIsSearching]   = useState(false);
  const [isGeocoding, setIsGeocoding]   = useState(false);
  const [isGettingGPS, setIsGettingGPS] = useState(false);

  const [addressText, setAddressText]     = useState("");
  const [kecamatanText, setKecamatanText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown]   = useState(false);

  // Reset + geocode on open
  useEffect(() => {
    if (isOpen) {
      setCoords({ lat: initialLat, lng: initialLng });
      reverseGeocode(initialLat, initialLng);
      setSearchQuery("");
      setShowDropdown(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Reverse geocode ───────────────────────────────────────────────────────

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "User-Agent": "RizqiMartSystem/1.0" } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const suburb =
          addr.suburb || addr.city_district || addr.county || addr.quarter || "";
        setAddressText(data.display_name || `Titik (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        setKecamatanText(suburb || "Mojokerto");
      } else {
        setAddressText(`Titik Lokasi (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        setKecamatanText("Mojokerto");
      }
    } catch {
      setAddressText(`Titik Lokasi (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
      setKecamatanText("Mojokerto");
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // ── Called when Leaflet marker is dragged or map is clicked ──────────────

  const handleMarkerDrag = useCallback(
    (lat: number, lng: number) => {
      setCoords({ lat, lng });
      reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  // ── Search ────────────────────────────────────────────────────────────────

  const handleSearch = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowDropdown(true);
    try {
      const q = encodeURIComponent(`${searchQuery.trim()}, Mojokerto, Jawa Timur`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5`,
        { headers: { "User-Agent": "RizqiMartSystem/1.0" } }
      );
      if (res.ok) {
        const data: SearchResult[] = await res.json();
        setSearchResults(data);
        if (data.length > 0) {
          const { lat, lon } = data[0];
          const newLat = parseFloat(lat);
          const newLng = parseFloat(lon);
          setCoords({ lat: newLat, lng: newLng });
          reverseGeocode(newLat, newLng);
        }
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (r: SearchResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    setCoords({ lat, lng });
    reverseGeocode(lat, lng);
    setShowDropdown(false);
    setSearchQuery(r.display_name.split(",")[0]);
  };

  // ── GPS ───────────────────────────────────────────────────────────────────

  const handleUseGPS = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!navigator.geolocation) {
      alert("Browser tidak mendukung GPS.");
      return;
    }
    setIsGettingGPS(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: pos }) => {
        const { latitude: lat, longitude: lng } = pos;
        setCoords({ lat, lng });
        reverseGeocode(lat, lng);
        setIsGettingGPS(false);
      },
      (err) => {
        console.error("GPS error:", err);
        alert("Gagal mendapatkan lokasi GPS. Pastikan izin lokasi aktif.");
        setIsGettingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Preset quick-select ───────────────────────────────────────────────────

  const handlePreset = (e: React.MouseEvent, lat: number, lng: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCoords({ lat, lng });
    reverseGeocode(lat, lng);
  };

  // ── Confirm ───────────────────────────────────────────────────────────────

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectLocation({
      address: addressText || `Titik (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`,
      kecamatan: kecamatanText || "Mojokerto",
      latitude: coords.lat,
      longitude: coords.lng,
    });
    onClose();
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    /* Overlay — scrolls if modal is taller than viewport */
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm overflow-y-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Centering wrapper */}
      <div className="flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6">

        {/* Modal card */}
        <div
          className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/80 rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900">
                <MapPin className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Pilih Titik Alamat via Peta</h3>
                <p className="text-[11px] text-slate-500">
                  Seret pin, klik peta, atau gunakan tombol di bawah untuk memilih lokasi
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── Search + GPS + Presets ── */}
          <div className="border-b border-slate-100 bg-white px-5 py-3 space-y-2.5 relative z-20">
            {/* Search row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSearch();
                    }
                  }}
                  placeholder="Ketik nama jalan / desa / kecamatan di Mojokerto..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="button"
                disabled={isSearching || !searchQuery.trim()}
                onClick={handleSearch}
                className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Cari"}
              </button>
            </div>

            {/* Search dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute left-5 right-5 top-[56px] z-50 rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-44 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  <span>Hasil Pencarian</span>
                  <button type="button" onClick={() => setShowDropdown(false)} className="text-rose-500 hover:underline">Tutup</button>
                </div>
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectResult(r)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 text-left transition-colors"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span className="line-clamp-2">{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* GPS & Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isGettingGPS}
                onClick={handleUseGPS}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shrink-0"
              >
                {isGettingGPS
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Crosshair className="h-3.5 w-3.5" />
                }
                Gunakan Lokasi Saya
              </button>
              <div className="flex flex-wrap gap-1">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={(e) => handlePreset(e, p.lat, p.lng)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-slate-800 hover:bg-slate-900 hover:text-white transition-all"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Leaflet Map Canvas — fixed 200px ── */}
          <div className="relative z-10 bg-slate-200" style={{ height: "200px" }}>
            <LeafletMap
              lat={coords.lat}
              lng={coords.lng}
              onMarkerDrag={handleMarkerDrag}
            />
            {/* Coordinate badge */}
            <div className="absolute bottom-2 left-2 z-[1000] rounded-lg bg-slate-900/90 px-2.5 py-1 text-[10px] font-mono text-emerald-300 shadow pointer-events-none select-none">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </div>
            {/* Hint */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] rounded-full bg-white/90 border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-600 shadow pointer-events-none select-none whitespace-nowrap">
              Seret marker atau klik di peta untuk pindah titik
            </div>
          </div>

          {/* ── Address Details ── */}
          <div className="px-5 py-4 space-y-3 border-t border-slate-100">
            {/* Label row */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Building2 className="h-4 w-4 text-slate-500" />
                Alamat Terpilih dari Peta
              </span>
              {isGeocoding && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Memuat alamat...
                </span>
              )}
            </div>

            {/* Address textarea */}
            <textarea
              rows={2}
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="Alamat akan terisi otomatis setelah memilih titik..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:outline-none resize-none"
            />

            {/* Kecamatan row */}
            <div className="flex items-center gap-3">
              <label className="shrink-0 text-xs font-bold text-slate-600">Kecamatan:</label>
              <input
                type="text"
                value={kecamatanText}
                onChange={(e) => setKecamatanText(e.target.value)}
                placeholder="Kecamatan..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4 rounded-b-3xl bg-slate-50/50">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all flex items-center gap-2 shadow-md"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Gunakan Lokasi Ini
            </button>
          </div>

        </div>{/* end modal card */}
      </div>{/* end centering wrapper */}
    </div>/* end overlay */
  );
}
