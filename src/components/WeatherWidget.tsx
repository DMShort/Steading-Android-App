import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { Homestead } from "../types";

interface WeatherDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
  precipProbability: number;
  windspeed: number;
  label: string;
  icon: string;
}

interface WeatherData {
  current: { temp: number; windspeed: number; label: string; icon: string } | null;
  days: WeatherDay[];
  recommendations: string[];
  location?: string;
}

export function WeatherWidget({ homestead }: { homestead: Homestead }) {
  const { latitude, longitude } = homestead;

  const { data, isLoading } = useQuery({
    queryKey: ["weather", latitude, longitude],
    queryFn: () => api.weather.get(latitude!, longitude!) as Promise<WeatherData>,
    enabled: !!(latitude && longitude),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60 * 2,
  });

  if (!latitude || !longitude) return (
    <View style={styles.card}>
      <Text style={styles.loading}>📍 Add your location in Settings to see local weather</Text>
    </View>
  );
  if (isLoading && !data) return (
    <View style={styles.card}>
      <Text style={styles.loading}>Loading weather…</Text>
    </View>
  );
  if (!data?.current) return null;

  const { current, days, recommendations } = data;
  const today = days[0];
  const forecast = days.slice(1, 4);

  return (
    <View style={styles.card}>
      <View style={styles.main}>
        <Text style={styles.icon}>{current.icon}</Text>
        <View style={styles.currentInfo}>
          <Text style={styles.temp}>{Math.round(current.temp)}°C</Text>
          <Text style={styles.label}>{current.label}</Text>
          {homestead.location && <Text style={styles.location}>{homestead.location}</Text>}
        </View>
        {today && (
          <View style={styles.range}>
            <Text style={styles.maxTemp}>{Math.round(today.maxTemp)}°</Text>
            <Text style={styles.minTemp}>{Math.round(today.minTemp)}°</Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        <Text style={styles.detail}>💨 {Math.round(current.windspeed)} km/h</Text>
        {today && <Text style={styles.detail}>🌧️ {today.precipProbability}% rain</Text>}
      </View>

      {forecast.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastRow}>
          {forecast.map(day => (
            <View key={day.date} style={styles.forecastDay}>
              <Text style={styles.forecastDate}>
                {new Date(day.date).toLocaleDateString("en", { weekday: "short" })}
              </Text>
              <Text style={styles.forecastIcon}>{day.icon}</Text>
              <Text style={styles.forecastMax}>{Math.round(day.maxTemp)}°</Text>
              <Text style={styles.forecastMin}>{Math.round(day.minTemp)}°</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {recommendations.length > 0 && (
        <View style={styles.recs}>
          {recommendations.slice(0, 2).map((r, i) => (
            <Text key={i} style={styles.rec}>{r}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  loading: { color: "#78716c", fontSize: 13 },
  main: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  icon: { fontSize: 42, marginRight: 12 },
  currentInfo: { flex: 1 },
  temp: { fontSize: 32, fontWeight: "800", color: "#1c1917" },
  label: { fontSize: 13, color: "#4b5563", marginTop: 1 },
  location: { fontSize: 11, color: "#78716c", marginTop: 2 },
  range: { alignItems: "flex-end" },
  maxTemp: { fontSize: 16, fontWeight: "700", color: "#1c1917" },
  minTemp: { fontSize: 14, color: "#78716c" },
  details: { flexDirection: "row", gap: 16, marginBottom: 12 },
  detail: { fontSize: 13, color: "#374151" },
  forecastRow: { marginBottom: 10 },
  forecastDay: { alignItems: "center", marginRight: 16, minWidth: 44 },
  forecastDate: { fontSize: 11, color: "#6b7280", marginBottom: 4 },
  forecastIcon: { fontSize: 20, marginBottom: 4 },
  forecastMax: { fontSize: 13, fontWeight: "600", color: "#1c1917" },
  forecastMin: { fontSize: 12, color: "#78716c" },
  recs: { borderTopWidth: 1, borderTopColor: "#bfdbfe", paddingTop: 10, gap: 4 },
  rec: { fontSize: 12, color: "#374151", lineHeight: 18 },
});
