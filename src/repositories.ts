export type Place = { id: string; name: string; latitude: number; longitude: number };
export type Weather = {
  temperature: number;
  humidity: number;
  wind: number;
  code: number;
  time: string;
};
export type Air = { aqi: number; pm25: number | null; time: string };
export type Conditions = {
  weather: Weather | null;
  air: Air | null;
  weatherError?: string;
  airError?: string;
};
type Fetcher = typeof fetch;
const record = (value: unknown): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('The provider returned an unexpected response.');
  return value as Record<string, any>;
};
const number = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error('The provider returned incomplete conditions.');
  return value;
};
function timestamp(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value))
    throw new Error('The provider returned an invalid time.');
  return value + 'Z';
}
async function json(
  url: string,
  signal: AbortSignal,
  fetcher: Fetcher,
): Promise<Record<string, any>> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) controller.abort();
  else signal.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetcher(url, { signal: controller.signal });
    if (!res.ok)
      throw new Error(`The provider is unavailable (HTTP ${res.status}). Please try again.`);
    return record(await res.json());
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(
      error instanceof Error && error.name !== 'AbortError'
        ? error.message
        : 'The request timed out. Please try again.',
    );
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}
export async function searchPlaces(
  query: string,
  signal: AbortSignal,
  fetcher: Fetcher = fetch,
): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3 || q.length > 180)
    throw new Error('Enter an address or place between 3 and 180 characters.');
  const data = await json(
    'https://photon.komoot.io/api/?q=' + encodeURIComponent(q) + '&limit=5&lang=en',
    signal,
    fetcher,
  );
  if (!Array.isArray(data.features))
    throw new Error('The location provider returned an unexpected response.');
  return data.features
    .flatMap((feature: any) => {
      const [longitude, latitude] = feature?.geometry?.coordinates ?? [];
      const props = feature?.properties ?? {};
      if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180
      )
        return [];
      const street = [props.housenumber, props.street].filter(Boolean).join(' ');
      const parts = [
        props.name,
        street,
        props.city ?? props.town ?? props.village,
        props.postcode,
        props.country,
      ].filter((x): x is string => typeof x === 'string' && x.length > 0);
      return [
        {
          id: `${latitude},${longitude}`,
          latitude,
          longitude,
          name: [...new Set(parts)].join(', ') || 'Selected location',
        },
      ];
    })
    .filter((p: Place, i: number, all: Place[]) => all.findIndex((x) => x.id === p.id) === i);
}
export async function getConditions(
  place: Place,
  signal: AbortSignal,
  fetcher: Fetcher = fetch,
): Promise<Conditions> {
  const lat = number(place.latitude),
    lon = number(place.longitude);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('Invalid coordinates.');
  const coordinate = `latitude=${lat}&longitude=${lon}&timezone=GMT`;
  const [weather, air] = await Promise.allSettled([
    json(
      'https://api.open-meteo.com/v1/forecast?' +
        coordinate +
        '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&forecast_days=1',
      signal,
      fetcher,
    ).then((data) => {
      const c = record(data.current);
      return {
        temperature: number(c.temperature_2m),
        humidity: number(c.relative_humidity_2m),
        wind: number(c.wind_speed_10m),
        code: number(c.weather_code),
        time: timestamp(c.time),
      };
    }),
    json(
      'https://air-quality-api.open-meteo.com/v1/air-quality?' +
        coordinate +
        '&current=european_aqi,pm2_5&forecast_days=1',
      signal,
      fetcher,
    ).then((data) => {
      const c = record(data.current);
      const aqi = number(c.european_aqi);
      if (aqi < 0) throw new Error('Air quality is unavailable.');
      return { aqi, pm25: c.pm2_5 == null ? null : number(c.pm2_5), time: timestamp(c.time) };
    }),
  ]);
  if (signal.aborted) throw new Error('Request cancelled.');
  return {
    weather: weather.status === 'fulfilled' ? weather.value : null,
    air: air.status === 'fulfilled' ? air.value : null,
    weatherError:
      weather.status === 'rejected' ? 'Weather is unavailable. Try again shortly.' : undefined,
    airError:
      air.status === 'rejected' ? 'Air quality is unavailable. Try again shortly.' : undefined,
  };
}
export function airLabel(aqi: number) {
  return aqi <= 20
    ? 'Good'
    : aqi <= 40
      ? 'Fair'
      : aqi <= 60
        ? 'Moderate'
        : aqi <= 80
          ? 'Poor'
          : aqi <= 100
            ? 'Very poor'
            : 'Extremely poor';
}
export function weatherLabel(code: number) {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if ([45, 48].includes(code)) return 'Fog';
  if (code >= 51 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorms';
  return 'Conditions available';
}
export const demoPlace: Place = {
  id: 'demo-paris',
  name: 'Paris, France · sample location',
  latitude: 48.8566,
  longitude: 2.3522,
};
export const demoConditions: Conditions = {
  weather: { temperature: 18.4, humidity: 64, wind: 11.2, code: 2, time: '2026-11-01T14:00:00Z' },
  air: { aqi: 32, pm25: 8.2, time: '2026-11-01T14:00:00Z' },
};
