// Client-side Google Places — CLASSIC surfaces only:
//   - google.maps.places.AutocompleteService.getPlacePredictions  (predictions)
//   - google.maps.places.PlacesService.getDetails                 (details)
// NOT Places API New (no PlaceAutocompleteElement, no places.googleapis.com/v1),
// per the hard CLAUDE.md / availability-blocks.md rule. Google now labels these
// surfaces "legacy"; we use them deliberately because the project key is
// provisioned for classic. The key is the public, HTTP-referrer-restricted
// browser key (NEXT_PUBLIC_GOOGLE_PLACES_API_KEY).

const KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

/* eslint-disable @typescript-eslint/no-explicit-any */
let loaderPromise: Promise<void> | null = null

export function loadPlaces(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Places is client-only'))
  if ((window as any).google?.maps?.places) return Promise.resolve()
  if (loaderPromise) return loaderPromise
  loaderPromise = new Promise<void>((resolve, reject) => {
    if (!KEY) {
      reject(new Error('Google Places is not configured.'))
      return
    }
    const existing = document.getElementById('gmaps-places') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Places.')))
      return
    }
    const s = document.createElement('script')
    s.id = 'gmaps-places'
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places`
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Google Places.'))
    document.head.appendChild(s)
  })
  return loaderPromise
}

export type Prediction = { placeId: string; description: string }

export async function getPredictions(input: string): Promise<Prediction[]> {
  if (!input.trim()) return []
  await loadPlaces()
  const g = (window as any).google
  const svc = new g.maps.places.AutocompleteService()
  return new Promise<Prediction[]>((resolve) => {
    svc.getPlacePredictions({ input }, (preds: any[] | null, status: string) => {
      if (status !== g.maps.places.PlacesServiceStatus.OK || !preds) {
        resolve([])
        return
      }
      resolve(preds.map((p) => ({ placeId: p.place_id, description: p.description })))
    })
  })
}

export type ResolvedPlace = {
  placeId: string
  display: string // city-first "City, Region, Country"
  lat: number
  lng: number
}

// City-derivation chain, mirroring the discovery contract: the FIRST segment of
// location_display must be a city, because discovery's cityLabel reads
// display.split(',')[0]. We compose display from address_components so the city
// leads regardless of the selection's granularity (street/neighbourhood/city).
const CITY_TYPES = [
  'locality',
  'postal_town',
  'administrative_area_level_2',
  'administrative_area_level_1',
]

function component(components: any[], type: string): string | null {
  const c = components.find((x) => Array.isArray(x.types) && x.types.includes(type))
  return c?.long_name ?? null
}

// Returns null when no city can be derived — the caller REJECTS the selection
// rather than saving a block that vanishes from discovery.
export async function getPlaceDetails(placeId: string): Promise<ResolvedPlace | null> {
  await loadPlaces()
  const g = (window as any).google
  const svc = new g.maps.places.PlacesService(document.createElement('div'))
  return new Promise<ResolvedPlace | null>((resolve) => {
    svc.getDetails(
      { placeId, fields: ['place_id', 'geometry', 'address_components'] },
      (place: any, status: string) => {
        if (status !== g.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
          resolve(null)
          return
        }
        const loc = place.geometry.location
        const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat
        const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng
        const components: any[] = place.address_components ?? []

        let city: string | null = null
        for (const t of CITY_TYPES) {
          city = component(components, t)
          if (city) break
        }
        if (!city) {
          resolve(null) // no resolvable city -> reject at the form
          return
        }
        const region = component(components, 'administrative_area_level_1')
        const country = component(components, 'country')
        const display = [city, region && region !== city ? region : null, country]
          .filter(Boolean)
          .join(', ')

        resolve({ placeId: place.place_id ?? placeId, display, lat, lng })
      }
    )
  })
}

export async function resolveTimezone(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`/api/timezone?lat=${lat}&lng=${lng}`)
    if (!res.ok) return null
    const json = (await res.json()) as { timeZoneId?: string }
    return json.timeZoneId ?? null
  } catch {
    return null
  }
}
