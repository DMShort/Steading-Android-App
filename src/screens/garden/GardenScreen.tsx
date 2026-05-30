import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { api } from "../../services/api";
import type { Bed } from "../../types";

export function GardenScreen() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadBeds(); }, []);

  async function loadBeds() {
    try {
      setBeds(await api.beds.list() as Bed[]);
    } catch {}
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadBeds();
    setRefreshing(false);
  }

  const activePlantings = beds.reduce(
    (sum, b) => sum + b.plantings.filter(p => p.status === "growing").length,
    0
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={beds}
      keyExtractor={b => b.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      ListHeaderComponent={
        <View>
          <Text style={styles.heading}>Garden</Text>
          <Text style={styles.subheading}>{beds.length} beds · {activePlantings} active plantings</Text>
        </View>
      }
      renderItem={({ item: bed }) => {
        const growing = bed.plantings.filter(p => p.status === "growing");
        return (
          <TouchableOpacity style={styles.bedCard}>
            <View style={[styles.bedColor, { backgroundColor: bed.color }]} />
            <View style={styles.bedInfo}>
              <Text style={styles.bedName}>{bed.name}</Text>
              {growing.length > 0 ? (
                <Text style={styles.bedCrops}>
                  {growing.map(p => p.crop.name).join(", ")}
                </Text>
              ) : (
                <Text style={styles.bedEmpty}>No active plantings</Text>
              )}
            </View>
            <Text style={styles.bedCount}>{growing.length} growing</Text>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No beds yet</Text>
          <Text style={styles.emptyHint}>Add beds in the web app to see them here</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafaf9" },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1c1917", marginBottom: 2 },
  subheading: { fontSize: 14, color: "#78716c", marginBottom: 16 },
  bedCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    flexDirection: "row",
    alignItems: "center",
  },
  bedColor: { width: 12, height: 12, borderRadius: 4, marginRight: 12 },
  bedInfo: { flex: 1 },
  bedName: { fontSize: 16, fontWeight: "600", color: "#1c1917" },
  bedCrops: { fontSize: 13, color: "#78716c", marginTop: 2 },
  bedEmpty: { fontSize: 13, color: "#d6d3d1", marginTop: 2 },
  bedCount: { fontSize: 12, color: "#059669", fontWeight: "600" },
  empty: { alignItems: "center", padding: 40 },
  emptyText: { color: "#a8a29e", fontSize: 15, fontWeight: "500" },
  emptyHint: { color: "#d6d3d1", fontSize: 13, marginTop: 4 },
});
