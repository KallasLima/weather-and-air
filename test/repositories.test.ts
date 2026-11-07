import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchPlaces, getConditions, airLabel, demoPlace } from '../src/repositories';
const signal = () => new AbortController().signal;
test('geocoding encodes address, validates results and removes duplicates', async () => {
  let url = '';
  const fetcher: typeof fetch = async (input) => {
    url = String(input);
    return Response.json({
      features: [
        {
          geometry: { coordinates: [2.3, 48.8] },
          properties: { name: 'Paris', country: 'France' },
        },
        { geometry: { coordinates: [2.3, 48.8] }, properties: { name: 'Duplicate' } },
        { geometry: { coordinates: [null, 200] } },
      ],
    });
  };
  const results = await searchPlaces('A & B / Paris', signal(), fetcher);
  assert.match(url, /A%20%26%20B%20%2F%20Paris/);
  assert.equal(results.length, 1);
  assert.equal(results[0].latitude, 48.8);
  await assert.rejects(searchPlaces('a', signal(), fetcher));
});
test('parallel providers retain usable weather when air quality fails', async () => {
  const fetcher: typeof fetch = async (url) =>
    String(url).includes('air-quality')
      ? new Response('', { status: 503 })
      : Response.json({
          current: {
            temperature_2m: 20,
            relative_humidity_2m: 65,
            wind_speed_10m: 9,
            weather_code: 2,
            time: '2026-11-01T12:00',
          },
        });
  const result = await getConditions(demoPlace, signal(), fetcher);
  assert.equal(result.weather?.temperature, 20);
  assert.equal(result.weather?.time, '2026-11-01T12:00Z');
  assert.equal(result.air, null);
  assert.ok(result.airError);
});
test('missing values and cancelled requests do not become plausible zero readings', async () => {
  const fetcher: typeof fetch = async () =>
    Response.json({ current: { european_aqi: null, temperature_2m: null } });
  const result = await getConditions(demoPlace, signal(), fetcher);
  assert.equal(result.weather, null);
  assert.equal(result.air, null);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(getConditions(demoPlace, controller.signal, fetcher), /cancelled/);
});
test('European AQI bands include exact boundaries', () => {
  assert.equal(airLabel(20), 'Good');
  assert.equal(airLabel(21), 'Fair');
  assert.equal(airLabel(40), 'Fair');
  assert.equal(airLabel(100), 'Very poor');
  assert.equal(airLabel(101), 'Extremely poor');
});
