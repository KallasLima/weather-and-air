import { useEffect, useRef, useState } from 'react';
import {
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { searchPlaces, getConditions, demoPlace, demoConditions } from './src/repositories';
import type { Place, Conditions } from './src/repositories';
import { Button, WeatherCard, AirCard } from './src/components';
import { s } from './src/styles';
function WeatherApp() {
  const [live, setLive] = useState(false),
    [query, setQuery] = useState(''),
    [places, setPlaces] = useState<Place[]>([]),
    [place, setPlace] = useState<Place | null>(demoPlace),
    [conditions, setConditions] = useState<Conditions | null>(demoConditions),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [searched, setSearched] = useState(false);
  const active = useRef<AbortController | null>(null),
    generation = useRef(0);
  useEffect(() => () => active.current?.abort(), []);
  function start() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const current = ++generation.current;
    setBusy(true);
    setError('');
    return { controller, current };
  }
  function mode(value: boolean) {
    active.current?.abort();
    generation.current++;
    setLive(value);
    setBusy(false);
    setError('');
    setSearched(false);
    setPlaces([]);
    setQuery('');
    setPlace(value ? null : demoPlace);
    setConditions(value ? null : demoConditions);
  }
  async function search() {
    if (busy) return;
    const { controller, current } = start();
    setPlaces([]);
    setPlace(null);
    setConditions(null);
    setSearched(false);
    try {
      const results = await searchPlaces(query, controller.signal);
      if (current === generation.current) {
        setPlaces(results);
        setSearched(true);
      }
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  async function select(selected: Place) {
    const { controller, current } = start();
    setPlace(selected);
    setConditions(null);
    setPlaces([]);
    setSearched(false);
    try {
      const result = await getConditions(selected, controller.signal);
      if (current === generation.current) setConditions(result);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  function cancel() {
    active.current?.abort();
    generation.current++;
    setBusy(false);
    setError('Request cancelled. Search again when you’re ready.');
  }
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <Image
          source={require('./assets/sky.webp')}
          resizeMode="cover"
          style={s.skyPhoto}
          accessible={false}
          pointerEvents="none"
        />
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.container}>
            <View style={s.header}>
              <Text style={s.brand}>Weather & Air</Text>
            </View>
            <View style={s.modeRow}>
              <View style={s.modeButtons}>
                <Button label="Offline demo" secondary={live} onPress={() => mode(false)} />
                <Button label="Live search" secondary={!live} onPress={() => mode(true)} />
              </View>
              <Text style={s.modeNote}>
                {live ? 'Uses Photon and Open-Meteo.' : 'Simulated data · No network requests'}
              </Text>
            </View>
            {live ? (
              <View style={s.searchBox}>
                <Text style={s.label}>Find an address or place</Text>
                <TextInput
                  accessibilityLabel="Address or place"
                  style={s.input}
                  value={query}
                  maxLength={180}
                  onChangeText={setQuery}
                  placeholder="Try Eiffel Tower, Paris"
                  placeholderTextColor="#a5bfd2"
                  returnKeyType="search"
                  onSubmitEditing={search}
                  editable={!busy}
                />
                <View style={s.searchActions}>
                  <Text style={s.privacy}>
                    Your search is sent to Photon. Coordinates are sent to Open-Meteo. Nothing is
                    saved here.
                  </Text>
                  <Button
                    label={busy ? 'Searching…' : 'Find location'}
                    onPress={search}
                    disabled={busy}
                  />
                </View>
              </View>
            ) : null}
            {busy && (
              <View style={s.loading}>
                <ActivityIndicator color="#b8e6ef" />
                <Text style={s.muted}>{place ? 'Getting conditions…' : 'Finding places…'}</Text>
                <Button label="Cancel request" secondary onPress={cancel} />
              </View>
            )}
            {error ? (
              <View accessibilityRole="alert" style={s.errorBox}>
                <Text style={s.error}>{error}</Text>
                {place && !busy && (
                  <Button label="Retry conditions" secondary onPress={() => select(place)} />
                )}
              </View>
            ) : null}
            {places.length > 0 && (
              <View style={s.results}>
                <Text style={s.label}>Choose the matching location</Text>
                {places.map((p) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityLabel={'Select ' + p.name}
                    onPress={() => select(p)}
                    style={({ pressed }) => [s.place, pressed && { backgroundColor: '#214862' }]}
                  >
                    <Text style={s.placeName}>{p.name}</Text>
                    <Text style={s.coordinate}>
                      {p.latitude.toFixed(3)}°, {p.longitude.toFixed(3)}° →
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {searched && !places.length && !busy && (
              <Text style={s.empty}>
                No matching locations. Try a city, landmark or a fuller address.
              </Text>
            )}
            {place && !busy && (
              <View style={s.location}>
                <Text style={s.locationName}>{place.name}</Text>
                {live && (
                  <Button label="Refresh conditions" secondary onPress={() => select(place)} />
                )}
              </View>
            )}
            {conditions && !busy && (
              <View style={s.cards}>
                <WeatherCard
                  data={conditions.weather}
                  error={conditions.weatherError}
                  demo={!live}
                />
                <AirCard data={conditions.air} error={conditions.airError} demo={!live} />
              </View>
            )}
            {live && !place && !places.length && !busy && !error && !searched && (
              <View style={s.welcome}>
                <Text style={s.welcomeSymbol}>◎</Text>
                <Text style={s.welcomeTitle}>Start somewhere.</Text>
                <Text style={s.muted}>Search a place and choose the result you mean.</Text>
              </View>
            )}
            <View style={s.footer}>
              <Text style={s.footerTitle}>ABOUT THE DATA</Text>
              <Text style={s.footerText}>
                {live
                  ? 'Weather and air quality are model estimates. Source timestamps are shown in your local time.'
                  : 'The offline demo uses a fixed sample from November 1, 2026. It does not describe current conditions.'}
              </Text>
              <View style={s.links}>
                {[
                  ['Open-Meteo', 'https://open-meteo.com/'],
                  ['CAMS air quality', 'https://open-meteo.com/en/docs/air-quality-api'],
                  ['Photon / OpenStreetMap', 'https://photon.komoot.io/'],
                ].map(([label, url]) => (
                  <Pressable
                    accessibilityRole="link"
                    key={label}
                    onPress={() => Linking.openURL(url)}
                  >
                    <Text style={s.link}>{label} ↗</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <WeatherApp />
    </SafeAreaProvider>
  );
}
