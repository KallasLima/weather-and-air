import { Text, View, Pressable } from 'react-native';
import { s } from './styles';
import { airLabel, weatherLabel } from './repositories';
import type { Conditions } from './repositories';
export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        disabled && s.disabled,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: '#315c59' }]}>{label}</Text>
    </Pressable>
  );
}
const observed = (time: string) =>
  new Date(time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) +
  ' · local time';
export function WeatherCard({
  data,
  error,
  demo,
}: {
  data: Conditions['weather'];
  error?: string;
  demo: boolean;
}) {
  return (
    <View style={[s.card, s.weather]}>
      <Text style={s.eyebrow}>{demo ? 'SAMPLE WEATHER' : 'CURRENT WEATHER'}</Text>
      {data ? (
        <>
          <Text style={s.symbol} aria-hidden={true}>
            ◒
          </Text>
          <Text style={s.temperature}>
            {Math.round(data.temperature)}
            <Text style={s.unit}>°C</Text>
          </Text>
          <Text style={s.condition}>{weatherLabel(data.code)}</Text>
          <View style={s.divider} />
          <View style={s.metrics}>
            <View>
              <Text style={s.metricLabel}>HUMIDITY</Text>
              <Text style={s.metric}>{data.humidity}%</Text>
            </View>
            <View>
              <Text style={s.metricLabel}>WIND</Text>
              <Text style={s.metric}>{data.wind} km/h</Text>
            </View>
          </View>
          <Text style={s.timestamp}>{observed(data.time)}</Text>
        </>
      ) : (
        <Text accessibilityRole="alert" style={s.cardError}>
          {error}
        </Text>
      )}
    </View>
  );
}
export function AirCard({
  data,
  error,
  demo,
}: {
  data: Conditions['air'];
  error?: string;
  demo: boolean;
}) {
  return (
    <View style={[s.card, s.air]}>
      <Text style={s.eyebrow}>{demo ? 'SAMPLE AIR QUALITY' : 'AIR QUALITY MODEL'}</Text>
      {data ? (
        <>
          <Text style={s.aqi}>{Math.round(data.aqi)}</Text>
          <Text style={s.condition}>{airLabel(data.aqi)}</Text>
          <Text style={s.muted}>European Air Quality Index</Text>
          <View style={s.scale} aria-hidden={true}>
            {['#79a691', '#aec5a4', '#dec98c', '#d6a07d', '#c47c78', '#a16f84'].map((c) => (
              <View key={c} style={[s.scalePart, { backgroundColor: c }]} />
            ))}
          </View>
          <View style={s.scaleLabels}>
            <Text style={s.small}>Good</Text>
            <Text style={s.small}>Extremely poor</Text>
          </View>
          <View style={s.divider} />
          <Text style={s.metricLabel}>FINE PARTICLES · PM2.5</Text>
          <Text style={s.metric}>{data.pm25 == null ? 'Unavailable' : data.pm25 + ' µg/m³'}</Text>
          <Text style={s.timestamp}>{observed(data.time)}</Text>
        </>
      ) : (
        <Text accessibilityRole="alert" style={s.cardError}>
          {error}
        </Text>
      )}
    </View>
  );
}
