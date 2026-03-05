import { getLocalTimeZone } from "../utils/time";
import { fail, ok, type Result } from "../features/shared";

export type NearbyGym = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  distanceMeters?: number;
};

export type GeocodedGymAddress = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
] as const;
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_TIMEOUT_MS = 12000;
type OverpassElement = {
  id: number | string;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
};

const buildOverpassQuery = (lat: number, lng: number, radiusMeters: number) => `
[out:json][timeout:15];
(
  node["amenity"="gym"](around:${radiusMeters},${lat},${lng});
  way["amenity"="gym"](around:${radiusMeters},${lat},${lng});
  relation["amenity"="gym"](around:${radiusMeters},${lat},${lng});
  node["leisure"="fitness_centre"](around:${radiusMeters},${lat},${lng});
  way["leisure"="fitness_centre"](around:${radiusMeters},${lat},${lng});
  relation["leisure"="fitness_centre"](around:${radiusMeters},${lat},${lng});
  node["sport"="fitness"](around:${radiusMeters},${lat},${lng});
  way["sport"="fitness"](around:${radiusMeters},${lat},${lng});
  relation["sport"="fitness"](around:${radiusMeters},${lat},${lng});
);
out tags center 50;
`;

const getDisplayName = (tags: Record<string, string>) => {
  const candidates = [
    tags.name,
    tags["name:en"],
    tags["official_name"],
    tags["short_name"],
    tags["brand"],
    tags["operator"],
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) return value;
  }

  return null;
};

const isGenericGymName = (name: string) => name.trim().toLowerCase() === "gym";

const getDisplayAddress = (tags: Record<string, string>) => {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
  ].filter(Boolean);
  return parts.join(" ").trim() || undefined;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceMeters = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) => {
  const earthRadius = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
};

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  if (typeof AbortController === "undefined") {
    return fetch(url, init);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchOverpassElements(query: string): Promise<Result<OverpassElement[]>> {
  let lastStatus: number | null = null;

  for (const overpassUrl of OVERPASS_URLS) {
    try {
      const response = await fetchWithTimeout(
        overpassUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": `Stabilify/1.0 (${getLocalTimeZone()})`,
          },
          body: `data=${encodeURIComponent(query)}`,
        },
        OVERPASS_TIMEOUT_MS,
      );

      if (!response.ok) {
        lastStatus = response.status;
        continue;
      }

      const payload = (await response.json()) as { elements?: OverpassElement[] };
      const elements = Array.isArray(payload.elements) ? payload.elements : [];
      return ok(elements);
    } catch {
      continue;
    }
  }

  if (lastStatus !== null) {
    return fail(`Failed to load nearby gyms (${lastStatus}).`);
  }

  return fail("Failed to load nearby gyms.");
}

export async function fetchNearbyGyms({
  latitude,
  longitude,
  radiusMeters = 8000,
}: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}): Promise<Result<NearbyGym[]>> {
  try {
    const query = buildOverpassQuery(latitude, longitude, radiusMeters);
    const elementsResult = await fetchOverpassElements(query);
    if (elementsResult.error) {
      return fail(elementsResult.error);
    }
    const elements = elementsResult.data ?? [];
    const gyms: NearbyGym[] = elements
      .map((element): NearbyGym | null => {
        const tags = element.tags ?? {};
        const name = getDisplayName(tags);
        if (!name || isGenericGymName(name)) {
          return null;
        }
        const address = getDisplayAddress(tags);
        const lat = element.lat ?? element.center?.lat;
        const lng = element.lon ?? element.center?.lon;
        if (typeof lat !== "number" || typeof lng !== "number") {
          return null;
        }
        return {
          id: String(element.id),
          name,
          lat,
          lng,
          address,
          distanceMeters: getDistanceMeters(
            { latitude, longitude },
            { latitude: lat, longitude: lng }
          ),
        };
      })
      .filter((gym): gym is NearbyGym => gym !== null);

    const sorted = gyms.sort((a, b) => {
      const aDist = a.distanceMeters ?? Number.POSITIVE_INFINITY;
      const bDist = b.distanceMeters ?? Number.POSITIVE_INFINITY;
      return aDist - bDist;
    });

    return ok(sorted.slice(0, 12));
  } catch {
    return fail("Failed to load nearby gyms.");
  }
}

type NominatimResult = {
  place_id?: number | string;
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
};

export async function fetchGymAddressSuggestions({
  query,
  limit = 6,
}: {
  query: string;
  limit?: number;
}): Promise<Result<GeocodedGymAddress[]>> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 3) {
    return ok([]);
  }

  try {
    const params = new URLSearchParams({
      q: normalizedQuery,
      format: "jsonv2",
      addressdetails: "1",
      limit: String(limit),
      countrycodes: "us",
    });

    const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        "User-Agent": `Stabilify/1.0 (${getLocalTimeZone()})`,
      },
    });

    if (!response.ok) {
      return fail(`Failed to load address suggestions (${response.status}).`);
    }

    const payload = (await response.json()) as NominatimResult[];
    const rows = Array.isArray(payload) ? payload : [];
    const suggestions: GeocodedGymAddress[] = rows
      .map((row): GeocodedGymAddress | null => {
        const lat = Number(row.lat);
        const lng = Number(row.lon);
        const address = row.display_name?.trim();
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !address) {
          return null;
        }

        const fallbackName = address.split(",")[0]?.trim() || "Selected location";
        const name = row.name?.trim() || fallbackName;

        return {
          id: String(row.place_id ?? `${lat},${lng}`),
          name,
          address,
          lat,
          lng,
        };
      })
      .filter((item): item is GeocodedGymAddress => item !== null);

    return ok(suggestions.slice(0, limit));
  } catch {
    return fail("Failed to load address suggestions.");
  }
}
