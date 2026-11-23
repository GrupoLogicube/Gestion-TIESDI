import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, Loader2, LocateFixed, MapPin, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface LocationPickerMapProps {
  locationUrl: string;
  onLocationSelect: (data: {
    lat: number;
    lng: number;
    locationUrl: string;
    suggestedAddress?: string;
  }) => void;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const DEFAULT_CENTER: [number, number] = [-0.1807, -78.4678];

const PIN_ICON = L.divIcon({
  className: 'custom-map-pin',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:#0d6efd;color:#fff;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.35);font-size:16px;"><i class="bi bi-geo-alt-fill"></i></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function buildGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export default function LocationPickerMap({
  locationUrl,
  onLocationSelect,
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const placeMarker = (lat: number, lng: number, suggestedAddress?: string) => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], {
        draggable: true,
        icon: PIN_ICON,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const nextUrl = buildGoogleMapsUrl(pos.lat, pos.lng);
        setCoords({ lat: pos.lat, lng: pos.lng });
        onLocationSelect({ lat: pos.lat, lng: pos.lng, locationUrl: nextUrl });
      });

      markerRef.current = marker;
    }

    const nextUrl = buildGoogleMapsUrl(lat, lng);
    setCoords({ lat, lng });
    onLocationSelect({ lat, lng, locationUrl: nextUrl, suggestedAddress });
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
        searchQuery.trim()
      )}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      const results = (await response.json()) as NominatimResult[];
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (item: NominatimResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    mapRef.current?.setView([lat, lng], 16);
    placeMarker(lat, lng, item.display_name);
    setSearchResults([]);
    setSearchQuery(item.display_name);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setView([latitude, longitude], 16);
        placeMarker(latitude, longitude);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="d-flex gap-2">
        <div className="input-group input-group-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSearch();
              }
            }}
            placeholder="Buscar dirección o lugar en el mapa..."
            className="form-control"
          />
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={isSearching}
            className="btn btn-outline-secondary d-inline-flex align-items-center cursor-pointer"
          >
            {isSearching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          title="Usar mi ubicación actual"
          className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 text-nowrap cursor-pointer"
        >
          {isLocating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LocateFixed className="h-3.5 w-3.5" />
          )}
          <span className="d-none d-sm-inline">Mi ubicación</span>
        </button>
      </div>

      {searchResults.length > 0 && (
        <ul className="list-group list-group-flush border rounded small max-h-36 overflow-y-auto">
          {searchResults.map((res) => (
            <li
              key={res.place_id}
              onClick={() => handleSelectResult(res)}
              className="list-group-item list-group-item-action py-1.5 px-2.5 cursor-pointer"
            >
              <i className="bi bi-geo-alt me-1.5 text-primary" />
              {res.display_name}
            </li>
          ))}
        </ul>
      )}

      <div
        ref={mapContainerRef}
        className="w-full rounded border"
        style={{ height: '220px', zIndex: 1 }}
      />

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 small">
        <span className="text-body-secondary d-inline-flex align-items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          {coords
            ? `Pin seleccionado: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (puedes arrastrarlo)`
            : 'Haz clic en el mapa para marcar la ubicación exacta del evento'}
        </span>

        {locationUrl && (
          <a
            href={locationUrl}
            target="_blank"
            rel="noreferrer"
            className="text-decoration-none fw-medium d-inline-flex align-items-center gap-1"
          >
            <span>Probar en Google Maps</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

